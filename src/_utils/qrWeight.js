/**
 * QR Code Weight slider range.
 *
 * The "QR Code Weight" slider is presented to users on a -2..+2 scale
 * (Weak -> Strong) and is sent to the backend as-is: `api/main.py` accepts
 * `qr_weight` directly in [-2, 2] (QRAI-135/136) — no translation needed.
 */

export const QR_SLIDER_MIN = -2;
export const QR_SLIDER_MAX = 2;
