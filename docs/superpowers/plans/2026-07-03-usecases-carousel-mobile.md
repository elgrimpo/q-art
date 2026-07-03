# UseCasesCarousel Mobile Full-Bleed + Swipe Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** On mobile, make `UseCasesCarousel`'s card full width with square corners so the existing chevron buttons sit directly over the image; add swipe navigation at all breakpoints; stop auto-advance once the user manually navigates by any method.

**Architecture:** Four small, sequential edits to the same component: (1) CSS-only mobile sizing, (2) swipe gestures wired to the existing `navigate` function, (3) a `hasInteracted` flag that permanently stops the auto-advance `setInterval` once the user manually navigates via button, swipe, dot, or adjacent-card click, (4) manual browser verification.

**Tech Stack:** Next.js 14, React 18, MUI v5, `react-swipeable` (already a dependency, same library used in `ImageModal.js`), Jest + React Testing Library with fake timers for the auto-advance behavior.

## Global Constraints

- Only `src/app/(main_pages)/generate/UseCasesCarousel.js` and its test file change — no edits to `GuestGallery.js`, `page.js`, or any other component.
- Mobile (`xs`) card sizing: `width` goes from `78%` to `100%`, `borderRadius` from `8px` to `0`. The `md`+ coverflow effect (58% width, 12px radius, peeking side cards) is unchanged.
- Swipe gestures work at all breakpoints, using `useSwipeable` from `react-swipeable` (already a dependency) — no breakpoint gating on swipe itself.
- Once the user manually navigates (chevron click, swipe, dot click, or adjacent-card click), auto-advance stops permanently for that mount — it never resumes, independent of the existing hover-based `paused` state.
- Auto-advance interval duration (4500ms) is unchanged.

---

### Task 1: Mobile full-bleed card sizing

**Files:**
- Modify: `src/app/(main_pages)/generate/UseCasesCarousel.js`

**Interfaces:**
- Consumes: nothing from other tasks (first task).
- Produces: nothing new consumed by later tasks — this is a self-contained CSS value change on the card `Box`'s `sx` prop; Tasks 2/3 touch different lines in the same file.

