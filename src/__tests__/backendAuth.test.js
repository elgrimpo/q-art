/**
 * @jest-environment node
 */
import { jwtVerify } from 'jose'

// Mock next-auth session
jest.mock('next-auth', () => ({ getServerSession: jest.fn() }))
// authOptions import pulls in the route file; stub it
jest.mock('../app/api/auth/[...nextauth]/route', () => ({ authOptions: {} }))

import { getServerSession } from 'next-auth'
import { getBackendToken, getServiceToken } from '../_utils/backendAuth'

const SECRET = 'test-backend-secret'
const key = new TextEncoder().encode(SECRET)

beforeAll(() => {
  process.env.BACKEND_JWT_SECRET = SECRET
})
afterEach(() => jest.clearAllMocks())

test('getBackendToken mints a user-scoped token with email for logged-in user', async () => {
  getServerSession.mockResolvedValue({ user: { email: 'a@b.com', is_guest: false } })
  const token = await getBackendToken()
  const { payload } = await jwtVerify(token, key)
  expect(payload.scope).toBe('user')
  expect(payload.email).toBe('a@b.com')
  expect(payload.is_guest).toBe(false)
  expect(payload.exp).toBeGreaterThan(Math.floor(Date.now() / 1000))
})

test('getBackendToken uses guest id as sub for guests', async () => {
  getServerSession.mockResolvedValue({ user: { _id: 'guest_9', email: 'guest_9@anonymous.com', is_guest: true } })
  const token = await getBackendToken()
  const { payload } = await jwtVerify(token, key)
  expect(payload.sub).toBe('guest_9')
  expect(payload.is_guest).toBe(true)
})

test('getBackendToken returns null when no session', async () => {
  getServerSession.mockResolvedValue(null)
  expect(await getBackendToken()).toBeNull()
})

test('getServiceToken mints a service-scoped token', async () => {
  const token = await getServiceToken()
  const { payload } = await jwtVerify(token, key)
  expect(payload.scope).toBe('service')
})
