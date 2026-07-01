/**
 * QR Code Weight slider range constants.
 *
 * The backend (api/main.py) accepts qr_weight directly in [-2, 2] — the same
 * range the slider exposes — so no translation happens here (QRAI-135/136).
 */

import { QR_SLIDER_MIN, QR_SLIDER_MAX } from '../_utils/qrWeight'

describe('QR_SLIDER_MIN / QR_SLIDER_MAX', () => {
  test('slider exposes the -2..+2 range', () => {
    expect(QR_SLIDER_MIN).toBe(-2)
    expect(QR_SLIDER_MAX).toBe(2)
  })
})
