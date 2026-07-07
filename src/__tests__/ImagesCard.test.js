import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'

jest.mock('@/_utils/ImagesUtils', () => ({
  bookmarkImage: jest.fn(),
  bookmarkHero: jest.fn(),
  deleteImage: jest.fn(),
}))
jest.mock('@amplitude/analytics-browser', () => ({ track: jest.fn() }))

let mockUser = { _id: 'u1', is_guest: false, is_admin: false }
jest.mock('@/store.js', () => ({
  useStore: () => ({ user: mockUser, openAlert: jest.fn() }),
}))
jest.mock('@/_components/actions/LikeButton.js', () => ({
  __esModule: true,
  default: () => <div data-testid="like-button" />,
}))
jest.mock('../app/(main_pages)/mycodes/SkeletonCard.js', () => ({
  __esModule: true,
  default: () => <div data-testid="skeleton-card" />,
}))

import ImageCard from '../app/(main_pages)/mycodes/ImagesCard'
import { bookmarkHero } from '@/_utils/ImagesUtils'

const BASE = {
  _id: 'img1',
  watermarked_image_url: 'http://example.com/img.jpg',
  content: 'loremipsum.com',
  style_title: 'Doodle Art',
  unlocked: false,
  scannability_score: null,
  likes: [],
  width: 768,
  height: 768,
  featured: false,
  is_hero: false,
}

function renderCard(imageOverrides = {}) {
  return render(
    <ImageCard
      image={{ ...BASE, ...imageOverrides }}
      index={0}
      variant="image"
      handleCardClick={jest.fn()}
    />
  )
}

test('renders image with URL text', () => {
  renderCard()
  expect(screen.getByRole('img')).toBeInTheDocument()
  expect(screen.getByText('loremipsum.com')).toBeInTheDocument()
})

test('shows locked badge when unlocked is false', () => {
  renderCard({ unlocked: false })
  expect(screen.getByText(/locked preview/i)).toBeInTheDocument()
})

test('shows locked badge when unlocked is undefined', () => {
  renderCard({ unlocked: undefined })
  expect(screen.getByText(/locked preview/i)).toBeInTheDocument()
})

test('hides locked badge when unlocked is true', () => {
  renderCard({ unlocked: true })
  expect(screen.queryByText(/locked preview/i)).not.toBeInTheDocument()
})

test('shows scannability widget with score and label when score is present', () => {
  renderCard({ scannability_score: 92 })
  expect(screen.getByText('92')).toBeInTheDocument()
  expect(screen.getByText('Excellent')).toBeInTheDocument()
  expect(screen.getByText('scannability')).toBeInTheDocument()
})

test('shows correct label for each scannability tier', () => {
  const cases = [
    [90, 'Excellent'],
    [75, 'Good'],
    [55, 'Fair'],
    [30, 'Poor'],
    [10, 'Unscannable'],
  ]
  for (const [score, label] of cases) {
    const { unmount } = renderCard({ scannability_score: score })
    expect(screen.getByText(label)).toBeInTheDocument()
    unmount()
  }
})

test('hides scannability widget when score is null', () => {
  renderCard({ scannability_score: null })
  expect(screen.queryByText('scannability')).not.toBeInTheDocument()
})

test('hides style chip when style_title is null', () => {
  renderCard({ style_title: null })
  expect(screen.queryByText(/doodle art/i)).not.toBeInTheDocument()
})

test('renders skeleton card when variant is skeleton', () => {
  render(<ImageCard variant="skeleton" index={0} />)
  expect(screen.getByTestId('skeleton-card')).toBeInTheDocument()
  expect(screen.queryByRole('img')).not.toBeInTheDocument()
})

test('renders like button overlay', () => {
  renderCard()
  expect(screen.getByTestId('like-button')).toBeInTheDocument()
})

afterEach(() => {
  mockUser = { _id: 'u1', is_guest: false, is_admin: false }
})

test('non-admin users do not see the admin menu', () => {
  renderCard()
  expect(screen.queryByLabelText('Admin actions')).not.toBeInTheDocument()
})

test('admin sees Set as Hero for a featured square image', () => {
  mockUser = { _id: 'admin1', is_guest: false, is_admin: true }
  renderCard({ featured: true })
  fireEvent.click(screen.getByLabelText('Admin actions'))
  expect(screen.getByText('Set as Hero')).toBeInTheDocument()
})

test('admin does not see the Hero option for a non-square image', () => {
  mockUser = { _id: 'admin1', is_guest: false, is_admin: true }
  renderCard({ featured: true, width: 1152, height: 768 })
  fireEvent.click(screen.getByLabelText('Admin actions'))
  expect(screen.queryByText('Set as Hero')).not.toBeInTheDocument()
})

test('admin does not see the Hero option when the image is not featured', () => {
  mockUser = { _id: 'admin1', is_guest: false, is_admin: true }
  renderCard({ featured: false })
  fireEvent.click(screen.getByLabelText('Admin actions'))
  expect(screen.queryByText('Set as Hero')).not.toBeInTheDocument()
})

test('clicking Set as Hero calls bookmarkHero with the image id', () => {
  mockUser = { _id: 'admin1', is_guest: false, is_admin: true }
  bookmarkHero.mockResolvedValueOnce({ is_hero: true })
  renderCard({ featured: true })
  fireEvent.click(screen.getByLabelText('Admin actions'))
  fireEvent.click(screen.getByText('Set as Hero'))
  expect(bookmarkHero).toHaveBeenCalledWith('img1')
})

test('shows Remove as Hero for an image already marked as hero', () => {
  mockUser = { _id: 'admin1', is_guest: false, is_admin: true }
  renderCard({ featured: true, is_hero: true })
  fireEvent.click(screen.getByLabelText('Admin actions'))
  expect(screen.getByText('Remove as Hero')).toBeInTheDocument()
})
