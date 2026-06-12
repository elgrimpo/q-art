/**
 * @jest-environment node
 */

jest.mock('../_utils/backendAuth', () => ({
  getBackendToken: jest.fn().mockResolvedValue('test-token'),
}))
jest.mock('axios')

import axios from 'axios'
import { createCheckout } from '../_utils/paymentUtils'

beforeEach(() => {
  jest.clearAllMocks()
})

describe('createCheckout', () => {
  test('posts to /api/checkout with stripeId as query param and auth header', async () => {
    axios.post.mockResolvedValueOnce({
      data: { session_url: 'https://checkout.stripe.com/test' },
    })

    await createCheckout({ stripeId: 'price_123' })

    expect(axios.post).toHaveBeenCalledTimes(1)
    const [url, body, config] = axios.post.mock.calls[0]
    expect(url).toBe(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/checkout`)
    expect(body).toBeNull()
    expect(config.params.stripeId).toBe('price_123')
    expect(config.headers.Authorization).toBe('Bearer test-token')
  })

  test('returns the session_url from the response', async () => {
    axios.post.mockResolvedValueOnce({
      data: { session_url: 'https://checkout.stripe.com/test' },
    })

    const result = await createCheckout({ stripeId: 'price_123' })

    expect(result).toBe('https://checkout.stripe.com/test')
  })

  test('returns null when session_url is absent', async () => {
    axios.post.mockResolvedValueOnce({ data: {} })

    const result = await createCheckout({ stripeId: 'price_123' })

    expect(result).toBeNull()
  })

  test('rejects when axios.post throws', async () => {
    axios.post.mockRejectedValueOnce(new Error('Stripe unreachable'))

    await expect(
      createCheckout({ stripeId: 'price_123' })
    ).rejects.toThrow('Stripe unreachable')
  })

  test('calls getBackendToken to retrieve auth token', async () => {
    const { getBackendToken } = require('../_utils/backendAuth')
    axios.post.mockResolvedValueOnce({
      data: { session_url: 'https://checkout.stripe.com/test' },
    })

    await createCheckout({ stripeId: 'price_456' })

    expect(getBackendToken).toHaveBeenCalled()
  })
})
