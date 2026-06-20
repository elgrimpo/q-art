// src/__tests__/UnlockButton.test.js
import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'

jest.mock('@amplitude/analytics-browser', () => ({ track: jest.fn() }))

const mockCreateUnlockCheckout = jest.fn()
jest.mock('@/_utils/paymentUtils', () => ({
  createUnlockCheckout: (...a) => mockCreateUnlockCheckout(...a),
}))

import * as amplitude from '@amplitude/analytics-browser'
import { EVENTS, UNLOCK_PRICE, CURRENCY } from '../_utils/analytics'
import UnlockButton from '../_components/actions/UnlockButton'

beforeEach(() => {
  jest.clearAllMocks()
  Object.defineProperty(window, 'location', {
    value: { href: '' }, writable: true, configurable: true,
  })
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
