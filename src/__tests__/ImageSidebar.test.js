// src/__tests__/ImageSidebar.test.js
import React from 'react'
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react'

jest.mock('next/navigation', () => ({ useRouter: () => ({ refresh: jest.fn() }) }))
jest.mock('@amplitude/analytics-browser', () => ({ track: jest.fn() }))

const mockUnlockImage = jest.fn()
jest.mock('@/_utils/ImagesUtils', () => ({
  unlockImage: (...a) => mockUnlockImage(...a),
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
  default: ({ isOpen, onOpen, isOwner }) => (
    <div data-testid="iterate-panel" data-open={String(isOpen)} data-is-owner={String(!!isOwner)}>
      <button onClick={onOpen}>{isOwner !== false ? 'Iterate this image' : 'Make it your own'}</button>
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

  test('passes isOwner=true to IteratePanel when user owns the image', async () => {
    setSearch('')
    await act(async () => {
      render(
        <ImageSidebar
          image={IMAGE}          // IMAGE.user_id = 'u1' === USER._id
          user={USER}
          customDeleteAction={jest.fn()}
          showActions={false}
        />
      )
    })
    expect(screen.getByTestId('iterate-panel')).toHaveAttribute('data-is-owner', 'true')
  })

  test('passes isOwner=false to IteratePanel when user does not own the image', async () => {
    setSearch('')
    await act(async () => {
      render(
        <ImageSidebar
          image={{ ...IMAGE, user_id: 'other-user' }}
          user={USER}
          customDeleteAction={jest.fn()}
          showActions={false}
        />
      )
    })
    expect(screen.getByTestId('iterate-panel')).toHaveAttribute('data-is-owner', 'false')
  })
})

