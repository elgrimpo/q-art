jest.mock('@amplitude/analytics-browser', () => ({
  identify: jest.fn(),
  Identify: jest.fn().mockImplementation(() => {
    const inst = {}
    inst.set = jest.fn(() => inst)
    return inst
  }),
}))

import { identify, Identify } from '@amplitude/analytics-browser'
import { captureLandingVariant } from '../_utils/attribution'

function setSearch(search) {
  Object.defineProperty(window, 'location', {
    value: { search }, writable: true, configurable: true,
  })
}

beforeEach(() => {
  jest.clearAllMocks()
  window.localStorage.clear()
  setSearch('')
})

test('sets landing_variant from the ?variant= param and persists it', () => {
  setSearch('?variant=reddit-cafes')
  captureLandingVariant()

  expect(window.localStorage.getItem('qrai_landing_variant')).toBe('reddit-cafes')
  const inst = Identify.mock.results[0].value
  expect(inst.set).toHaveBeenCalledWith('landing_variant', 'reddit-cafes')
  expect(identify).toHaveBeenCalledWith(inst)
})

test('falls back to the stored variant when no param is present', () => {
  window.localStorage.setItem('qrai_landing_variant', 'pinterest-weddings')
  captureLandingVariant()

  const inst = Identify.mock.results[0].value
  expect(inst.set).toHaveBeenCalledWith('landing_variant', 'pinterest-weddings')
  expect(identify).toHaveBeenCalledWith(inst)
})

test('does nothing when there is no param and nothing stored', () => {
  captureLandingVariant()
  expect(identify).not.toHaveBeenCalled()
})
