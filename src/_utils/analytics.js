import { track, revenue, Revenue } from "@amplitude/analytics-browser";

export const EVENTS = {
  CHECKOUT_STARTED: "Checkout Started",
  PURCHASE_COMPLETED: "Purchase Completed",
  PURCHASE_ABANDONED: "Purchase Abandoned",
  PURCHASE_FAILED: "Purchase Failed",
};

export const UNLOCK_PRICE = 3.99;
export const CURRENCY = "USD";
export const PRODUCT_ID = "hd_unlock";

// Fires the funnel's terminal step + an Amplitude Revenue event (emits the
// revenue_amount / unverified_revenue properties). Client-reported revenue —
// reconcile against Stripe later if a server-side integration is added.
export function trackUnlockRevenue(imageId) {
  track(EVENTS.PURCHASE_COMPLETED, {
    imageId,
    price: UNLOCK_PRICE,
    currency: CURRENCY,
  });

  const revenueEvent = new Revenue()
    .setProductId(PRODUCT_ID)
    .setPrice(UNLOCK_PRICE)
    .setQuantity(1);
  revenue(revenueEvent);
}
