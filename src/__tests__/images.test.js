import { generateImage } from '../_utils/ImagesUtils'

// Mock Next.js server-only APIs used by ImagesUtils
jest.mock('next/cache', () => ({ revalidateTag: jest.fn() }))
jest.mock('next/navigation', () => ({ notFound: jest.fn() }))
jest.mock('../_utils/backendAuth', () => ({
  getBackendToken: jest.fn().mockResolvedValue('test-token'),
}))

const FAKE_USER = { _id: 'user_123' }
const FAKE_FORM = { prompt: 'a dragon', website: 'https://example.com' }

// Replace global fetch before each test
beforeEach(() => {
  global.fetch = jest.fn()
})
afterEach(() => {
  jest.clearAllMocks()
})

// --------------------------------------------------------------------------
// generateImage — InsufficientCredits error detection
// The backend signals insufficient credits via data.detail === "Insufficient credits".
// The frontend must translate that specific string into an "InsufficientCredits"
// Error so callers can show the right UI. A typo in either side breaks this silently.
// --------------------------------------------------------------------------

describe('generateImage', () => {
  test('rejects with InsufficientCredits when backend returns that detail', async () => {
    fetch.mockResolvedValueOnce({
      json: () => Promise.resolve({ detail: 'Insufficient credits' }),
    })

    await expect(generateImage(FAKE_FORM, FAKE_USER)).rejects.toThrow('InsufficientCredits')
  })

  test('resolves with image data on success', async () => {
    const fakeImage = { _id: 'img_123', image_url: 'https://s3.example/img.png' }
    fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(fakeImage),
    })

    const result = await generateImage(FAKE_FORM, FAKE_USER)
    expect(result).toEqual(fakeImage)
  })

  test('rejects with network error when fetch throws', async () => {
    fetch.mockRejectedValueOnce(new Error('Network failure'))

    await expect(generateImage(FAKE_FORM, FAKE_USER)).rejects.toThrow('Network failure')
  })

  test('does not reject for an unrelated detail field', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ detail: 'Some other error', _id: 'img_456' }),
    })

    // A detail that is not exactly "Insufficient credits" must resolve, not reject
    await expect(generateImage(FAKE_FORM, FAKE_USER)).resolves.toBeDefined()
  })

  test('attaches Authorization header and omits user_id from query', async () => {
    fetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ _id: 'img_1' }) })
    await generateImage(FAKE_FORM, FAKE_USER)
    const [url, opts] = fetch.mock.calls[0]
    expect(opts.headers.Authorization).toBe('Bearer test-token')
    expect(url).not.toContain('user_id=')
  })
})
