import { renderHook, waitFor } from '@testing-library/react'
import { useGenerationPolling } from '../_utils/useGenerationPolling'

const mockGetGenerationProgress = jest.fn()
jest.mock('../_utils/ImagesUtils', () => ({
  getGenerationProgress: (...args) => mockGetGenerationProgress(...args),
}))

beforeEach(() => {
  mockGetGenerationProgress.mockReset()
})

test('does nothing when jobId is null', () => {
  const onSucceeded = jest.fn()
  const onFailed = jest.fn()
  const { result } = renderHook(() => useGenerationPolling(null, { onSucceeded, onFailed }))
  expect(result.current).toBe(0)
  expect(mockGetGenerationProgress).not.toHaveBeenCalled()
})

test('seeds percent from initialPercent on first render', () => {
  const { result } = renderHook(() =>
    useGenerationPolling(null, { onSucceeded: jest.fn(), onFailed: jest.fn(), initialPercent: 42 })
  )
  expect(result.current).toBe(42)
})

test('updates percent and calls onSucceeded when the job succeeds', async () => {
  mockGetGenerationProgress.mockResolvedValueOnce({ status: 'succeeded', percent: 100, result: { _id: 'img1' } })
  const onSucceeded = jest.fn()
  const onFailed = jest.fn()
  renderHook(() => useGenerationPolling('job-1', { onSucceeded, onFailed }))

  await waitFor(() => expect(onSucceeded).toHaveBeenCalledWith({ _id: 'img1' }))
  expect(onFailed).not.toHaveBeenCalled()
})

test('calls onFailed with the job error when the job fails', async () => {
  mockGetGenerationProgress.mockResolvedValueOnce({ status: 'failed', error: 'GenerationFailed' })
  const onSucceeded = jest.fn()
  const onFailed = jest.fn()
  renderHook(() => useGenerationPolling('job-2', { onSucceeded, onFailed }))

  await waitFor(() => expect(onFailed).toHaveBeenCalled())
  expect(onFailed.mock.calls[0][0].message).toBe('GenerationFailed')
})

test('calls onProgress with each polled percent', async () => {
  mockGetGenerationProgress.mockResolvedValueOnce({ status: 'succeeded', percent: 77, result: { _id: 'img1' } })
  const onProgress = jest.fn()
  renderHook(() => useGenerationPolling('job-6', { onSucceeded: jest.fn(), onFailed: jest.fn(), onProgress }))

  await waitFor(() => expect(onProgress).toHaveBeenCalledWith(77))
})

test('retries a transient poll failure before eventually succeeding', async () => {
  mockGetGenerationProgress
    .mockRejectedValueOnce(new Error('network blip'))
    .mockResolvedValueOnce({ status: 'succeeded', percent: 100, result: { _id: 'img-retry' } })
  const onSucceeded = jest.fn()
  const onFailed = jest.fn()
  renderHook(() => useGenerationPolling('job-3', { onSucceeded, onFailed }))

  await waitFor(() => expect(mockGetGenerationProgress).toHaveBeenCalledTimes(2), { timeout: 5000 })
  await waitFor(() => expect(onSucceeded).toHaveBeenCalledWith({ _id: 'img-retry' }))
}, 10000)

test('gives up after repeated poll failures exceed the retry allowance', async () => {
  mockGetGenerationProgress.mockRejectedValue(new Error('persistent failure'))
  const onSucceeded = jest.fn()
  const onFailed = jest.fn()
  renderHook(() => useGenerationPolling('job-4', { onSucceeded, onFailed }))

  await waitFor(() => expect(mockGetGenerationProgress).toHaveBeenCalledTimes(4), { timeout: 8000 })
  await waitFor(() => expect(onFailed).toHaveBeenCalled())
  expect(onSucceeded).not.toHaveBeenCalled()
}, 15000)

test('gives up after ~2 minutes without a terminal status', async () => {
  mockGetGenerationProgress.mockResolvedValue({ status: 'processing', percent: 10 })
  let now = 1000000
  const dateSpy = jest.spyOn(Date, 'now').mockImplementation(() => now)
  const onSucceeded = jest.fn()
  const onFailed = jest.fn()

  renderHook(() => useGenerationPolling('job-5', { onSucceeded, onFailed }))
  await waitFor(() => expect(mockGetGenerationProgress).toHaveBeenCalledTimes(1))

  now += 121000
  try {
    await waitFor(() => expect(onFailed).toHaveBeenCalled(), { timeout: 5000 })
  } finally {
    dateSpy.mockRestore()
  }
  expect(onSucceeded).not.toHaveBeenCalled()
}, 10000)

test('cleans up its timer on unmount (no further polling)', async () => {
  mockGetGenerationProgress.mockResolvedValue({ status: 'processing', percent: 5 })
  const { unmount } = renderHook(() => useGenerationPolling('job-7', { onSucceeded: jest.fn(), onFailed: jest.fn() }))
  await waitFor(() => expect(mockGetGenerationProgress).toHaveBeenCalledTimes(1))

  unmount()
  const callsAtUnmount = mockGetGenerationProgress.mock.calls.length
  await new Promise((resolve) => setTimeout(resolve, 1300))
  expect(mockGetGenerationProgress.mock.calls.length).toBe(callsAtUnmount)
})

test('does not call callbacks for a poll response that resolves after unmount', async () => {
  let resolveSecondPoll
  mockGetGenerationProgress
    .mockResolvedValueOnce({ status: 'processing', percent: 5 })
    .mockImplementationOnce(() => new Promise((resolve) => { resolveSecondPoll = resolve }))

  const onSucceeded = jest.fn()
  const onFailed = jest.fn()
  const { unmount } = renderHook(() => useGenerationPolling('job-8', { onSucceeded, onFailed }))

  await waitFor(() => expect(mockGetGenerationProgress).toHaveBeenCalledTimes(1))
  await new Promise((resolve) => setTimeout(resolve, 1300)) // let the second tick fire and start its request
  await waitFor(() => expect(mockGetGenerationProgress).toHaveBeenCalledTimes(2))

  unmount()
  resolveSecondPoll({ status: 'succeeded', percent: 100, result: { _id: 'too-late' } })
  await new Promise((resolve) => setTimeout(resolve, 50)) // let the resolved promise's .then run, if unguarded

  expect(onSucceeded).not.toHaveBeenCalled()
  expect(onFailed).not.toHaveBeenCalled()
}, 10000)

test('does not act on a stale response after jobId changes on a live instance', async () => {
  let resolveJobA
  mockGetGenerationProgress.mockImplementation((id) => {
    if (id === 'job-A') {
      return new Promise((resolve) => { resolveJobA = resolve })
    }
    return Promise.resolve({ status: 'processing', percent: 1 })
  })

  const onSucceeded = jest.fn()
  const onFailed = jest.fn()
  const { rerender } = renderHook(
    ({ jobId }) => useGenerationPolling(jobId, { onSucceeded, onFailed }),
    { initialProps: { jobId: 'job-A' } }
  )

  await waitFor(() => expect(mockGetGenerationProgress).toHaveBeenCalledWith('job-A'))

  rerender({ jobId: 'job-B' })
  await waitFor(() => expect(mockGetGenerationProgress).toHaveBeenCalledWith('job-B'))

  resolveJobA({ status: 'succeeded', percent: 100, result: { _id: 'stale-job-a-result' } })
  await new Promise((resolve) => setTimeout(resolve, 50))

  expect(onSucceeded).not.toHaveBeenCalled()
}, 10000)
