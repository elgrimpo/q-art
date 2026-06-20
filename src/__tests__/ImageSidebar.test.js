// src/__tests__/ImageSidebar.test.js
import React from 'react'
import { render, waitFor, act } from '@testing-library/react'

jest.mock('next/navigation', () => ({ useRouter: () => ({ refresh: jest.fn() }) }))
jest.mock('@amplitude/analytics-browser', () => ({ track: jest.fn() }))

const mockUnlockImage = jest.fn()
jest.mock('@/_utils/ImagesUtils', () => ({ unlockImage: (...a) => mockUnlockImage(...a) }))

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
