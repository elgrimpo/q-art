import { identify, Identify } from "@amplitude/analytics-browser";

const PARAM = "variant";
const STORAGE_KEY = "qrai_landing_variant";

// First-touch-durable audience tag for ad experiments. Campaigns tag their
// landing URLs (?variant=reddit-cafes); we stick it in localStorage so it
// survives later sessions in the same browser, then set it as a sticky user
// property so every event can be sliced by landing_variant.
export function captureLandingVariant() {
  if (typeof window === "undefined") return;

  const param = new URLSearchParams(window.location.search).get(PARAM);
  if (param) {
    try {
      window.localStorage.setItem(STORAGE_KEY, param);
    } catch {
      /* ignore storage failures (private mode, etc.) */
    }
  }

  let variant = param;
  if (!variant) {
    try {
      variant = window.localStorage.getItem(STORAGE_KEY);
    } catch {
      variant = null;
    }
  }
  if (!variant) return;

  identify(new Identify().set("landing_variant", variant));
}
