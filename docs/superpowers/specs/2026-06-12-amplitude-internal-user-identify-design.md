# QRAI-78: Amplitude Internal User Identification

## Problem

Amplitude data is polluted by internal usage (Christoph testing the app), making it impossible to distinguish real user behaviour from dev activity. Additionally, the app never calls `setUserId`, so authenticated user events are tracked anonymously with no stable identity.

## Solution

1. Call `amplitude.setUserId()` to associate events with a stable user identity.
2. Set an `is_internal` user property via `amplitude.identify()` so internal sessions can be filtered out of any chart or cohort.

## Architecture

All changes are in `src/_context/amplitudeContext.js`. No other files change.

### INTERNAL_EMAILS constant

```js
const INTERNAL_EMAILS = [
  "biedermann.chris@gmail.com",
  "christopherpeterman812@gmail.com",
];
```

Not exported. Not an env var. Easy to extend.

### New useEffect

A second `useEffect` (separate from the `init` effect) fires when the Zustand `user` changes:

```js
useEffect(() => {
  if (!user?.email || user?.is_guest) return;

  setUserId(user._id);

  const identifyEvent = new Identify();
  identifyEvent.set("is_internal", INTERNAL_EMAILS.includes(user.email));
  identify(identifyEvent);
}, [user]);
```

**Guest users** (`is_guest: true` or no `email`) are skipped entirely — they cannot be an internal user unless explicitly identified via Google sign-in.

**All authenticated users** get `is_internal` set (true or false), so the property is queryable across the full authenticated population.

**On sign-out**, `user` will revert to a guest/empty state, causing the effect to return early. `setUserId(undefined)` is not called explicitly — the next `init` on page load resets the device session naturally.

## Data Flow

```
layout.js (server) → getUserInfo()
  → StoreInitializer sets useStore.user
    → AmplitudeContextProvider (child) reads user via useStore
      → useEffect fires on user change
        → setUserId(user._id)
        → identify({ is_internal: true|false })
```

## Imports Added

```js
import { init, track, identify, setUserId, Identify } from "@amplitude/analytics-browser";
```

## Out of Scope

Filtering existing Amplitude dashboards/charts (`is_internal ≠ true`) is a manual step in the Amplitude UI — done after this ships.

## Files Changed

- `src/_context/amplitudeContext.js` — only file modified
