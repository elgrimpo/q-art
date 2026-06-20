jest.mock('@amplitude/analytics-browser', () => ({
  track: jest.fn(),
  revenue: jest.fn(),
  Revenue: jest.fn().mockImplementation(() => {
    const inst = {}
    inst.setProductId = jest.fn(() => inst)
    inst.setPrice = jest.fn(() => inst)
    inst.setQuantity = jest.fn(() => inst)
    return inst
  }),
}))

import { track, revenue, Revenue } from '@amplitude/analytics-browser'
import {
  EVENTS, UNLOCK_PRICE, CURRENCY, PRODUCT_ID, trackUnlockRevenue,
} from '../_utils/analytics'

beforeEach(() => jest.clearAllMocks())

test('EVENTS exposes the funnel event names', () => {
  expect(EVENTS.CHECKOUT_STARTED).toBe('Checkout Started')
  expect(EVENTS.PURCHASE_COMPLETED).toBe('Purchase Completed')
  expect(EVENTS.PURCHASE_ABANDONED).toBe('Purchase Abandoned')
  expect(EVENTS.PURCHASE_FAILED).toBe('Purchase Failed')
})

test('trackUnlockRevenue fires Purchase Completed + an Amplitude Revenue event', () => {
  trackUnlockRevenue('img1')

  expect(track).toHaveBeenCalledWith('Purchase Completed', {
    imageId: 'img1', price: UNLOCK_PRICE, currency: CURRENCY,
  })

  const inst = Revenue.mock.results[0].value
  expect(inst.setProductId).toHaveBeenCalledWith(PRODUCT_ID)
  expect(inst.setPrice).toHaveBeenCalledWith(UNLOCK_PRICE)
  expect(inst.setQuantity).toHaveBeenCalledWith(1)
  expect(revenue).toHaveBeenCalledWith(inst)
})
