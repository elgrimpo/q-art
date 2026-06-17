/**
 * @jest-environment node
 */
jest.mock('../_utils/backendAuth', () => ({ getServiceToken: jest.fn() }))

import { getServiceToken } from '../_utils/backendAuth'
import { POST } from '../app/api/auth/request-code/route'

afterEach(() => jest.clearAllMocks())

test('proxies to the backend with a service token', async () => {
  getServiceToken.mockResolvedValue('svc-token')
  process.env.NEXT_PUBLIC_BACKEND_URL = 'http://backend'
  global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({}) })

  const req = { json: async () => ({ email: 'a@b.com' }) }
  const res = await POST(req)

  expect(res.status).toBe(200)
  expect(global.fetch).toHaveBeenCalledWith(
    'http://backend/api/user/request-code',
    expect.objectContaining({
      method: 'POST',
      headers: expect.objectContaining({ Authorization: 'Bearer svc-token' }),
    })
  )
})

test('rejects an invalid email without calling the backend', async () => {
  global.fetch = jest.fn()
  const req = { json: async () => ({ email: 'not-an-email' }) }
  const res = await POST(req)

  expect(res.status).toBe(400)
  expect(global.fetch).not.toHaveBeenCalled()
})

test('forwards a backend error detail and status', async () => {
  getServiceToken.mockResolvedValue('svc-token')
  process.env.NEXT_PUBLIC_BACKEND_URL = 'http://backend'
  global.fetch = jest.fn().mockResolvedValue({
    ok: false,
    status: 429,
    json: async () => ({ detail: 'ResendCooldown' }),
  })

  const req = { json: async () => ({ email: 'a@b.com' }) }
  const res = await POST(req)
  const body = await res.json()

  expect(res.status).toBe(429)
  expect(body.error).toBe('ResendCooldown')
})
