# Iterate Panel Progress Bar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show the same live generation progress bar in `IteratePanel.js`'s "New Variation"/"Retry" flows that `GenerateForm.js` already has, by extracting the poll-until-done logic into a shared hook both components use.

**Architecture:** A new `useGenerationPolling(jobId, callbacks)` hook (in `src/_utils/`) owns the start+poll+retry+timeout logic currently inlined in `GenerateForm.js`. `GenerateForm.js` is refactored to use it (no behavior change). `IteratePanel.js` switches from the blocking `generateImage()` compat wrapper to `startGeneration()` + the same hook, persists `jobId`/`percent` into its existing `iterateSession` Zustand object (so progress resumes correctly if the image-detail modal is closed and reopened mid-generation), and gets a duplicated copy of `GeneratingLoader.js`'s thin bottom-edge progress bar.

**Tech Stack:** React 18 hooks, Zustand, Jest + `@testing-library/react` (`renderHook` is available directly in the installed v16 — no extra hook-testing package needed).

## Global Constraints

- Poll interval ~1.2s, retry up to 3 consecutive transient poll-request failures (give up on the 4th), ~2-minute overall cap — identical constants to the existing `GenerateForm.js` behavior, now centralized in the hook.
- No numeric percent label anywhere — thin visual bar only, same style as `GeneratingLoader.js`'s bar (`height: "3px"`, bottom-left absolute, `primary.main` background + glow).
- The bar in `IteratePanel.js` is duplicated inline, not extracted into a shared component with `GeneratingLoader.js` — matches the existing convention where `IteratePanel.js` already duplicates the GIF/gradient/text structure instead of reusing `GeneratingLoader`.
- `iterateSession` (Zustand, `src/store.js`) gains `jobId` and `percent` fields alongside its existing `imageId`/`generating`/`error`/`payload`/`trigger` — no changes needed to `store.js` itself, since `setIterateSession` already accepts an arbitrary object.
- `GenerateForm.js`'s user-facing behavior must not change — same bar, same retry/timeout behavior, only the implementation moves into the shared hook.

---

## Task 1: `useGenerationPolling` hook

**Files:**
- Create: `src/_utils/useGenerationPolling.js`
- Create: `src/__tests__/useGenerationPolling.test.js`

**Interfaces:**
- Produces: `useGenerationPolling(jobId: string|null, { onSucceeded: (result) => void, onFailed: (error: Error) => void, onProgress?: (percent: number) => void, initialPercent?: number }) => percent: number` — consumed by Task 2 (`GenerateForm.js`) and Task 3 (`IteratePanel.js`)

- [ ] **Step 1: Write the failing tests**

Create `src/__tests__/useGenerationPolling.test.js`:

