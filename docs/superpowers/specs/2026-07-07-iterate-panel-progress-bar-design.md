# Iterate Panel Progress Bar — Design

**Date:** 2026-07-07
**Status:** Design approved, pending implementation
**Author:** Christoph + Claude
**Builds on:** `docs/superpowers/specs/2026-07-06-generation-progress-tracking-design.md`

---

## Problem

The generation-progress-tracking work added a real, live progress bar to
`GenerateForm.js` (`/generate`), but `IteratePanel.js`'s "New Variation" and
"Retry" flows (on the image detail page) were deliberately left on the old
blocking `generateImage()` compatibility wrapper, so they still show a static
GIF with no progress feedback. This closes that gap.

---

## Scope

### In scope

- Extract the poll-until-done logic (start + poll + retry + timeout) out of
  `GenerateForm.js` into a shared hook, `useGenerationPolling`
- Wire `IteratePanel.js`'s "New Variation"/"Retry" flows to `startGeneration`
  + the shared hook, replacing the `generateImage()` compat wrapper
- Persist `jobId`/`percent` in the existing `iterateSession` Zustand object
  so progress correctly resumes if the image-detail modal is closed and
  reopened mid-generation
- Add the same thin bottom-edge progress bar to `IteratePanel.js`'s inline
  generating block, duplicated (not extracted into a shared component),
  matching the existing convention where that block already duplicates
  `GeneratingLoader.js`'s GIF/gradient/text structure rather than reusing it

### Out of scope

- Changing `GenerateForm.js`'s user-facing behavior — it keeps the same
  percent bar, same retry/timeout constants, just sourced from the shared hook
- Any change to the backend (`/api/generate/start`, `/api/generate/progress`)
  — this is purely a second frontend consumer of already-built endpoints
- `generateImage()` (the `ImagesUtils.js` compat wrapper) — it stays as-is for
  any other future caller, it's just no longer called by `IteratePanel.js`

---

## Architecture

### 1. Shared hook — `src/_utils/useGenerationPolling.js`

```js
"use client";
import { useEffect, useRef, useState } from "react";
import { getGenerationProgress } from "./ImagesUtils";

const POLL_INTERVAL_MS = 1200;
const MAX_FAILED_ATTEMPTS = 3;
const MAX_TOTAL_MS = 120000;

export function useGenerationPolling(jobId, { onSucceeded, onFailed }) {
  const [percent, setPercent] = useState(0);
  const timerRef = useRef(null);
  const callbacksRef = useRef({ onSucceeded, onFailed });
  callbacksRef.current = { onSucceeded, onFailed };

  useEffect(() => {
    if (!jobId) return undefined;

    setPercent(0);
    const startedAt = Date.now();
    let failedAttempts = 0;

    const tick = () => {
      getGenerationProgress(jobId)
        .then((progress) => {
          failedAttempts = 0;
          setPercent(progress.percent ?? 0);
          if (progress.status === "succeeded") {
            callbacksRef.current.onSucceeded(progress.result);
            return;
          }
          if (progress.status === "failed") {
            callbacksRef.current.onFailed(new Error(progress.error || "GenerationFailed"));
            return;
          }
          if (Date.now() - startedAt > MAX_TOTAL_MS) {
            callbacksRef.current.onFailed(new Error("GenerationFailed"));
            return;
          }
          timerRef.current = setTimeout(tick, POLL_INTERVAL_MS);
        })
        .catch((error) => {
          failedAttempts += 1;
          if (failedAttempts > MAX_FAILED_ATTEMPTS) {
            callbacksRef.current.onFailed(error);
            return;
          }
          timerRef.current = setTimeout(tick, POLL_INTERVAL_MS);
        });
    };
    tick();

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [jobId]);

  return percent;
}
```

`callbacksRef` exists so the effect can stay keyed on `[jobId]` alone (not
re-running every render just because the parent re-created its callback
functions) while still always calling the *latest* `onSucceeded`/`onFailed`.

**Why this "just works" across modal close/reopen:** the effect is keyed on
`jobId`. On a fresh mount with a `jobId` already set (i.e. `IteratePanel`
remounting because the modal reopened), the effect fires immediately and
calls `getGenerationProgress(jobId)` right away — there's no "resume a timer"
problem to solve, because the backend job keeps running server-side
regardless of whether any client is polling it. The hook simply asks "where
does this job stand right now?" and continues from there. `GenerateForm.js`
gets the identical behavior for free; it just never remounts mid-generation
in practice, so this path is inert for it.

