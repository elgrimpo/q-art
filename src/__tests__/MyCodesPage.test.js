import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'

const mockPush = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => '/mycodes',
}))

jest.mock('react-intersection-observer', () => ({
  useInView: () => ({ ref: jest.fn(), inView: true }),
}))

const mockUser = {
  _id: 'user1',
  email: 'user@example.com',
  is_guest: false,
  is_admin: false,
}

jest.mock('@/store', () => ({
  useStore: (selector) => {
    const state = { user: mockUser, openAlert: jest.fn() }
    return typeof selector === 'function' ? selector(state) : state
  },
}))

jest.mock('@/_utils/ImagesUtils', () => ({
  getImages: jest.fn(),
  bookmarkImage: jest.fn(),
  deleteImage: jest.fn(),
}))

jest.mock('@amplitude/analytics-browser', () => ({ track: jest.fn() }))
jest.mock('@/_components/actions/LikeButton.js', () => ({
  __esModule: true,
  default: () => <div data-testid="like-button" />,
}))
jest.mock('../app/(main_pages)/mycodes/SkeletonCard.js', () => ({
  __esModule: true,
  default: () => <div data-testid="skeleton-card" />,
}))
jest.mock('../app/(main_pages)/mycodes/ImageModal.js', () => ({
  __esModule: true,
  default: () => null,
}))

const { getImages } = require('@/_utils/ImagesUtils')
import MyCodes from '../app/(main_pages)/mycodes/page'

beforeEach(() => {
  jest.clearAllMocks()
  mockUser._id = 'user1'
  mockUser.email = 'user@example.com'
  mockUser.is_guest = false
  mockUser.is_admin = false
})

test('requests images scoped to the logged-in user by default', async () => {
  getImages.mockResolvedValue([])
  render(<MyCodes />)

  await waitFor(() => expect(getImages).toHaveBeenCalled())

  expect(getImages).toHaveBeenCalledWith(
    expect.objectContaining({
      page: 1,
      user_id: 'user1',
      exclude_user_id: undefined,
      sort_by: 'Newest',
    })
  )
})

test('shows the empty-state message when the user has no images', async () => {
  getImages.mockResolvedValue([])
  render(<MyCodes />)

  expect(
    await screen.findByText(/you don't have any images yet/i)
  ).toBeInTheDocument()
})

test('redirects guests to /generate', async () => {
  mockUser.is_guest = true
  mockUser.email = undefined
  getImages.mockResolvedValue([])
  render(<MyCodes />)

  await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/generate'))
})

test('does not redirect a logged-in non-guest user', async () => {
  getImages.mockResolvedValue([])
  render(<MyCodes />)
  await waitFor(() => expect(getImages).toHaveBeenCalled())
  expect(mockPush).not.toHaveBeenCalled()
})
