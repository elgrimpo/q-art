/**
 * sliderToQrWeight — the slider (-3..+3) -> backend qr_weight (0..1) mapping.
 *
 * The backend (api/main.py) validates qr_weight with Query(ge=0.0, le=1.0);
 * anything outside [0, 1] is rejected with HTTP 422. This was the cause of the
 * "errors when QR weight is anything other than 0" bug — the raw slider value
 * was sent unmapped. These tests pin the contract.
 */

import { sliderToQrWeight } from '../_utils/qrWeight'

describe('sliderToQrWeight', () => {
  test('maps the slider endpoints and center to [0, 1]', () => {
    expect(sliderToQrWeight(-3)).toBe(0) // Weak -> most artistic
    expect(sliderToQrWeight(0)).toBe(0.5) // center
    expect(sliderToQrWeight(3)).toBe(1) // Strong -> most scannable
  })

  test('keeps every in-range slider step within the backend [0, 1] contract', () => {
    for (let v = -3; v <= 3.0001; v += 0.1) {
      const w = sliderToQrWeight(v)
      expect(w).toBeGreaterThanOrEqual(0)
      expect(w).toBeLessThanOrEqual(1)
    }
  })

  test('clamps out-of-range and non-finite values to [0, 1]', () => {
    expect(sliderToQrWeight(-99)).toBe(0)
    expect(sliderToQrWeight(99)).toBe(1)
    expect(sliderToQrWeight(NaN)).toBe(0.5) // 0 -> center, defensive default
    expect(sliderToQrWeight(undefined)).toBe(0.5)
  })

  test('accepts numeric strings (slider/store may stringify)', () => {
    expect(sliderToQrWeight('0')).toBe(0.5)
    expect(sliderToQrWeight('3')).toBe(1)
  })
})
