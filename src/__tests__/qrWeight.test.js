/**
 * sliderToQrWeight — the slider (-2..+2) -> backend qr_weight (0..1) mapping.
 *
 * The backend (api/main.py) validates qr_weight with Query(ge=0.0, le=1.0);
 * anything outside [0, 1] is rejected with HTTP 422. These tests pin the contract.
 */

import { sliderToQrWeight, qrWeightToSlider } from '../_utils/qrWeight'

describe('sliderToQrWeight', () => {
  test('maps the slider endpoints and center to [0, 1]', () => {
    expect(sliderToQrWeight(-2)).toBe(0)   // Weak -> most artistic
    expect(sliderToQrWeight(0)).toBe(0.5)  // center
    expect(sliderToQrWeight(2)).toBe(1)    // Strong -> most scannable
  })

  test('keeps every in-range slider step within the backend [0, 1] contract', () => {
    for (let v = -2; v <= 2.0001; v += 1) {
      const w = sliderToQrWeight(v)
      expect(w).toBeGreaterThanOrEqual(0)
      expect(w).toBeLessThanOrEqual(1)
    }
  })

  test('clamps out-of-range and non-finite values to [0, 1]', () => {
    expect(sliderToQrWeight(-99)).toBe(0)
    expect(sliderToQrWeight(99)).toBe(1)
    expect(sliderToQrWeight(NaN)).toBe(0.5)      // 0 maps to center with ±2 range
    expect(sliderToQrWeight(undefined)).toBe(0.5)
  })

  test('accepts numeric strings (slider/store may stringify)', () => {
    expect(sliderToQrWeight('0')).toBe(0.5)
    expect(sliderToQrWeight('2')).toBe(1)
  })
})

describe('qrWeightToSlider', () => {
  test('maps backend endpoints and center back to slider range', () => {
    expect(qrWeightToSlider(0)).toBe(-2)
    expect(qrWeightToSlider(0.5)).toBe(0)
    expect(qrWeightToSlider(1)).toBe(2)
  })

  test('round-trips with sliderToQrWeight', () => {
    for (let v = -2; v <= 2.0001; v += 1) {
      expect(qrWeightToSlider(sliderToQrWeight(v))).toBeCloseTo(v, 3)
    }
  })

  test('clamps out-of-range backend values', () => {
    expect(qrWeightToSlider(-1)).toBe(-2)
    expect(qrWeightToSlider(2)).toBe(2)
  })
})
