// src/__tests__/ImageSidebar.test.js
import React from 'react'
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react'

jest.mock('next/navigation', () => ({ useRouter: () => ({ refresh: jest.fn() }) }))
jest.mock('@amplitude/analytics-browser', () => ({ track: jest.fn() }))

const mockUnlockImage = jest.fn()
const mockBookmarkImage = jest.fn()
jest.mock('@/_utils/ImagesUtils', () => ({
  unlockImage: (...a) => mockUnlockImage(...a),
  bookmarkImage: (...a) => mockBookmarkImage(...a),
}))

const mockTrackUnlockRevenue = jest.fn()
jest.mock('@/_utils/analytics', () => {
  const actual = jest.requireActual('../_utils/analytics')
  return { ...actual, trackUnlockRevenue: (...a) => mockTrackUnlockRevenue(...a) }
})

// Stub the action-button children — they import server utils / amplitude we
// don't exercise here.
jest.mock('@/_components/actions/DeleteButton', () => ({ __esModule: true, default: () => <div /> }))
jest.mock('@/_components/actions/CopyButton', () => ({ __esModule: true, default: () => <div /> }))
jest.mock('@/_components/actions/LikeButton', () => ({ __esModule: true, default: () => <div /> }))
jest.mock('@/_components/actions/UnlockButton', () => ({ __esModule: true, default: () => <div /> }))
jest.mock('@/_components/actions/ShareButton', () => ({ __esModule: true, default: () => <div /> }))
jest.mock('../app/images/[imageId]/GuestSignupPrompt', () => ({ __esModule: true, default: () => <div /> }))
jest.mock('@/_components/ScannabilityBadge', () => ({
  __esModule: true,
  default: ({ score }) => score != null ? <div data-testid="scannability-badge">{score}</div> : null,
}))
jest.mock('../app/images/[imageId]/IteratePanel', () => ({
  __esModule: true,
  default: ({ isOpen, onOpen }) => (
    <div data-testid="iterate-panel" data-open={String(isOpen)}>
      <button onClick={onOpen}>Iterate this image</button>
    </div>
  ),
}))

import * as amplitude from '@amplitude/analytics-browser'
import { EVENTS } from '../_utils/analytics'
import ImageSidebar from '../app/images/[imageId]/ImageSidebar'

const IMAGE = { _id: 'img1', unlocked: false, user_id: 'u1' }
const USER = { _id: 'u1', is_guest: false }

function setSearch(search) {
  Object.defineProperty(window, 'location', {
    value: { search }, writable: true, configurable: true,
  })
}

async function renderSidebar() {
  await act(async () => {
    render(<ImageSidebar image={IMAGE} user={USER} customDeleteAction={jest.fn()} />)
  })
}

beforeEach(() => {
  jest.clearAllMocks()
  setSearch('')
  window.sessionStorage.clear()
})

test('fires Purchase Completed + revenue when unlock resolves', async () => {
  setSearch('?stripe_session_id=sess1')
  mockUnlockImage.mockResolvedValueOnce({ ...IMAGE, unlocked: true })

  await renderSidebar()

  await waitFor(() => expect(mockTrackUnlockRevenue).toHaveBeenCalledWith('img1'))
})

test('fires Purchase Abandoned when returning with ?canceled=true', async () => {
  setSearch('?canceled=true')

  await renderSidebar()

  await waitFor(() =>
    expect(amplitude.track).toHaveBeenCalledWith(EVENTS.PURCHASE_ABANDONED, { imageId: 'img1' }),
  )
  expect(mockUnlockImage).not.toHaveBeenCalled()
})

test('does not re-fire Purchase Abandoned on remount when ?canceled=true param persists', async () => {
  setSearch('?canceled=true')

  // First mount (e.g. initial page load)
  await renderSidebar()
  // Second mount (e.g. refresh / remount with same URL — sessionStorage persists)
  await renderSidebar()

  expect(
    amplitude.track.mock.calls.filter((c) => c[0] === EVENTS.PURCHASE_ABANDONED)
  ).toHaveLength(1)
})