### 2. `GenerateForm.js`

Replace the inline `pollUntilDone`/`pollTimerRef`/percent-state block with:

```js
const [jobId, setJobId] = useState(null);
const percent = useGenerationPolling(jobId, {
  onSucceeded: (image) => { /* existing success path */ },
  onFailed: (error) => { /* existing catch-block path */ },
});
```

`handleGenerate` becomes `await startGeneration(...)` → `setJobId(job_id)`;
the hook takes over from there. Behavior is unchanged — same bar, same
retry/timeout constants — the difference is purely where the logic lives.

### 3. `IteratePanel.js`

`iterateSession` gains two fields: `jobId` and `percent` (percent is written
by the hook's caller into the session on every update, so a remounted
component can paint the bar immediately from the last-known value before its
own first poll response arrives, instead of flashing back to 0%).

`handleGenerate`/`handleRetry` (currently near-identical, both calling
`generateImage(payload)`) both become:

```js
const { job_id } = await startGeneration(payload);
setIterateSession({ imageId: image._id, generating: true, error: false, payload, trigger, jobId: job_id, percent: 0 });
```

A `useGenerationPolling(generating ? iterateSession?.jobId : null, { onSucceeded, onFailed })`
call — reusing the component's existing `generating` boolean (already derived
as `iterateSession?.imageId === image?._id && !!iterateSession?.generating`)
to gate the `jobId` passed in, so polling is only "live" for this image's
own session — drives the bar. Each percent update also writes back into `iterateSession` via
`setIterateSession({ ...iterateSession, percent })`, so the value survives
an unmount/remount even between the hook's own poll ticks.

`onSucceeded`/`onFailed` reproduce exactly what the old `.then`/`.catch`
did: success clears the session and navigates
(`router.push(/images/${image._id})`); failure checks
`isGenerationFailure(err)` and either shows the inline error state or clears
the session silently, unchanged from today.

The inline generating block's `Box` (the one with `aspectRatio: "1/1"`,
currently holding the GIF/gradient/text) gets one more absolutely-positioned
child: the same 3px bottom-edge bar as `GeneratingLoader.js`
(`height: "3px"`, `width: ${clampedPercent}%`, `backgroundColor: "primary.main"`,
matching glow), duplicated rather than imported, consistent with how this
block already duplicates the rest of `GeneratingLoader`'s visual structure.

---

## Data flow summary

```
IteratePanel.js: handleGenerate("newVariation") or handleRetry()
  → startGeneration(payload) → { job_id }
  → setIterateSession({ ..., jobId: job_id, percent: 0 })
  → useGenerationPolling(iterateSession.jobId, {...}) effect fires
      → getGenerationProgress(jobId) every ~1.2s
      → percent written into local hook state AND back into iterateSession
      → on "succeeded": onSucceeded(result) → clearIterateSession() + router.push
      → on "failed": onFailed(error) → inline error state or silent clear

Modal closed mid-generation (IteratePanel unmounts):
  → hook's cleanup clears its setTimeout — no client polling while closed
  → iterateSession (generating: true, jobId, percent) persists in Zustand

Modal reopened (IteratePanel remounts):
  → useGenerationPolling(iterateSession.jobId, {...}) effect fires fresh
  → immediately calls getGenerationProgress(jobId) → picks up current state
  → bar starts from iterateSession.percent (last known), updates from there
```

---

## Testing

- New `src/__tests__/useGenerationPolling.test.js`: covers the retry-on-
  transient-failure, retry-exhaustion, and ~2-minute-timeout paths (moved
  here from `GenerateForm.test.js`, same assertions, tested via a small
  throwaway component that calls the hook and exposes `percent`/callback
  results to the DOM for assertions — this repo has no `@testing-library/react-hooks`
  dependency, so a wrapper component is the existing-toolchain-compatible way
  to exercise a hook).
- `GenerateForm.test.js`: keeps its existing happy-path/percent/dialog tests;
  drops the three retry/timeout tests (now covered by the hook's own tests).
- `IteratePanel.test.js`: add tests for (a) `startGeneration`+`iterateSession`
  wiring on New Variation/Retry (replacing the current `generateImage`-mock
  assertions), (b) the bar rendering with the right width from
  `iterateSession.percent`, (c) polling resumes correctly when the component
  is unmounted and remounted with `iterateSession.jobId` already set
  (simulates the modal-reopen case).
