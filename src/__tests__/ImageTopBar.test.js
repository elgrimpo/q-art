import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'

jest.mock('@/_utils/ImagesUtils', () => ({
  bookmarkImage: jest.fn(),
  bookmarkHero: jest.fn(),
  deleteImage: jest.fn(),
}))
jest.mock('@amplitude/analytics-browser', () => ({ track: jest.fn() }))
jest.mock('next/navigation', () => ({ useRouter: () => ({ back: jest.fn() }) }))
jest.mock('@/store', () => ({
  useStore: () => ({ openAlert: jest.fn() }),
}))
jest.mock('@/_components/actions/LikeButton', () => ({
  __esModule: true,
  default: () => <div data-testid="like-button" />,
}))
jest.mock('@/_components/actions/ShareButton', () => ({
  __esModule: true,
  default: () => <div data-testid="share-button" />,
}))
jest.mock('@/_components/actions/DeleteButton', () => ({
  __esModule: true,
  default: () => <div data-testid="delete-button" />,
}))
jest.mock('../app/images/[imageId]/AdminImageInfoDialog', () => ({
  __esModule: true,
  default: () => null,
}))

import ImageTopBar from '../app/images/[imageId]/ImageTopBar'
import { bookmarkHero } from '@/_utils/ImagesUtils'

const SQUARE_IMAGE = { _id: 'img1', user_id: 'owner1', width: 768, height: 768, featured: true, is_hero: false }
const ADMIN_USER = { _id: 'admin1', is_admin: true }

test('non-admin users do not see the admin menu', () => {
  render(<ImageTopBar image={SQUARE_IMAGE} user={{ _id: 'someone', is_admin: false }} />)
  expect(screen.queryByLabelText('Admin actions')).not.toBeInTheDocument()
})

test('admin sees Set as Hero for a featured square image', () => {
  render(<ImageTopBar image={SQUARE_IMAGE} user={ADMIN_USER} />)
  fireEvent.click(screen.getByLabelText('Admin actions'))
  expect(screen.getByText('Set as Hero')).toBeInTheDocument()
})

test('admin does not see the Hero option for a non-square image', () => {
  const landscapeImage = { ...SQUARE_IMAGE, width: 1152, height: 768 }
  render(<ImageTopBar image={landscapeImage} user={ADMIN_USER} />)
  fireEvent.click(screen.getByLabelText('Admin actions'))
  expect(screen.queryByText('Set as Hero')).not.toBeInTheDocument()
})

test('admin does not see the Hero option when the image is not featured', () => {
  const notFeatured = { ...SQUARE_IMAGE, featured: false }
  render(<ImageTopBar image={notFeatured} user={ADMIN_USER} />)
  fireEvent.click(screen.getByLabelText('Admin actions'))
  expect(screen.queryByText('Set as Hero')).not.toBeInTheDocument()
})

test('clicking Set as Hero calls bookmarkHero with the image id', () => {
  bookmarkHero.mockResolvedValueOnce({ is_hero: true })
  render(<ImageTopBar image={SQUARE_IMAGE} user={ADMIN_USER} />)
  fireEvent.click(screen.getByLabelText('Admin actions'))
  fireEvent.click(screen.getByText('Set as Hero'))
  expect(bookmarkHero).toHaveBeenCalledWith('img1')
})

test('shows Remove as Hero for an image already marked as hero', () => {
  const heroImage = { ...SQUARE_IMAGE, is_hero: true }
  render(<ImageTopBar image={heroImage} user={ADMIN_USER} />)
  fireEvent.click(screen.getByLabelText('Admin actions'))
  expect(screen.getByText('Remove as Hero')).toBeInTheDocument()
})
