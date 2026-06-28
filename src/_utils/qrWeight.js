/**
 * QR Code Weight slider <-> backend mapping.
 *
 * The "QR Code Weight" slider is presented to users on a -3..+3 scale
 * (Weak -> Strong). The backend (api/main.py) accepts qr_weight only in
 * [0.0, 1.0] (Query(ge=0.0, le=1.0)) and maps that to the QR ControlNet
 * strength. So the UI value MUST be translated to [0, 1] before it is sent —
 * otherwise the request fails validation with HTTP 422.
 *
 * Linear map: -3 -> 0.0 (most artistic), 0 -> 0.5, +3 -> 1.0 (most scannable).
 */

export const QR_SLIDER_MIN = -2;
export const QR_SLIDER_MAX = 2;

/**
 * Convert a slider value (-3..+3) to a backend qr_weight (0..1).
 * Defensively clamps so an out-of-range stored value can never produce a 422.
 */
export function sliderToQrWeight(sliderValue) {
  const v = Number(sliderValue);
  const safe = Number.isFinite(v) ? v : 0;
  const clamped = Math.min(QR_SLIDER_MAX, Math.max(QR_SLIDER_MIN, safe));
  const normalized = (clamped - QR_SLIDER_MIN) / (QR_SLIDER_MAX - QR_SLIDER_MIN);
  // Round to 4 decimals to keep the query param tidy; backend only needs [0, 1].
  return Math.round(normalized * 10000) / 10000;
}

/**
 * Convert a backend qr_weight (0..1) back to slider value (-3..+3).
 * Used to pre-fill the QR weight slider from a stored image document.
 */
export function qrWeightToSlider(backendValue) {
  const v = Number(backendValue);
  const safe = Number.isFinite(v) ? v : 0.5;
  const clamped = Math.min(1, Math.max(0, safe));
  const slider = clamped * (QR_SLIDER_MAX - QR_SLIDER_MIN) + QR_SLIDER_MIN;
  return Math.round(slider * 10000) / 10000;
}
