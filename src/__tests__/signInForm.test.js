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
