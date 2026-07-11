import { generateImage, deleteImage, likeImage, unlockImage, getImages, getImageById, bookmarkImage, bookmarkHero, adminDownloadImage, getGenerationProgress } from '../_utils/ImagesUtils'
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
  process.env.NEXT_PUBLIC_BACKEND_URL = 'http://backend'
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

  // generateImage now polls to completion (POST /start, then GET /progress
  // until status is "succeeded"/"failed") instead of a single fetch, so
  // these tests queue a second mocked response for the progress poll.
  function mockSucceeds(result, jobId = 'job_1') {
    fetch
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ job_id: jobId }) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ status: 'succeeded', result }) })
  }

  test('resolves with image data on success', async () => {
    const fakeImage = { _id: 'img_123', image_url: 'https://s3.example/img.png' }
    mockSucceeds(fakeImage)

    const result = await generateImage(FAKE_FORM, FAKE_USER)
    expect(result).toEqual(fakeImage)
  })

  test('rejects with network error when fetch throws', async () => {
    fetch.mockRejectedValueOnce(new Error('Network failure'))

    await expect(generateImage(FAKE_FORM, FAKE_USER)).rejects.toThrow('Network failure')
  })

  test('does not reject for an unrelated detail field', async () => {
    mockSucceeds({ _id: 'img_456' })

    // A detail that is not exactly "Insufficient credits" must resolve, not reject
    await expect(generateImage(FAKE_FORM, FAKE_USER)).resolves.toBeDefined()
  })

  test('attaches Authorization header and omits user_id from query', async () => {
    mockSucceeds({ _id: 'img_1' })
    await generateImage(FAKE_FORM, FAKE_USER)
    const [url, opts] = fetch.mock.calls[0]
    expect(opts.headers.Authorization).toBe('Bearer test-token')
    expect(url).not.toContain('user_id=')
  })

  // qr_weight is sent to the backend as-is (rounded), on the same -2..+2
  // scale the slider exposes — no translation (QRAI-135/136).
  test('rounds qr_weight to the nearest integer before sending', async () => {
    mockSucceeds({ _id: 'img_1' })
    await generateImage({ ...FAKE_FORM, qr_weight: 1.6 }, FAKE_USER)
    const [url] = fetch.mock.calls[0]
    const sent = new URL(url).searchParams.get('qr_weight')
    expect(Number(sent)).toBe(2)
  })

  test('defaults qr_weight to 0 when the form value is missing', async () => {
    mockSucceeds({ _id: 'img_1' })
    await generateImage(FAKE_FORM, FAKE_USER)
    const [url] = fetch.mock.calls[0]
    expect(new URL(url).searchParams.get('qr_weight')).toBe('0')
  })

  test('forwards style_id and drops style_title from the query', async () => {
    mockSucceeds({ _id: 'img_1' })
    await generateImage({ ...FAKE_FORM, style_id: 'abc123', style_title: 'Anime' }, FAKE_USER)
    const [url] = fetch.mock.calls[0]
    const params = new URL(url).searchParams
    expect(params.get('style_id')).toBe('abc123')
    expect(params.has('style_title')).toBe(false)
  })

  test('does not send loras/style_modifier/style_loras/sd_model — those are DB-resolved now', async () => {
    mockSucceeds({ _id: 'img_1' })
    await generateImage({ ...FAKE_FORM, style_id: 'abc123' }, FAKE_USER)
    const [url] = fetch.mock.calls[0]
    const params = new URL(url).searchParams
    expect(params.has('loras')).toBe(false)
    expect(params.has('style_modifier')).toBe(false)
    expect(params.has('style_loras')).toBe(false)
    expect(params.has('sd_model')).toBe(false)
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
// bookmarkImage
// --------------------------------------------------------------------------

describe('bookmarkImage', () => {
  test('PUTs to /api/images/bookmark/:id with auth header', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ featured: true }),
    })
    await bookmarkImage('img_bm1')
    const [url, opts] = fetch.mock.calls[0]
    expect(url).toContain('/api/images/bookmark/img_bm1')
    expect(opts.method).toBe('PUT')
    expect(opts.headers.Authorization).toBe('Bearer test-token')
  })

  test('resolves with response JSON on success', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ featured: true }),
    })
    const result = await bookmarkImage('img_bm1')
    expect(result).toEqual({ featured: true })
  })

  test('throws when response is not ok', async () => {
    fetch.mockResolvedValueOnce({ ok: false, status: 403 })
    await expect(bookmarkImage('img_bm1')).rejects.toThrow('Failed to toggle bookmark')
  })
})