**Why no automated test:** this is a pure CSS breakpoint-value change (`sx={{ width: {...}, borderRadius: {...} }}`). MUI compiles breakpoint objects into media-query-scoped CSS rules, and jsdom (the test environment used by this project's Jest config) has no real layout/viewport engine to evaluate `@media` queries — an assertion like `toHaveStyle({ width: '100%' })` would not reliably reflect which breakpoint "wins" in jsdom, and this codebase has no existing precedent for that kind of test. This is verified visually instead, in Task 4's manual browser check.

- [ ] **Step 1: Change the card sizing values**

In `src/app/(main_pages)/generate/UseCasesCarousel.js`, find the card `Box` inside the `USE_CASES.map(...)` block (currently around line 198-213):

```jsx
            <Box
              key={useCase.id}
              onClick={isAdjacent ? () => setCurrent(i) : undefined}
              sx={{
                position: "absolute",
                top: 0,
                bottom: 0,
                width: { xs: "78%", md: "58%" },
                borderRadius: { xs: "8px", md: "12px" },
                overflow: "hidden",
                cursor: isAdjacent ? "pointer" : "default",
                display: { xs: isCenter ? "block" : "none", md: "block" },
                transition:
                  "left 0.45s cubic-bezier(0.4,0,0.2,1), opacity 0.45s ease, transform 0.45s cubic-bezier(0.4,0,0.2,1)",
                ...pos,
              }}
            >
```

Change only the `width` and `borderRadius` lines:

```jsx
            <Box
              key={useCase.id}
              onClick={isAdjacent ? () => setCurrent(i) : undefined}
              sx={{
                position: "absolute",
                top: 0,
                bottom: 0,
                width: { xs: "100%", md: "58%" },
                borderRadius: { xs: 0, md: "12px" },
                overflow: "hidden",
                cursor: isAdjacent ? "pointer" : "default",
                display: { xs: isCenter ? "block" : "none", md: "block" },
                transition:
                  "left 0.45s cubic-bezier(0.4,0,0.2,1), opacity 0.45s ease, transform 0.45s cubic-bezier(0.4,0,0.2,1)",
                ...pos,
              }}
            >
```

(Leave `onClick={isAdjacent ? () => setCurrent(i) : undefined}` exactly as-is — Task 3 changes this line, not Task 1.)

- [ ] **Step 2: Run the full frontend test suite to confirm no regressions**

Run: `npm run test:frontend`
Expected: same pass/fail counts as before this change (this file has no existing tests, and no other test references `UseCasesCarousel`, so nothing should change). If the baseline had pre-existing unrelated failures, confirm the count and names of failures are identical — not different.

- [ ] **Step 3: Commit**

```bash
git add src/app/"(main_pages)"/generate/UseCasesCarousel.js
git commit -m "style: full-bleed UseCasesCarousel card on mobile"
```

---

### Task 2: Swipe gesture navigation

**Files:**
- Modify: `src/app/(main_pages)/generate/UseCasesCarousel.js`
- Test: `src/__tests__/UseCasesCarousel.test.js` (create)

**Interfaces:**
- Consumes: the existing `navigate(dir)` function (unchanged signature: `dir` is `1` or `-1`, wraps around `total`).
- Produces: nothing new consumed by later tasks — Task 3 modifies `navigate`'s internals (adds a `setHasInteracted(true)` call) but not its signature, so this task's `swipeHandlers` wiring stays valid unchanged.

- [ ] **Step 1: Write the failing tests**

Create `src/__tests__/UseCasesCarousel.test.js`:

```js
import React from 'react'
import { render, screen, act } from '@testing-library/react'

let capturedSwipeConfig = null
jest.mock('react-swipeable', () => ({
  useSwipeable: (config) => {
    capturedSwipeConfig = config
    return {}
  },
}))

import UseCasesCarousel from '../app/(main_pages)/generate/UseCasesCarousel'

afterEach(() => {
  capturedSwipeConfig = null
})

test('renders the first use case as the center card initially', () => {
  render(<UseCasesCarousel />)
  expect(screen.getByText('Restaurants & Food Trucks')).toBeInTheDocument()
})

test('swiping left advances to the next use case', () => {
  render(<UseCasesCarousel />)
  act(() => {
    capturedSwipeConfig.onSwipedLeft()
  })
  expect(screen.getByText('Music & Nightlife')).toBeInTheDocument()
})

test('swiping right goes to the previous use case, wrapping to the last', () => {
  render(<UseCasesCarousel />)
  act(() => {
    capturedSwipeConfig.onSwipedRight()
  })
  expect(screen.getByText('Apparel & Merch')).toBeInTheDocument()
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test:frontend -- UseCasesCarousel`
Expected: FAIL — `capturedSwipeConfig` is `null` (`useSwipeable` isn't imported/called yet, so the mock factory never runs and `capturedSwipeConfig.onSwipedLeft` throws "Cannot read properties of null").

- [ ] **Step 3: Wire up `useSwipeable`**

Add the import at the top of `src/app/(main_pages)/generate/UseCasesCarousel.js`, alongside the other imports:

```jsx
import { useSwipeable } from "react-swipeable";
```

Add inside the component, right after the existing `navigate` function definition:

```jsx
  const navigate = useCallback(
    (dir) => setCurrent((i) => (i + dir + total) % total),
    [total]
  );

  const swipeHandlers = useSwipeable({
    onSwipedLeft: () => navigate(1),
    onSwipedRight: () => navigate(-1),
  });
```

Spread `swipeHandlers` onto the "Carousel container" `Box` (the one with `position: "relative"` that wraps the buttons and cards):

```jsx
      <Box
        {...swipeHandlers}
        sx={{
          position: "relative",
          height: { xs: "60vw", sm: "50vw", md: "43vw" },
          maxHeight: { md: "520px" },
          overflow: "hidden",
        }}
      >
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test:frontend -- UseCasesCarousel`
Expected: PASS (all 3 tests)

- [ ] **Step 5: Commit**

```bash
git add src/app/"(main_pages)"/generate/UseCasesCarousel.js src/__tests__/UseCasesCarousel.test.js
git commit -m "feat: add swipe navigation to UseCasesCarousel"
```

---

### Task 3: Stop auto-advance after manual interaction

**Files:**
- Modify: `src/app/(main_pages)/generate/UseCasesCarousel.js`
- Test: `src/__tests__/UseCasesCarousel.test.js`

**Interfaces:**
- Consumes: `navigate(dir)` and the `swipeHandlers` from Task 2 (both still called the same way — this task only changes what `navigate` does internally).
- Produces: a `goTo(index)` function used by the dot-indicator and adjacent-card `onClick` handlers; `hasInteracted` state gating the auto-advance `useEffect`. Nothing later depends on these (last code task).

- [ ] **Step 1: Write the failing tests**

Update the top import line in `src/__tests__/UseCasesCarousel.test.js` to add `fireEvent`:

```js
import { render, screen, act, fireEvent } from '@testing-library/react'
```

Add these tests below the existing ones, same file:

```js
test('auto-advances to the next use case after 4.5s', () => {
  jest.useFakeTimers()
  render(<UseCasesCarousel />)
  expect(screen.getByText('Restaurants & Food Trucks')).toBeInTheDocument()

  act(() => {
    jest.advanceTimersByTime(4500)
  })
  expect(screen.getByText('Music & Nightlife')).toBeInTheDocument()
  jest.useRealTimers()
})

test('stops auto-advancing after a manual chevron click', () => {
  jest.useFakeTimers()
  render(<UseCasesCarousel />)

  fireEvent.click(screen.getByLabelText('Next'))
  expect(screen.getByText('Music & Nightlife')).toBeInTheDocument()

  act(() => {
    jest.advanceTimersByTime(10000)
  })
  expect(screen.getByText('Music & Nightlife')).toBeInTheDocument()
  jest.useRealTimers()
})

test('stops auto-advancing after a manual swipe', () => {
  jest.useFakeTimers()
  render(<UseCasesCarousel />)

  act(() => {
    capturedSwipeConfig.onSwipedLeft()
  })
  expect(screen.getByText('Music & Nightlife')).toBeInTheDocument()

  act(() => {
    jest.advanceTimersByTime(10000)
  })
  expect(screen.getByText('Music & Nightlife')).toBeInTheDocument()
  jest.useRealTimers()
})

test('stops auto-advancing after a dot indicator click', () => {
  jest.useFakeTimers()
  render(<UseCasesCarousel />)

  fireEvent.click(screen.getByLabelText('Go to Weddings & Stationery'))
  expect(screen.getByText('Weddings & Stationery')).toBeInTheDocument()

  act(() => {
    jest.advanceTimersByTime(10000)
  })
  expect(screen.getByText('Weddings & Stationery')).toBeInTheDocument()
  jest.useRealTimers()
})

test('stops auto-advancing after clicking an adjacent card', () => {
  jest.useFakeTimers()
  render(<UseCasesCarousel />)

  fireEvent.click(screen.getByAltText('Music & Nightlife QR code example'))
  expect(screen.getByText('Music & Nightlife')).toBeInTheDocument()

  act(() => {
    jest.advanceTimersByTime(10000)
  })
  expect(screen.getByText('Music & Nightlife')).toBeInTheDocument()
  jest.useRealTimers()
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test:frontend -- UseCasesCarousel`
Expected: FAIL on the last 4 tests — nothing currently stops the 4500ms interval after a manual navigation, so each will show `'Apparel & Merch'` or a further-advanced card instead of staying on `'Music & Nightlife'` / `'Weddings & Stationery'` after `jest.advanceTimersByTime(10000)` (10s = 2 more auto-advance ticks). The first new test (auto-advance after 4.5s) should already PASS since that behavior already exists.

- [ ] **Step 3: Add `hasInteracted` state and wire it into every manual navigation path**

In `src/app/(main_pages)/generate/UseCasesCarousel.js`, change the state declarations:

```jsx
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);
  const total = USE_CASES.length;
```

to:

```jsx
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const total = USE_CASES.length;
```

Change the auto-advance effect's guard:

```jsx
  useEffect(() => {
    if (paused) return;
    const t = setInterval(() => setCurrent((i) => (i + 1) % total), 4500);
    return () => clearInterval(t);
  }, [paused, total]);
```

to:

```jsx
  useEffect(() => {
    if (paused || hasInteracted) return;
    const t = setInterval(() => setCurrent((i) => (i + 1) % total), 4500);
    return () => clearInterval(t);
  }, [paused, hasInteracted, total]);
```

Change `navigate` (from Task 2) and add `goTo`:

```jsx
  const navigate = useCallback(
    (dir) => setCurrent((i) => (i + dir + total) % total),
    [total]
  );
```

to:

```jsx
  const navigate = useCallback(
    (dir) => {
      setHasInteracted(true);
      setCurrent((i) => (i + dir + total) % total);
    },
    [total]
  );

  const goTo = useCallback((index) => {
    setHasInteracted(true);
    setCurrent(index);
  }, []);
```

- [ ] **Step 4: Route the dot indicators and adjacent-card click through `goTo`, with accessible labels**

Change the card `Box`'s `onClick` (from Task 1, currently `onClick={isAdjacent ? () => setCurrent(i) : undefined}`):

```jsx
              onClick={isAdjacent ? () => setCurrent(i) : undefined}
```

to:

```jsx
              onClick={isAdjacent ? () => goTo(i) : undefined}
```

Change the dot indicators block:

```jsx
      {/* Dot indicators */}
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 1, mt: 3 }}>
        {USE_CASES.map((_, i) => (
          <Box
            key={i}
            onClick={() => setCurrent(i)}
            sx={{
              width: i === current ? 24 : 8,
              height: 8,
              borderRadius: "4px",
              bgcolor: i === current ? "primary.main" : "rgba(255,255,255,0.22)",
              cursor: "pointer",
              transition: "width 0.3s ease, background-color 0.3s ease",
            }}
          />
        ))}
      </Box>
```

to:

```jsx
      {/* Dot indicators */}
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 1, mt: 3 }}>
        {USE_CASES.map((useCase, i) => (
          <Box
            key={i}
            role="button"
            aria-label={`Go to ${useCase.category}`}
            onClick={() => goTo(i)}
            sx={{
              width: i === current ? 24 : 8,
              height: 8,
              borderRadius: "4px",
              bgcolor: i === current ? "primary.main" : "rgba(255,255,255,0.22)",
              cursor: "pointer",
              transition: "width 0.3s ease, background-color 0.3s ease",
            }}
          />
        ))}
      </Box>
```

(Note: the `.map` callback's first parameter changes from `_` to `useCase` since the label now needs `useCase.category`.)

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm run test:frontend -- UseCasesCarousel`
Expected: PASS (all 8 tests)

- [ ] **Step 6: Commit**

```bash
git add src/app/"(main_pages)"/generate/UseCasesCarousel.js src/__tests__/UseCasesCarousel.test.js
git commit -m "feat: stop UseCasesCarousel auto-advance after manual interaction"
```

---

### Task 4: Manual verification in the browser

**Files:** none (no code changes — verification only)

- [ ] **Step 1: Start the dev server**

Start Next.js and open `/generate`. The `UseCasesCarousel` section ("Made to be seen. Made to be scanned.") is below the hero banner — scroll down to it.

- [ ] **Step 2: Resize to a mobile viewport (375×812) and verify**

- The center card image spans the full screen width edge-to-edge, with square (not rounded) corners.
- The left/right chevron buttons sit directly on top of the image (not floating in a side margin).
- Swiping left/right on the image advances/retreats through the 7 use cases.
- After swiping once, wait at least 10 seconds and confirm the carousel does NOT auto-advance further — it stays on the swiped-to card.
- Reload the page (resets `hasInteracted`), and this time wait without touching anything — confirm it DOES auto-advance to the next card after ~4.5s.
- Reload again, tap a dot indicator — confirm it jumps to that use case and auto-advance then stops (wait 10s to confirm no further movement).
- Tap a chevron button — confirm it navigates and stops auto-advance the same way.

- [ ] **Step 3: Resize to a desktop viewport (1280×800) and verify no regression**

- The coverflow effect (peeking adjacent cards on either side of the center card) still renders as before.
- Card width/corner radius at this breakpoint are unchanged (58% width, 12px radius).
- Clicking a peeking adjacent card still jumps to it as the new center card.
- Chevron buttons still work.

- [ ] **Step 4: Check the browser console for errors**

Confirm no new console errors/warnings were introduced.