test('fires Purchase Failed (fulfillment) when the post-payment unlock throws', async () => {
  setSearch('?stripe_session_id=sess1')
  mockUnlockImage.mockRejectedValueOnce(new Error('upscale failed'))

  await renderSidebar()

  await waitFor(() =>
    expect(amplitude.track).toHaveBeenCalledWith(EVENTS.PURCHASE_FAILED, {
      imageId: 'img1', stage: 'fulfillment',
    }),
  )
})

describe('ScannabilityBadge integration', () => {
  test('shows scannability section when image has a score', async () => {
    setSearch('')
    const imageWithScore = { ...IMAGE, scannability_score: 78 }
    await act(async () => {
      render(<ImageSidebar image={imageWithScore} user={USER} customDeleteAction={jest.fn()} />)
    })
    expect(screen.getByText('Scannability')).toBeInTheDocument()
    expect(screen.getByTestId('scannability-badge')).toBeInTheDocument()
  })

  test('hides scannability section when image has no score', async () => {
    setSearch('')
    await act(async () => {
      render(<ImageSidebar image={IMAGE} user={USER} customDeleteAction={jest.fn()} />)
    })
    expect(screen.queryByText('Scannability')).not.toBeInTheDocument()
    expect(screen.queryByTestId('scannability-badge')).not.toBeInTheDocument()
  })
})

// showActions=false branch (new standalone-page sidebar with IteratePanel)
async function renderNewSidebar(imageOverride = {}) {
  await act(async () => {
    render(
      <ImageSidebar
        image={{ ...IMAGE, ...imageOverride }}
        user={USER}
        customDeleteAction={jest.fn()}
        showActions={false}
      />
    )
  })
}

describe('showActions=false sidebar', () => {
  test('renders IteratePanel in default state', async () => {
    setSearch('')
    await renderNewSidebar()
    expect(screen.getByTestId('iterate-panel')).toBeInTheDocument()
    expect(screen.getByTestId('iterate-panel')).toHaveAttribute('data-open', 'false')
  })

  test('opening iterate form hides other sidebar sections', async () => {
    setSearch('')
    await renderNewSidebar({ content: 'https://example.com' })
    fireEvent.click(screen.getByText('Iterate this image'))
    expect(screen.getByTestId('iterate-panel')).toHaveAttribute('data-open', 'true')
    expect(screen.queryByText('Links to')).not.toBeInTheDocument()
  })
})

// --------------------------------------------------------------------------
// Admin controls — showActions=true (modal) mode
// --------------------------------------------------------------------------

const ADMIN_USER = { _id: 'admin1', is_guest: false, is_admin: true }
const OTHER_IMAGE = { _id: 'img2', unlocked: false, user_id: 'other_user' }

async function renderSidebarAs(user, image = IMAGE) {
  await act(async () => {
    render(<ImageSidebar image={image} user={user} customDeleteAction={jest.fn()} />)
  })
}

describe('admin controls', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    setSearch('')
  })

  test('shows bookmark button for admin user', async () => {
    await renderSidebarAs(ADMIN_USER)
    expect(
      screen.getByRole('button', { name: /add to featured|remove from featured/i })
    ).toBeInTheDocument()
  })

  test('does not show bookmark button for non-admin user', async () => {
    await renderSidebarAs(USER)
    expect(
      screen.queryByRole('button', { name: /add to featured|remove from featured/i })
    ).not.toBeInTheDocument()
  })

  test('calls bookmarkImage when bookmark button is clicked', async () => {
    mockBookmarkImage.mockResolvedValueOnce({ featured: true })
    await renderSidebarAs(ADMIN_USER)

    await act(async () => {
      fireEvent.click(
        screen.getByRole('button', { name: /add to featured|remove from featured/i })
      )
    })

    expect(mockBookmarkImage).toHaveBeenCalledWith(IMAGE._id)
  })

  test('optimistically toggles featured state and reverts on error', async () => {
    mockBookmarkImage.mockRejectedValueOnce(new Error('server error'))
    await renderSidebarAs(ADMIN_USER, { ...IMAGE, featured: false })

    const btn = screen.getByRole('button', { name: /add to featured/i })
    await act(async () => { fireEvent.click(btn) })

    // After error the button should revert back to "add to featured"
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /add to featured/i })).toBeInTheDocument()
    )
  })
})