// --------------------------------------------------------------------------
// bookmarkHero
// --------------------------------------------------------------------------

describe('bookmarkHero', () => {
  test('PUTs to /api/images/hero/:id with auth header', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ is_hero: true }),
    })
    await bookmarkHero('img_hero1')
    const [url, opts] = fetch.mock.calls[0]
    expect(url).toContain('/api/images/hero/img_hero1')
    expect(opts.method).toBe('PUT')
    expect(opts.headers.Authorization).toBe('Bearer test-token')
  })

  test('resolves with response JSON on success', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ is_hero: true }),
    })
    const result = await bookmarkHero('img_hero1')
    expect(result).toEqual({ is_hero: true })
  })

  test('throws when response is not ok', async () => {
    fetch.mockResolvedValueOnce({ ok: false, status: 400 })
    await expect(bookmarkHero('img_hero1')).rejects.toThrow('Failed to toggle hero')
  })
})

// --------------------------------------------------------------------------
// adminDownloadImage
// --------------------------------------------------------------------------

describe('adminDownloadImage', () => {
  test('GETs /api/admin/download/:id with auth header', async () => {
    const fakeBlob = new Blob(['data'], { type: 'image/png' })
    fetch.mockResolvedValueOnce({
      ok: true,
      blob: () => Promise.resolve(fakeBlob),
    })
    await adminDownloadImage('img_dl1')
    const [url, opts] = fetch.mock.calls[0]
    expect(url).toContain('/api/admin/download/img_dl1')
    expect(opts.headers.Authorization).toBe('Bearer test-token')
  })

  test('resolves with a Blob on success', async () => {
    const fakeBlob = new Blob(['data'], { type: 'image/png' })
    fetch.mockResolvedValueOnce({
      ok: true,
      blob: () => Promise.resolve(fakeBlob),
    })
    const result = await adminDownloadImage('img_dl1')
    expect(result).toBeInstanceOf(Blob)
  })

  test('throws when response is not ok', async () => {
    fetch.mockResolvedValueOnce({ ok: false, status: 403 })
    await expect(adminDownloadImage('img_dl1')).rejects.toThrow('Failed to download image')
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

// --------------------------------------------------------------------------
// getGenerationProgress
//
// GenerateForm.js and IteratePanel.js poll this directly (via
// useGenerationPolling) instead of going through generateImage() — so this
// is the only place in the real generation flow where the 'images'/'user'
// cache tags can be revalidated once a job succeeds. Without it, a freshly
// generated image doesn't show up in /mycodes until the 60s fetch cache
// naturally expires.
// --------------------------------------------------------------------------

describe('getGenerationProgress', () => {
  test('revalidates images and user tags when status is succeeded', async () => {
    const { revalidateTag } = require('next/cache')
    fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ status: 'succeeded', percent: 100, result: { _id: 'img_1' } }),
    })

    await getGenerationProgress('job_1')

    expect(revalidateTag).toHaveBeenCalledWith('images')
    expect(revalidateTag).toHaveBeenCalledWith('user')
  })

  test('does not revalidate while still processing', async () => {
    const { revalidateTag } = require('next/cache')
    fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ status: 'processing', percent: 40 }),
    })

    await getGenerationProgress('job_1')

    expect(revalidateTag).not.toHaveBeenCalled()
  })

  test('does not revalidate when the job failed', async () => {
    const { revalidateTag } = require('next/cache')
    fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ status: 'failed', error: 'GenerationFailed' }),
    })

    await getGenerationProgress('job_1')

    expect(revalidateTag).not.toHaveBeenCalled()
  })
})