```javascript
import { renderHook, waitFor } from '@testing-library/react'
import { useGenerationPolling } from '../_utils/useGenerationPolling'

const mockGetGenerationProgress = jest.fn()
jest.mock('../_utils/ImagesUtils', () => ({
  getGenerationProgress: (...args) => mockGetGenerationProgress(...args),
}))

beforeEach(() => {
  mockGetGenerationProgress.mockReset()
})

test('does nothing when jobId is null', () => {
  const onSucceeded = jest.fn()
  const onFailed = jest.fn()
  const { result } = renderHook(() => useGenerationPolling(null, { onSucceeded, onFailed }))
  expect(result.current).toBe(0)
  expect(mockGetGenerationProgress).not.toHaveBeenCalled()
})

test('seeds percent from initialPercent on first render', () => {
  const { result } = renderHook(() =>
    useGenerationPolling(null, { onSucceeded: jest.fn(), onFailed: jest.fn(), initialPercent: 42 })
  )
  expect(result.current).toBe(42)
})

test('updates percent and calls onSucceeded when the job succeeds', async () => {
  mockGetGenerationProgress.mockResolvedValueOnce({ status: 'succeeded', percent: 100, result: { _id: 'img1' } })
  const onSucceeded = jest.fn()
  const onFailed = jest.fn()
  renderHook(() => useGenerationPolling('job-1', { onSucceeded, onFailed }))

  await waitFor(() => expect(onSucceeded).toHaveBeenCalledWith({ _id: 'img1' }))
  expect(onFailed).not.toHaveBeenCalled()
})

test('calls onFailed with the job error when the job fails', async () => {
  mockGetGenerationProgress.mockResolvedValueOnce({ status: 'failed', error: 'GenerationFailed' })
  const onSucceeded = jest.fn()
  const onFailed = jest.fn()
  renderHook(() => useGenerationPolling('job-2', { onSucceeded, onFailed }))

  await waitFor(() => expect(onFailed).toHaveBeenCalled())
  expect(onFailed.mock.calls[0][0].message).toBe('GenerationFailed')
})

test('calls onProgress with each polled percent', async () => {
  mockGetGenerationProgress.mockResolvedValueOnce({ status: 'succeeded', percent: 77, result: { _id: 'img1' } })
  const onProgress = jest.fn()
  renderHook(() => useGenerationPolling('job-6', { onSucceeded: jest.fn(), onFailed: jest.fn(), onProgress }))

  await waitFor(() => expect(onProgress).toHaveBeenCalledWith(77))
})

test('retries a transient poll failure before eventually succeeding', async () => {
  mockGetGenerationProgress
    .mockRejectedValueOnce(new Error('network blip'))
    .mockResolvedValueOnce({ status: 'succeeded', percent: 100, result: { _id: 'img-retry' } })
  const onSucceeded = jest.fn()
  const onFailed = jest.fn()
  renderHook(() => useGenerationPolling('job-3', { onSucceeded, onFailed }))

  await waitFor(() => expect(mockGetGenerationProgress).toHaveBeenCalledTimes(2), { timeout: 5000 })
  await waitFor(() => expect(onSucceeded).toHaveBeenCalledWith({ _id: 'img-retry' }))
}, 10000)

test('gives up after repeated poll failures exceed the retry allowance', async () => {
  mockGetGenerationProgress.mockRejectedValue(new Error('persistent failure'))
  const onSucceeded = jest.fn()
  const onFailed = jest.fn()
  renderHook(() => useGenerationPolling('job-4', { onSucceeded, onFailed }))

  await waitFor(() => expect(mockGetGenerationProgress).toHaveBeenCalledTimes(4), { timeout: 8000 })
  await waitFor(() => expect(onFailed).toHaveBeenCalled())
  expect(onSucceeded).not.toHaveBeenCalled()
}, 15000)

test('gives up after ~2 minutes without a terminal status', async () => {
  mockGetGenerationProgress.mockResolvedValue({ status: 'processing', percent: 10 })
  let now = 1000000
  const dateSpy = jest.spyOn(Date, 'now').mockImplementation(() => now)
  const onSucceeded = jest.fn()
  const onFailed = jest.fn()

  renderHook(() => useGenerationPolling('job-5', { onSucceeded, onFailed }))
  await waitFor(() => expect(mockGetGenerationProgress).toHaveBeenCalledTimes(1))

  now += 121000
  try {
    await waitFor(() => expect(onFailed).toHaveBeenCalled(), { timeout: 5000 })
  } finally {
    dateSpy.mockRestore()
  }
  expect(onSucceeded).not.toHaveBeenCalled()
}, 10000)

test('cleans up its timer on unmount (no further polling)', async () => {
  mockGetGenerationProgress.mockResolvedValue({ status: 'processing', percent: 5 })
  const { unmount } = renderHook(() => useGenerationPolling('job-7', { onSucceeded: jest.fn(), onFailed: jest.fn() }))
  await waitFor(() => expect(mockGetGenerationProgress).toHaveBeenCalledTimes(1))

  unmount()
  const callsAtUnmount = mockGetGenerationProgress.mock.calls.length
  await new Promise((resolve) => setTimeout(resolve, 1300))
  expect(mockGetGenerationProgress.mock.calls.length).toBe(callsAtUnmount)
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test:frontend -- useGenerationPolling`
Expected: FAIL — `Cannot find module '../_utils/useGenerationPolling'` (the hook doesn't exist yet).

- [ ] **Step 3: Implement the hook**

Create `src/_utils/useGenerationPolling.js`:

```javascript
import { useEffect, useRef, useState } from "react";
import { getGenerationProgress } from "./ImagesUtils";

const POLL_INTERVAL_MS = 1200;
const MAX_FAILED_ATTEMPTS = 3;
const MAX_TOTAL_MS = 120000;

// Shared by GenerateForm.js and IteratePanel.js: polls getGenerationProgress
// until the job succeeds or fails, retrying transient poll-request failures
// and giving up after ~2 minutes. `initialPercent` lets a caller seed the
// bar from a previously-known value (e.g. IteratePanel resuming a session
// that survived the image-detail modal being closed and reopened) instead
// of flashing back to 0% while the first poll is still in flight.
export function useGenerationPolling(jobId, { onSucceeded, onFailed, onProgress, initialPercent = 0 } = {}) {
  const [percent, setPercent] = useState(initialPercent);
  const timerRef = useRef(null);
  const callbacksRef = useRef({ onSucceeded, onFailed, onProgress });
  callbacksRef.current = { onSucceeded, onFailed, onProgress };

  useEffect(() => {
    if (!jobId) return undefined;

    const startedAt = Date.now();
    let failedAttempts = 0;

    const tick = () => {
      getGenerationProgress(jobId)
        .then((progress) => {
          failedAttempts = 0;
          const nextPercent = progress.percent ?? 0;
          setPercent(nextPercent);
          callbacksRef.current.onProgress?.(nextPercent);

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

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test:frontend -- useGenerationPolling`
Expected: PASS (9 tests).

- [ ] **Step 5: Commit**

```bash
git add src/_utils/useGenerationPolling.js src/__tests__/useGenerationPolling.test.js
git commit -m "feat: extract shared useGenerationPolling hook"
```

---

## Task 2: Refactor `GenerateForm.js` onto the shared hook

**Files:**
- Modify: `src/app/(main_pages)/generate/GenerateForm.js`
- Modify: `src/__tests__/GenerateForm.test.js`

**Interfaces:**
- Consumes: `useGenerationPolling` (Task 1), `startGeneration` (already exists in `src/_utils/ImagesUtils.js`)
- No new interfaces produced — `GenerateForm`'s external behavior (props, rendered UI, `percent` passed to `GeneratingLoader`) is unchanged.

- [ ] **Step 1: Remove the three tests that move to `useGenerationPolling.test.js`**

In `src/__tests__/GenerateForm.test.js`, delete these three tests (their coverage now lives in Task 1's `useGenerationPolling.test.js`, which tests the same retry/timeout behavior directly on the hook):
- `retries a transient poll failure before eventually succeeding`
- `gives up after repeated poll failures exceed the retry allowance`
- `gives up after ~2 minutes without a terminal status`

Leave every other test in the file untouched — they test `GenerateForm`'s own behavior (button state, amplitude tracking, the `InsufficientCredits` dialog, the happy-path percent-then-navigate flow), which does not change in this task.

- [ ] **Step 2: Run the remaining tests to confirm they still pass against the current (pre-refactor) implementation**

Run: `npm run test:frontend -- GenerateForm`
Expected: PASS (10 tests — this just confirms the file is still valid Jest before you touch the component under test).

- [ ] **Step 3: Refactor `GenerateForm.js` to use the hook**

Replace `src/app/(main_pages)/generate/GenerateForm.js` in full with:

```javascript
"use client";
import React, { useEffect, useRef, useState } from "react";
import { Box, Button } from "@mui/material";
import * as amplitude from "@amplitude/analytics-browser";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

import "../../globals.css";
import promptRandomizer from "@/_utils/PromptGenerator";
import { useStore } from "@/store";
import SimpleDialog from "@/_components/SimpleDialog";
import GenerationFormFields from "./(formComponents)/GenerationFormFields";
import GeneratingLoader from "./(formComponents)/GeneratingLoader";
import { startGeneration } from "@/_utils/ImagesUtils";
import { useGenerationPolling } from "@/_utils/useGenerationPolling";
import { selectRandomStyle } from "@/_utils/ImageStyles";

function nextGenerationNumber() {
  if (typeof window === "undefined") return 1;
  try {
    const prev = parseInt(
      window.sessionStorage.getItem("qrai_generation_count") || "0",
      10,
    );
    const next = Number.isNaN(prev) ? 1 : prev + 1;
    window.sessionStorage.setItem("qrai_generation_count", String(next));
    return next;
  } catch {
    return 1;
  }
}

function GenerateForm() {
  const {
    user,
    generateFormValues,
    setGenerateFormValues,
    openAlert,
    generatingImage,
    setGeneratingImage,
  } = useStore();

  const router = useRouter();
  const { data: session, update: updateSession } = useSession();

  const [dialogContent, setDialogContent] = useState({});
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitDisabled, setSubmitDisabled] = useState(true);
  const [jobId, setJobId] = useState(null);

  // Measure the form box's natural height while it's showing the fields, so
  // switching into the loading state can lock to that height instead of
  // resizing to fit the loader's own dimensions.
  const paperBoxRef = useRef(null);
  const [formHeight, setFormHeight] = useState(null);

  useEffect(() => {
    if (generatingImage) return;
    const el = paperBoxRef.current;
    if (!el) return;
    const measure = () => setFormHeight(el.getBoundingClientRect().height);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [generatingImage]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setGenerateFormValues({ ...generateFormValues, [name]: value });
  };

  useEffect(() => {
    if (generateFormValues.website && generateFormValues.prompt) {
      setSubmitDisabled(false);
    } else {
      setSubmitDisabled(true);
    }

    if (generateFormValues.prompt === "") {
      setGenerateFormValues({
        ...generateFormValues,
        prompt: promptRandomizer(),
      });
    }
  }, [generateFormValues]);

  const handleStyleChipClick = (item) => {
    setGenerateFormValues({
      ...generateFormValues,
      style_id: item.id,
      style_prompt: item.prompt,
      style_title: item.title,
      sd_model: item.sd_model,
      loras: item.loras ?? [],
      style_modifier: item.style_modifier ?? 0,
    });
  };

  const handleDialogClose = () => setDialogOpen(false);

  const handleInsufficientCredits = () => {
    setDialogContent({
      title: "Sign in to keep going",
      description: "Sign in to keep generating and save your images to your profile.",
      primaryActionText: "Sign In",
      primaryAction: () => router.push("/api/auth/signin"),
      secondaryActionText: "Close",
      secondaryAction: handleDialogClose,
    });
    setDialogOpen(true);
  };

  const updateGuestCredits = async (newCredits) => {
    try {
      const result = await updateSession({
        ...session,
        user: { ...session.user, credits: newCredits },
      });
      useStore.setState({ user: { ...user, credits: newCredits } });
      if (result?.user?.credits === newCredits) return true;
      console.error("updateGuestCredits: Credits update verification failed");
      return false;
    } catch (error) {
      console.error("updateGuestCredits: Error updating credits:", error);
      return false;
    }
  };

  const percent = useGenerationPolling(jobId, {
    onSucceeded: async (image) => {
      setGeneratingImage(false);
      openAlert("success", "Image generated successfully!");

      if (user?.is_guest) {
        const newCredits = user.credits - 1;
        const updated = await updateGuestCredits(newCredits);
        if (updated) {
          router.push(`/images/${image._id}?justGenerated=true`);
        } else {
          console.error("handleGenerate: Failed to update credits");
          openAlert("error", "Failed to update credits. Please refresh the page.");
        }
      } else {
        router.push(`/images/${image._id}?justGenerated=true`);
      }
    },
    onFailed: (error) => {
      console.error("handleGenerate: Generation error:", error);
      if (error.message === "InsufficientCredits") {
        handleInsufficientCredits();
      } else {
        openAlert("error", "Failed to generate image. Please try again.");
      }
      setGeneratingImage(false);
    },
  });

  const handleGenerate = async () => {
    setGeneratingImage(true);
    try {
      const generationNumber = nextGenerationNumber();
      amplitude.track("Generate Image", {
        userId: user?.id,
        url: generateFormValues.website,
        style_title: generateFormValues.style_title,
        qr_weight: generateFormValues.qr_weight,
        isGuest: user?.is_guest || false,
        generation_number: generationNumber,
        is_first_generation: generationNumber === 1,
      });

      let generateForm = generateFormValues;
      if (generateForm.style_id === 1) {
        const randomStyle = selectRandomStyle();
        generateForm = {
          ...generateFormValues,
          style_id: randomStyle.id,
          style_prompt: randomStyle.prompt,
          style_title: randomStyle.title,
          sd_model: randomStyle.sd_model,
          loras: randomStyle.loras ?? [],
          style_modifier: randomStyle.style_modifier ?? 0,
        };
      }

      const { job_id } = await startGeneration(generateForm, user);
      setJobId(job_id);
    } catch (error) {
      console.error("handleGenerate: Generation error:", error);
      if (error.message === "InsufficientCredits") {
        handleInsufficientCredits();
      } else {
        openAlert("error", "Failed to generate image. Please try again.");
      }
      setGeneratingImage(false);
    }
  };

  return (
    <Box sx={{ mt: 4, width: "100%", maxWidth: "720px" }}>
      <Box
        ref={paperBoxRef}
        sx={{
          backgroundColor: "background.paper",
          border: "1px solid",
          borderColor: "divider",
          borderRadius: "16px",
          width: "100%",
          boxSizing: "border-box",
          padding: generatingImage && formHeight ? 0 : { xs: 2, sm: 3 },
          ...(generatingImage && formHeight ? { height: `${formHeight}px` } : {}),
        }}
      >
        {generatingImage ? (
          <GeneratingLoader fill={Boolean(formHeight)} percent={percent} />
        ) : (
          <Box sx={{ width: "100%" }}>
            <GenerationFormFields
              values={generateFormValues}
              onFieldChange={handleInputChange}
              onStyleChange={handleStyleChipClick}
              onQrWeightChange={(val) =>
                setGenerateFormValues({ ...generateFormValues, qr_weight: val })
              }
              showQrWeight={false}
              urlDisabled={false}
            />

            <Button
              variant="contained"
              color="primary"
              size="large"
              fullWidth
              aria-label="generate"
              disabled={submitDisabled}
              onClick={() => handleGenerate()}
              sx={{
    "&:not(.Mui-disabled)": {
      background: "linear-gradient(90.29deg, #8DDF9C 39%, #73DBCC 99.75%)",
      boxShadow: "none",
    },
   mt: 3
  }}
            >
              Generate
            </Button>
          </Box>
        )}
      </Box>

      <SimpleDialog
        open={dialogOpen}
        onClose={handleDialogClose}
        title={dialogContent.title}
        description={dialogContent.description}
        primaryActionText={dialogContent.primaryActionText}
        primaryAction={dialogContent.primaryAction}
        secondaryActionText={dialogContent.secondaryActionText}
        secondaryAction={dialogContent.secondaryAction}
      />
    </Box>
  );
}

export default GenerateForm;
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test:frontend -- GenerateForm`
Expected: PASS (all 10 remaining tests — no assertions changed, since `GenerateForm`'s observable behavior is identical; only the polling implementation moved into the hook).

- [ ] **Step 5: Run the full frontend suite**

Run: `npm run test:frontend`
Expected: PASS (all suites except the one pre-existing, unrelated `imageStyles.test.js` LoRA-data failure — confirmed unrelated to this branch during the prior feature's merge).

- [ ] **Step 6: Commit**

```bash
git add "src/app/(main_pages)/generate/GenerateForm.js" src/__tests__/GenerateForm.test.js
git commit -m "refactor: move GenerateForm's poll loop into the shared useGenerationPolling hook"
```

---

## Task 3: `IteratePanel.js` — live progress via `startGeneration` + the shared hook

**Files:**
- Modify: `src/app/images/[imageId]/IteratePanel.js`
- Modify: `src/__tests__/IteratePanel.test.js`

**Interfaces:**
- Consumes: `useGenerationPolling` (Task 1), `startGeneration` (already exists in `src/_utils/ImagesUtils.js`)
- `iterateSession` (Zustand) gains `jobId: string` and `percent: number` fields, written by this component — no other consumer of `iterateSession` exists today.

- [ ] **Step 1: Update the `ImagesUtils` mock and rewrite the `generateImage`-based tests**

In `src/__tests__/IteratePanel.test.js`, replace:

```javascript
jest.mock('@/_utils/ImagesUtils', () => ({ generateImage: jest.fn() }))
```

```javascript
const mockGenerateImage = require('@/_utils/ImagesUtils').generateImage
```

with:

```javascript
jest.mock('@/_utils/ImagesUtils', () => ({
  startGeneration: jest.fn(),
  getGenerationProgress: jest.fn(),
}))
```

```javascript
const mockStartGeneration = require('@/_utils/ImagesUtils').startGeneration
const mockGetGenerationProgress = require('@/_utils/ImagesUtils').getGenerationProgress
```

Then replace the `beforeEach` block:

```javascript
beforeEach(() => {
  jest.clearAllMocks()
  mockGenerateImage.mockResolvedValue({ _id: 'newimg1' })
  storeState.iterateSession = null
})
```

with:

```javascript
beforeEach(() => {
  jest.clearAllMocks()
  mockStartGeneration.mockResolvedValue({ job_id: 'job1' })
  mockGetGenerationProgress.mockResolvedValue({ status: 'succeeded', percent: 100, result: { _id: 'newimg1' } })
  storeState.iterateSession = null
})
```

Then update every test that referenced `mockGenerateImage` to reference `mockStartGeneration` instead (the assertions themselves — checking the payload passed in — stay the same shape, since `startGeneration(payload)` takes the same single `payload` argument `generateImage(payload)` used to):

- `New Variation fires generateImage with seed -1` → rename to `New Variation fires startGeneration with seed -1`, replace `mockGenerateImage` with `mockStartGeneration` throughout its body.
- `New Variation fires generateImage with original image values` → rename to `New Variation fires startGeneration with original image values`, same replacement.
- `New Variation preserves the original image qr_weight` → same replacement, no rename needed (name doesn't mention `generateImage`).
- `Generate with style unchanged uses image.seed` (under `Iterate Generate seed logic`) → same replacement.
- `on success navigates to new image` (under `Navigation on success`) → same replacement (uses the default `mockStartGeneration`/`mockGetGenerationProgress` resolutions from `beforeEach`, no per-test override needed).

For example, the first one becomes:

```javascript
describe('New Variation', () => {
  it('New Variation fires startGeneration with seed -1', async () => {
    render(<IteratePanel image={IMAGE} isOpen={false} onOpen={onOpen} isOwner={true} />)
    fireEvent.click(screen.getByText('New Variation'))
    await waitFor(() => expect(mockStartGeneration).toHaveBeenCalledTimes(1))
    expect(mockStartGeneration.mock.calls[0][0].seed).toBe(-1)
  })

  it('New Variation fires startGeneration with original image values', async () => {
    render(<IteratePanel image={IMAGE} isOpen={false} onOpen={onOpen} isOwner={true} />)
    fireEvent.click(screen.getByText('New Variation'))
    await waitFor(() => expect(mockStartGeneration).toHaveBeenCalledTimes(1))
    const payload = mockStartGeneration.mock.calls[0][0]
    expect(payload.website).toBe('https://example.com')
    expect(payload.prompt).toBe('a beautiful forest')
  })

  it('New Variation preserves the original image qr_weight', async () => {
    render(<IteratePanel image={IMAGE} isOpen={false} onOpen={onOpen} isOwner={true} />)
    fireEvent.click(screen.getByText('New Variation'))
    await waitFor(() => expect(mockStartGeneration).toHaveBeenCalledTimes(1))
    expect(mockStartGeneration.mock.calls[0][0].qr_weight).toBe(IMAGE.qr_weight)
  })
})
```

```javascript
describe('Iterate Generate seed logic', () => {
  it('Generate with style unchanged uses image.seed', async () => {
    render(<IteratePanel image={IMAGE} isOpen={true} onOpen={onOpen} onClose={onClose} isOwner={true} />)
    fireEvent.click(screen.getByRole('button', { name: 'Generate' }))
    await waitFor(() => expect(mockStartGeneration).toHaveBeenCalledTimes(1))
    expect(mockStartGeneration.mock.calls[0][0].seed).toBe(42)
  })

  it.skip('Generate after style change uses seed -1', async () => {
    render(<IteratePanel image={IMAGE} isOpen={true} onOpen={onOpen} onClose={onClose} isOwner={true} />)
    expect(screen.getByRole('button', { name: 'Generate' })).toBeInTheDocument()
  })
})
```

```javascript
describe('Navigation on success', () => {
  it('on success navigates to new image', async () => {
    render(<IteratePanel image={IMAGE} isOpen={false} onOpen={onOpen} isOwner={true} />)
    fireEvent.click(screen.getByText('New Variation'))
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/images/newimg1'))
  })
})
```

Update the two failure-path tests in `Error state and recovery` — they simulated failure by rejecting the old single-call `generateImage`; now a failure comes from the poll resolving `"failed"`, so replace the `mockRejectedValueOnce` setup:

```javascript
it.skip('on failure shows inline error state', async () => {
    mockGenerateImage.mockRejectedValueOnce(new Error('GenerationFailed'))
    render(<IteratePanel image={IMAGE} isOpen={false} onOpen={onOpen} isOwner={true} />)
    fireEvent.click(screen.getByText('New Variation'))
    await waitFor(() => expect(mockGenerateImage).toHaveBeenCalled())
})
```
stays skipped, but update its body's mock reference for consistency (it's dead code either way since `it.skip` never runs, but keep it referencing real exports so the file doesn't reference a removed identifier):
```javascript
it.skip('on failure shows inline error state', async () => {
    mockGetGenerationProgress.mockResolvedValueOnce({ status: 'failed', error: 'GenerationFailed' })
    render(<IteratePanel image={IMAGE} isOpen={false} onOpen={onOpen} isOwner={true} />)
    fireEvent.click(screen.getByText('New Variation'))
    await waitFor(() => expect(mockStartGeneration).toHaveBeenCalled())
})
```

And:
```javascript
it('Back to image after iterate failure dismisses error and does not call onClose', async () => {
    mockGenerateImage.mockRejectedValueOnce(new Error('GenerationFailed'))
    render(<IteratePanel image={IMAGE} isOpen={true} onOpen={onOpen} onClose={onClose} isOwner={true} />)
    fireEvent.click(screen.getByRole('button', { name: 'Generate' }))
    await waitFor(() => expect(mockGenerateImage).toHaveBeenCalled())
    expect(onClose).not.toHaveBeenCalled()
})
```
becomes:
```javascript
it('Back to image after iterate failure dismisses error and does not call onClose', async () => {
    mockGetGenerationProgress.mockResolvedValueOnce({ status: 'failed', error: 'GenerationFailed' })
    render(<IteratePanel image={IMAGE} isOpen={true} onOpen={onOpen} onClose={onClose} isOwner={true} />)
    fireEvent.click(screen.getByRole('button', { name: 'Generate' }))
    await waitFor(() => expect(mockStartGeneration).toHaveBeenCalled())
    expect(onClose).not.toHaveBeenCalled()
})
```

The remaining `it.skip` in `Retry re-fires the same generateImage call` stays skipped as-is (already documented as untestable with the current selector-mock; out of scope for this task).

Finally, add two new tests — one confirming the bar renders and resumes polling for a persisted `jobId` (the core new behavior this task adds), appended after the `Navigation on success` describe block:

```javascript
describe('Resuming a generation after remount (modal reopened)', () => {
  it('shows the persisted percent immediately and resumes polling using the persisted jobId', async () => {
    storeState.iterateSession = {
      imageId: IMAGE._id,
      generating: true,
      error: false,
      payload: { website: IMAGE.content, prompt: IMAGE.prompt, seed: -1 },
      trigger: 'newVariation',
      jobId: 'job-resumed',
      percent: 40,
    }
    mockGetGenerationProgress.mockResolvedValueOnce({ status: 'succeeded', percent: 100, result: { _id: 'resumedimg' } })

    render(<IteratePanel image={IMAGE} isOpen={false} onOpen={onOpen} isOwner={true} />)

    // Bar shows the persisted percent immediately, before the first poll resolves.
    expect(screen.getByTestId('generation-progress-bar')).toHaveStyle({ width: '40%' })

    await waitFor(() => expect(mockGetGenerationProgress).toHaveBeenCalledWith('job-resumed'))
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/images/resumedimg'))
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test:frontend -- IteratePanel`
Expected: FAIL — `IteratePanel.js` still imports/calls the now-unmocked `generateImage` (no longer exported by the mock factory), so every generate-click test fails, and `generation-progress-bar` doesn't exist yet.

- [ ] **Step 3: Update `IteratePanel.js`**

In `src/app/images/[imageId]/IteratePanel.js`:

1. Replace the import:
   ```javascript
   import { generateImage } from "@/_utils/ImagesUtils";
   ```
   with:
   ```javascript
   import { startGeneration } from "@/_utils/ImagesUtils";
   import { useGenerationPolling } from "@/_utils/useGenerationPolling";
   ```

2. Add the hook call right after the existing `isActive`/`generating`/`generatingError` derivations (after line ~60, before `useEffect(() => { onGeneratingChange?.(isActive); }, ...)`):

   ```javascript
   const percent = useGenerationPolling(generating ? iterateSession?.jobId : null, {
     initialPercent: iterateSession?.percent ?? 0,
     onProgress: (p) => {
       if (iterateSession) {
         setIterateSession({ ...iterateSession, percent: p });
       }
     },
     onSucceeded: (newImage) => {
       clearIterateSession();
       router.push(`/images/${newImage._id}`);
     },
     onFailed: (err) => {
       if (iterateSession && isGenerationFailure(err)) {
         setIterateSession({ ...iterateSession, generating: false, error: true });
       } else {
         clearIterateSession();
       }
     },
   });
   ```

3. Replace `handleGenerate`:
   ```javascript
   const handleGenerate = async (trigger) => {
     const payload = buildPayload(trigger);
     setIterateSession({ imageId: image._id, generating: true, error: false, payload, trigger });
     try {
       const newImage = await generateImage(payload);
       clearIterateSession();
       router.push(`/images/${newImage._id}`);
     } catch (err) {
       if (isGenerationFailure(err)) {
         setIterateSession({ imageId: image._id, generating: false, error: true, payload, trigger });
       } else {
         clearIterateSession();
       }
     }
   };
   ```
   with:
   ```javascript
   const handleGenerate = async (trigger) => {
     const payload = buildPayload(trigger);
     try {
       const { job_id } = await startGeneration(payload);
       setIterateSession({ imageId: image._id, generating: true, error: false, payload, trigger, jobId: job_id, percent: 0 });
     } catch (err) {
       if (isGenerationFailure(err)) {
         setIterateSession({ imageId: image._id, generating: false, error: true, payload, trigger });
       } else {
         clearIterateSession();
       }
     }
   };
   ```

4. Replace `handleRetry`:
   ```javascript
   const handleRetry = async () => {
     if (!iterateSession?.payload) return;
     const { payload, trigger } = iterateSession;
     setIterateSession({ imageId: image._id, generating: true, error: false, payload, trigger });
     try {
       const newImage = await generateImage(payload);
       clearIterateSession();
       router.push(`/images/${newImage._id}`);
     } catch (err) {
       if (isGenerationFailure(err)) {
         setIterateSession({ imageId: image._id, generating: false, error: true, payload, trigger });
       } else {
         clearIterateSession();
       }
     }
   };
   ```
   with:
   ```javascript
   const handleRetry = async () => {
     if (!iterateSession?.payload) return;
     const { payload, trigger } = iterateSession;
     try {
       const { job_id } = await startGeneration(payload);
       setIterateSession({ imageId: image._id, generating: true, error: false, payload, trigger, jobId: job_id, percent: 0 });
     } catch (err) {
       if (isGenerationFailure(err)) {
         setIterateSession({ imageId: image._id, generating: false, error: true, payload, trigger });
       } else {
         clearIterateSession();
       }
     }
   };
   ```

5. Add the progress bar to the inline generating block. Find:
   ```javascript
               <Box sx={{ position: "absolute", bottom: 0, left: 0, right: 0, p: "20px 22px" }}>
                 <Typography variant="h5" sx={{ fontSize: "30px", lineHeight: 1.15, color: "primary.main" }}>
                   Generating another piece of art…
                 </Typography>
                 <Typography variant="body2" sx={{ mt: 0.75, lineHeight: 1.45 }}>
                   Hang tight, this takes about a minute.
                 </Typography>
               </Box>
             </Box>
           ) : (
   ```
   and add the bar `Box` right after the text `Box`, still inside the `position: "relative"` wrapper:
   ```javascript
               <Box sx={{ position: "absolute", bottom: 0, left: 0, right: 0, p: "20px 22px" }}>
                 <Typography variant="h5" sx={{ fontSize: "30px", lineHeight: 1.15, color: "primary.main" }}>
                   Generating another piece of art…
                 </Typography>
                 <Typography variant="body2" sx={{ mt: 0.75, lineHeight: 1.45 }}>
                   Hang tight, this takes about a minute.
                 </Typography>
               </Box>
               <Box
                 data-testid="generation-progress-bar"
                 sx={{
                   position: "absolute",
                   bottom: 0,
                   left: 0,
                   height: "3px",
                   width: `${Math.max(0, Math.min(100, percent))}%`,
                   backgroundColor: "primary.main",
                   boxShadow: (theme) => `0 0 8px 1px ${theme.palette.primary.main}`,
                   transition: "width 0.3s ease-out",
                 }}
               />
             </Box>
           ) : (
   ```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test:frontend -- IteratePanel`
Expected: PASS.

- [ ] **Step 5: Run the full frontend suite**

Run: `npm run test:frontend`
Expected: PASS (all suites except the one pre-existing, unrelated `imageStyles.test.js` LoRA-data failure).

- [ ] **Step 6: Manual visual check in the browser**

Start the dev server, open an existing image's detail page, click "New Variation" (or open the iterate form and click "Generate"), and confirm the thin green bar appears at the bottom edge of the inline generating box and grows as generation progresses. Then, mid-generation, close the image modal and reopen it — confirm the bar reappears at roughly the same (or a further-along) percent rather than resetting to 0%, and that the flow still completes and navigates to the new image once done.

- [ ] **Step 7: Commit**

```bash
git add "src/app/images/[imageId]/IteratePanel.js" src/__tests__/IteratePanel.test.js
git commit -m "feat: show live generation progress bar in IteratePanel's New Variation/Retry flow"
```
