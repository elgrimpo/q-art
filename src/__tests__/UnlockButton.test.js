// src/__tests__/UnlockButton.test.js
import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'

jest.mock('@amplitude/analytics-browser', () => ({ track: jest.fn() }))

const mockCreateUnlockCheckout = jest.fn()
jest.mock('@/_utils/paymentUtils', () => ({
  createUnlockCheckout: (...a) => mockCreateUnlockCheckout(...a),
}))

const mockAdminDownloadImage = jest.fn()
jest.mock('@/_utils/ImagesUtils', () => ({
  adminDownloadImage: (...a) => mockAdminDownloadImage(...a),
}))

import * as amplitude from '@amplitude/analytics-browser'
import { EVENTS, UNLOCK_PRICE, CURRENCY } from '../_utils/analytics'
import UnlockButton from '../_components/actions/UnlockButton'

beforeEach(() => {
  jest.clearAllMocks()
  Object.defineProperty(window, 'location', {
    value: { href: '' }, writable: true, configurable: true,
  })
  // Reset URL API stubs
  global.URL.createObjectURL = jest.fn(() => 'blob:mock-url')
  global.URL.revokeObjectURL = jest.fn()
})

function clickUnlock() {
  return act(async () => {
    fireEvent.click(screen.getByRole('button'))
  })
}

test('fires Checkout Started and redirects when a session is created', async () => {
  mockCreateUnlockCheckout.mockResolvedValueOnce('https://stripe.test/session')
  render(<UnlockButton image={{ _id: 'img1', unlocked: false }} />)

  await clickUnlock()

  await waitFor(() =>
    expect(amplitude.track).toHaveBeenCalledWith(EVENTS.CHECKOUT_STARTED, {
      imageId: 'img1', price: UNLOCK_PRICE, currency: CURRENCY,
    }),
  )
  expect(window.location.href).toBe('https://stripe.test/session')
})

test('fires Purchase Failed (checkout_creation) when no session URL comes back', async () => {
  mockCreateUnlockCheckout.mockResolvedValueOnce(null)
  render(<UnlockButton image={{ _id: 'img1', unlocked: false }} />)

  await clickUnlock()

  await waitFor(() =>
    expect(amplitude.track).toHaveBeenCalledWith(EVENTS.PURCHASE_FAILED, {
      imageId: 'img1', stage: 'checkout_creation',
    }),
  )
})

test('fires Purchase Failed (checkout_creation) when checkout creation throws', async () => {
  mockCreateUnlockCheckout.mockRejectedValueOnce(new Error('boom'))
  render(<UnlockButton image={{ _id: 'img1', unlocked: false }} />)

  await clickUnlock()

  await waitFor(() =>
    expect(amplitude.track).toHaveBeenCalledWith(EVENTS.PURCHASE_FAILED, {
      imageId: 'img1', stage: 'checkout_creation',
    }),
  )
})

// --------------------------------------------------------------------------
// Admin download branch
// --------------------------------------------------------------------------

describe('admin download branch', () => {
  test('renders "Download HD (admin)" button when isAdmin=true and image not unlocked', () => {
    render(<UnlockButton image={{ _id: 'img1', unlocked: false }} isAdmin={true} />)
    expect(screen.getByRole('button', { name: /download hd \(admin\)/i })).toBeInTheDocument()
  })

  test('does not render admin button when isAdmin is false (renders normal unlock)', () => {
    render(<UnlockButton image={{ _id: 'img1', unlocked: false }} isAdmin={false} />)
    expect(screen.queryByRole('button', { name: /download hd \(admin\)/i })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /unlock hd/i })).toBeInTheDocument()
  })

  test('does not render admin button when image is already unlocked (shows regular download link)', () => {
    render(<UnlockButton image={{ _id: 'img1', unlocked: true }} isAdmin={true} />)
    expect(screen.queryByRole('button', { name: /download hd \(admin\)/i })).not.toBeInTheDocument()
    // When unlocked, the component renders an <a href=...> — MUI Button with href renders as a link
    expect(screen.getByRole('link', { name: /download hd/i })).toBeInTheDocument()
  })

  test('calls adminDownloadImage and creates object URL on click', async () => {
    const fakeBlob = new Blob(['data'], { type: 'image/png' })
    mockAdminDownloadImage.mockResolvedValueOnce(fakeBlob)

    render(<UnlockButton image={{ _id: 'img2', unlocked: false }} isAdmin={true} />)

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /download hd \(admin\)/i }))
    })

    await waitFor(() => expect(mockAdminDownloadImage).toHaveBeenCalledWith('img2'))
    expect(URL.createObjectURL).toHaveBeenCalledWith(fakeBlob)
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url')
  })

  test('re-enables button after adminDownloadImage throws', async () => {
    mockAdminDownloadImage.mockRejectedValueOnce(new Error('download failed'))

    render(<UnlockButton image={{ _id: 'img2', unlocked: false }} isAdmin={true} />)

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /download hd \(admin\)/i }))
    })

    await waitFor(() => expect(mockAdminDownloadImage).toHaveBeenCalled())
    // The button should re-enable after error
    expect(screen.getByRole('button', { name: /download hd \(admin\)/i })).not.toBeDisabled()
  })
})
