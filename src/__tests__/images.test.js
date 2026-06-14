import { generateImage, deleteImage, likeImage, unlockImage, getImages, getImageById } from '../_utils/ImagesUtils'
import axios from 'axios'

// Mock Next.js server-only APIs used by ImagesUtils
jest.mock('next/cache', () => ({ revalidateTag: jest.fn() }))
jest.mock('next/navigation', () => ({ notFound: jest.fn() }))
jest.mock('axios')
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

  // The slider sends qr_weight on a -3..+3 scale, but the backend only accepts
  // [0, 1]. generateImage must translate it, or generation 422s for any
  // non-zero slider value (the original bug).
  test('maps the -3..+3 slider qr_weight into the backend [0, 1] range', async () => {
    fetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ _id: 'img_1' }) })
    await generateImage({ ...FAKE_FORM, qr_weight: -3 }, FAKE_USER)
    const [url] = fetch.mock.calls[0]
    const sent = new URL(url).searchParams.get('qr_weight')
    expect(Number(sent)).toBe(0)
  })
})

// --------------------------------------------------------------------------
// deleteImage
// --------------------------------------------------------------------------

describe('deleteImage', () => {
  test('calls axios.delete with correct URL and auth header', async () => {
    axios.delete.mockResolvedValueOnce({})
    await deleteImage('img_123')
    const [url, config] = axios.delete.mock.calls[0]
    expect(url).toContain('/api/images/delete/img_123')
    expect(config.headers.Authorization).toBe('Bearer test-token')
  })

  test('resolves true on success', async () => {
    axios.delete.mockResolvedValueOnce({})
    await expect(deleteImage('img_123')).resolves.toBe(true)
  })

  test('rejects when axios.delete throws', async () => {
    axios.delete.mockRejectedValueOnce(new Error('Network error'))
    await expect(deleteImage('img_123')).rejects.toThrow('Network error')
  })
})

// --------------------------------------------------------------------------
// likeImage
// --------------------------------------------------------------------------

describe('likeImage', () => {
  test('calls axios.put with correct URL and auth header', async () => {
    axios.put.mockResolvedValueOnce({})
    await likeImage('img_456', 'user_1')
    const [url, , config] = axios.put.mock.calls[0]
    expect(url).toContain('/api/images/like/img_456')
    expect(config.headers.Authorization).toBe('Bearer test-token')
  })

  test('resolves true on success', async () => {
    axios.put.mockResolvedValueOnce({})
    await expect(likeImage('img_456', 'user_1')).resolves.toBe(true)
  })

  test('rejects when axios.put throws', async () => {
    axios.put.mockRejectedValueOnce(new Error('Like failed'))
    await expect(likeImage('img_456', 'user_1')).rejects.toThrow('Like failed')
  })
})

// --------------------------------------------------------------------------
// unlockImage
// --------------------------------------------------------------------------

describe('unlockImage', () => {
  test('posts to /api/unlock/:imageId with stripe_session_id param and auth header when stripeSessionId is provided', async () => {
    const fakeImage = { _id: 'img_789', image_url: 'https://s3/img.png', unlocked: true }
    axios.post.mockResolvedValueOnce({ data: fakeImage })
    await unlockImage('img_789', 'sess_abc')
    const [url, body, config] = axios.post.mock.calls[0]
    expect(url).toContain('/api/unlock/img_789')
    expect(body).toBeNull()
    expect(config.params.stripe_session_id).toBe('sess_abc')
    expect(config.headers.Authorization).toBe('Bearer test-token')
  })

  test('passes empty params object when stripeSessionId is falsy', async () => {
    const fakeImage = { _id: 'img_789', unlocked: true }
    axios.post.mockResolvedValueOnce({ data: fakeImage })
    await unlockImage('img_789', null)
    const [, , config] = axios.post.mock.calls[0]
    expect(config.params).toEqual({})
  })

  test('resolves with response.data on success', async () => {
    const fakeImage = { _id: 'img_789', image_url: 'https://s3/img.png', unlocked: true }
    axios.post.mockResolvedValueOnce({ data: fakeImage })
    const result = await unlockImage('img_789', 'sess_abc')
    expect(result).toEqual(fakeImage)
  })

  test('calls revalidateTag("images") on success', async () => {
    const { revalidateTag } = require('next/cache')
    axios.post.mockResolvedValueOnce({ data: { _id: 'img_789' } })
    await unlockImage('img_789', 'sess_abc')
    expect(revalidateTag).toHaveBeenCalledWith('images')
  })

  test('rejects when axios.post throws', async () => {
    const err = Object.assign(new Error('Request failed'), { response: { status: 403 } })
    axios.post.mockRejectedValueOnce(err)
    await expect(unlockImage('img_789', 'sess_abc')).rejects.toThrow()
  })
})

// --------------------------------------------------------------------------
// getImages
// --------------------------------------------------------------------------

describe('getImages', () => {
  test('calls fetch with forwarded query params', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([]),
    })
    await getImages({ page: 2, image_style: 'Anime' })
    const [url] = fetch.mock.calls[0]
    expect(url).toContain('page=2')
    expect(url).toContain('image_style=Anime')
  })

  test('resolves with the image array', async () => {
    const fakeImages = [{ _id: 'img1' }, { _id: 'img2' }]
    fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(fakeImages),
    })
    const result = await getImages({})
    expect(result).toEqual(fakeImages)
  })

  test('rejects when response is not ok', async () => {
    fetch.mockResolvedValueOnce({ ok: false, status: 500 })
    await expect(getImages({})).rejects.toThrow()
  })
})

// --------------------------------------------------------------------------
// getImageById
// --------------------------------------------------------------------------

describe('getImageById', () => {
  test('calls fetch with the correct image URL', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ _id: 'img_abc' }),
    })
    await getImageById('img_abc')
    const [url] = fetch.mock.calls[0]
    expect(url).toContain('/api/images/get/img_abc')
  })

  test('resolves with the image data', async () => {
    const fakeImage = { _id: 'img_abc', prompt: 'a dragon' }
    fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(fakeImage),
    })
    const result = await getImageById('img_abc')
    expect(result).toEqual(fakeImage)
  })

  test('calls notFound() when response is 404', async () => {
    const { notFound } = require('next/navigation')
    fetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: () => Promise.resolve({}),
    })
    // notFound() is called inside the catch block when status === 404
    try {
      await getImageById('missing_id')
    } catch (_) { /* expected */ }
    expect(notFound).toHaveBeenCalled()
  })
})
