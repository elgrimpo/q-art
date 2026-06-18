import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

jest.mock('next-auth/react', () => ({
  signIn: jest.fn(),
  useSession: () => ({ data: null }),
}))
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
  useSearchParams: () => ({ get: () => null }),
}))

import { signIn } from 'next-auth/react'
import SignIn from '../app/api/auth/signin/signIn'

beforeEach(() => {
  global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({}) })
})
afterEach(() => jest.clearAllMocks())

test('sends a code and advances to the code-entry step', async () => {
  render(<SignIn />)

  await userEvent.type(screen.getByLabelText(/email/i), 'a@b.com')
  await userEvent.click(screen.getByRole('button', { name: /continue with email/i }))

  await waitFor(() =>
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/auth/request-code',
      expect.objectContaining({ method: 'POST' })
    )
  )
  expect(await screen.findByLabelText(/code/i)).toBeInTheDocument()
})

test('shows a friendly error when the backend rejects the request', async () => {
  global.fetch = jest.fn().mockResolvedValue({
    ok: false,
    json: async () => ({ error: 'TooManyRequests' }),
  })

  render(<SignIn />)

  await userEvent.type(screen.getByLabelText(/email/i), 'a@b.com')
  await userEvent.click(screen.getByRole('button', { name: /continue with email/i }))

  expect(await screen.findByText(/too many code requests/i)).toBeInTheDocument()
})

test('does a full-page navigation on successful verification so the layout re-reads the session', async () => {
  const originalLocation = window.location
  const assignMock = jest.fn()
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: { assign: assignMock },
  })

  try {
    render(<SignIn />)

    // Step 1: request a code → advance to the code step.
    await userEvent.type(screen.getByLabelText(/email/i), 'a@b.com')
    await userEvent.click(screen.getByRole('button', { name: /continue with email/i }))

    // Step 2: a successful verify returns a callback url.
    signIn.mockResolvedValueOnce({ ok: true, error: null, url: 'http://localhost/generate' })
    await userEvent.type(await screen.findByLabelText(/code/i), '123456')
    await userEvent.click(screen.getByRole('button', { name: /verify & sign in/i }))

    // A soft router.push would NOT re-run the server layout that seeds auth
    // state — so success must trigger a full navigation instead.
    await waitFor(() =>
      expect(assignMock).toHaveBeenCalledWith('http://localhost/generate')
    )
  } finally {
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: originalLocation,
    })
  }
})
