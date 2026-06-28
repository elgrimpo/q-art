import React from 'react'
import { render, screen } from '@testing-library/react'

jest.mock('@/_utils/ImagesUtils', () => ({
  bookmarkImage: jest.fn(),
  deleteImage: jest.fn(),
}))
jest.mock('@amplitude/analytics-browser', () => ({ track: jest.fn() }))

jest.mock('@/store.js', () => ({
  useStore: () => ({ user: { _id: 'u1', is_guest: false }, openAlert: jest.fn() }),
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

const BASE = {
  _id: 'img1',
  watermarked_image_url: 'http://example.com/img.jpg',
  content: 'loremipsum.com',
  style_title: 'Doodle Art',
  unlocked: false,
  scannability_score: null,
  likes: [],
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
