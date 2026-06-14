/**
 * @jest-environment node
 */

jest.mock('../_utils/backendAuth', () => ({
  getBackendToken: jest.fn().mockResolvedValue('test-token'),
}))
jest.mock('axios')

import axios from 'axios'
import { createUnlockCheckout } from '../_utils/paymentUtils'

beforeEach(() => {
  jest.clearAllMocks()
})

describe('createUnlockCheckout', () => {
  test('posts to /api/checkout/unlock with image_id as query param and auth header', async () => {
    axios.post.mockResolvedValueOnce({
      data: { session_url: 'https://checkout.stripe.com/test' },
    })

    await createUnlockCheckout('img_123')

    expect(axios.post).toHaveBeenCalledTimes(1)
    const [url, body, config] = axios.post.mock.calls[0]
    expect(url).toBe(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/checkout/unlock`)
    expect(body).toBeNull()
    expect(config.params.image_id).toBe('img_123')
    expect(config.headers.Authorization).toBe('Bearer test-token')
  })

  test('returns the session_url from the response', async () => {
    axios.post.mockResolvedValueOnce({
      data: { session_url: 'https://checkout.stripe.com/test' },
    })

    const result = await createUnlockCheckout('img_123')

    expect(result).toBe('https://checkout.stripe.com/test')
  })

  test('returns null when session_url is absent', async () => {
    axios.post.mockResolvedValueOnce({ data: {} })

    const result = await createUnlockCheckout('img_123')

    expect(result).toBeNull()
  })

  test('rejects when axios.post throws', async () => {
    axios.post.mockRejectedValueOnce(new Error('Stripe unreachable'))

    await expect(
      createUnlockCheckout('img_123')
    ).rejects.toThrow('Stripe unreachable')
  })

  test('calls getBackendToken to retrieve auth token', async () => {
    const { getBackendToken } = require('../_utils/backendAuth')
    axios.post.mockResolvedValueOnce({
      data: { session_url: 'https://checkout.stripe.com/test' },
    })

    await createUnlockCheckout('img_456')

    expect(getBackendToken).toHaveBeenCalled()
  })
})
