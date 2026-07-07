# /mycodes Empty-State Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the bare "You don't have any images yet!" heading on `/mycodes` with a full empty-state screen (illustration + heading + subtitle + CTA + Explore link) matching the approved mockup.

**Architecture:** One new presentational component, `NoCodesEmptyState.js`, added to `src/app/(main_pages)/mycodes/` alongside its sibling sub-components (`ImagesCard`, `ImageModal`, `FilterPanelDesktop/Mobile`, `AdminMyCodesMenu`). `page.js`'s existing empty-state conditional branch swaps its `<Typography>` for `<NoCodesEmptyState />`; nothing else in that branch changes.

**Tech Stack:** Next.js 14 (`next/image`, `next/link`), MUI v5 (`Box`, `Typography`, `Button`, `@mui/icons-material`), Jest + React Testing Library.

## Global Constraints

- Heading copy: "No codes yet. Let's create your **first** one." — "first" in `primary.main` green, rest in default text color.
- Subtitle copy: "Turn your ideas into stunning, scannable art." — the mockup's second line ("in just a few seconds") is dropped entirely.
- Primary CTA label: "Generate Your First Code", links to `/generate`.
- Secondary link label: "Explore images" (renamed from the mockup's "Explore Community"), links to `/explore`.
- Illustration source: `design/assets/noImages.png` (1536×1024px), used as-is — no inline SVG rebuild.
- No changes to `AdminMyCodesMenu`, filters, the populated-gallery view, or the branch condition (`images.length === 0 && page === -1 && myCodesOnly`) in `page.js`.

---

### Task 1: Add the illustration asset and build `NoCodesEmptyState`

**Files:**
- Create: `public/mycodes-empty-state.png` (copy of `design/assets/noImages.png`)
- Create: `src/app/(main_pages)/mycodes/NoCodesEmptyState.js`
- Test: `src/__tests__/NoCodesEmptyState.test.js`

**Interfaces:**
- Consumes: nothing (no props — this is a static, self-contained component)
- Produces: `NoCodesEmptyState` — default export, a React component with no props, rendering the illustration, heading, subtitle, primary CTA (`<a href="/generate">` containing text "Generate Your First Code"), and secondary link (`<a href="/explore">` containing text "Explore images"). Consumed by Task 2's edit to `page.js`.

- [ ] **Step 1: Copy the design asset into `public/`**

```bash
cp "design/assets/noImages.png" "public/mycodes-empty-state.png"
```

(Run from the `codebase/` directory, the git repo root. `design/assets/` sits one level up, outside the Next.js project, so the file must be copied into `public/` to be servable.)

- [ ] **Step 2: Write the failing test**

Create `src/__tests__/NoCodesEmptyState.test.js`:

```javascript
import React from 'react'
import { render, screen } from '@testing-library/react'
import NoCodesEmptyState from '../app/(main_pages)/mycodes/NoCodesEmptyState'

test('shows the "No codes yet" heading with "first" highlighted', () => {
  render(<NoCodesEmptyState />)
  expect(screen.getByText(/no codes yet/i)).toBeInTheDocument()
  expect(screen.getByText('first')).toBeInTheDocument()
})

test('shows the subtitle without the "in just a few seconds" line', () => {
  render(<NoCodesEmptyState />)
  expect(
    screen.getByText('Turn your ideas into stunning, scannable art.')
  ).toBeInTheDocument()
  expect(screen.queryByText(/in just a few seconds/i)).not.toBeInTheDocument()
})

test('primary CTA links to /generate and reads "Generate Your First Code"', () => {
  render(<NoCodesEmptyState />)
  const cta = screen.getByRole('link', { name: /generate your first code/i })
  expect(cta).toHaveAttribute('href', '/generate')
})

test('secondary link reads "Explore images" (not "Explore Community") and links to /explore', () => {
  render(<NoCodesEmptyState />)
  const exploreLink = screen.getByRole('link', { name: /explore images/i })
  expect(exploreLink).toHaveAttribute('href', '/explore')
  expect(screen.queryByText(/explore community/i)).not.toBeInTheDocument()
})
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npm run test:frontend -- NoCodesEmptyState`
Expected: FAIL with "Cannot find module '../app/(main_pages)/mycodes/NoCodesEmptyState'"

- [ ] **Step 4: Write the component**

Create `src/app/(main_pages)/mycodes/NoCodesEmptyState.js`:

```javascript
"use client";
import Image from "next/image";
import Link from "next/link";
import { Box, Typography, Button } from "@mui/material";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";

function NoCodesEmptyState() {
  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
        maxWidth: "420px",
      }}
    >
      <Box sx={{ width: { xs: "220px", sm: "280px" }, mb: 3 }}>
        <Image
          src="/mycodes-empty-state.png"
          alt=""
          width={1536}
          height={1024}
          style={{ width: "100%", height: "auto" }}
          priority
        />
      </Box>

      <Typography variant="h5" component="h2" sx={{ mb: 1 }}>
        No codes yet. Let&apos;s create your{" "}
        <Box component="span" sx={{ color: "primary.main" }}>
          first
        </Box>{" "}
        one.
      </Typography>

      <Typography variant="body1" sx={{ color: "text.secondary", mb: 4 }}>
        Turn your ideas into stunning, scannable art.
      </Typography>

      <Button
        component={Link}
        href="/generate"
        variant="contained"
        color="primary"
        size="large"
        sx={{ mb: 3 }}
      >
        + Generate Your First Code
      </Button>

      <Button
        component={Link}
        href="/explore"
        variant="text"
        color="primary"
        startIcon={<AutoAwesomeIcon fontSize="small" />}
      >
        Explore images
      </Button>
    </Box>
  );
}

export default NoCodesEmptyState;
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npm run test:frontend -- NoCodesEmptyState`
Expected: PASS (4 tests)

- [ ] **Step 6: Commit**

```bash
git add public/mycodes-empty-state.png src/app/\(main_pages\)/mycodes/NoCodesEmptyState.js src/__tests__/NoCodesEmptyState.test.js
git commit -m "feat: add NoCodesEmptyState component for /mycodes empty state"
```

---

### Task 2: Wire `NoCodesEmptyState` into `page.js`

**Files:**
- Modify: `src/app/(main_pages)/mycodes/page.js:236-238`
- Modify: `src/__tests__/MyCodesPage.test.js` (4 assertions currently checking the old copy)

**Interfaces:**
- Consumes: `NoCodesEmptyState` (default export, no props) from Task 1.
- Produces: n/a — this is the integration point; nothing downstream depends on it.

- [ ] **Step 1: Update the failing assertions in `MyCodesPage.test.js` first (TDD: red)**

The old copy ("you don't have any images yet") appears in 4 places. Replace each with the new heading text. Open `src/__tests__/MyCodesPage.test.js` and make these exact replacements:

At line 79-81 (test `'shows the empty-state message when the user has no images'`):

```javascript
  expect(
    await screen.findByText(/no codes yet/i)
  ).toBeInTheDocument()
```

At line 129-131 (test `'under StrictMode, eventually shows the empty-state message...'`):

```javascript
  expect(
    await screen.findByText(/no codes yet/i, {}, { timeout: 3000 })
  ).toBeInTheDocument()
```

At line 144-146 (test `'admin: defaults to "My codes" on, and toggling switches to other users\' codes'`, first assertion):

```javascript
  expect(
    await screen.findByText(/no codes yet/i)
  ).toBeInTheDocument()
```

At line 158-162 (same test, second assertion — confirms the empty state disappears after toggling):

```javascript
  await waitFor(() =>
    expect(
      screen.queryByText(/no codes yet/i)
    ).not.toBeInTheDocument()
  )
```

- [ ] **Step 2: Run the suite to verify these 3 tests now fail**

Run: `npm run test:frontend -- MyCodesPage`
Expected: FAIL — the 3 tests touched above fail because `page.js` still renders the old copy; other tests in the file still pass.

- [ ] **Step 3: Replace the empty-state heading in `page.js`**

In `src/app/(main_pages)/mycodes/page.js`, add the import alongside the other sibling-component imports (near line 16):

```javascript
import AdminMyCodesMenu from "./AdminMyCodesMenu";
import NoCodesEmptyState from "./NoCodesEmptyState";
```

Then replace the heading at lines 236-238:

```javascript
      <Typography variant="h5" component="h2" sx={{ textAlign: "center" }}>
        You don't have any images yet!
      </Typography>
```

with:

```javascript
      <NoCodesEmptyState />
```

- [ ] **Step 4: Run the full `MyCodesPage` suite to verify it passes**

Run: `npm run test:frontend -- MyCodesPage`
Expected: PASS (all tests, including the 3 updated above)

- [ ] **Step 5: Run the full frontend test suite to check for regressions**

Run: `npm run test:frontend`
Expected: PASS (no other test file references the old "you don't have any images yet" copy)

- [ ] **Step 6: Commit**

```bash
git add src/app/\(main_pages\)/mycodes/page.js src/__tests__/MyCodesPage.test.js
git commit -m "feat: render NoCodesEmptyState on /mycodes when the user has no images"
```

---

### Task 3: Manual verification in the browser

**Files:** none (verification only)

- [ ] **Step 1: Start the dev server**

Run: `npm run dev`

- [ ] **Step 2: Sign in as a user with zero images and load `/mycodes`**

Confirm visually:
- Illustration renders (easel + QR-viewfinder graphic)
- Heading reads "No codes yet. Let's create your **first** one." with "first" in green
- Subtitle reads "Turn your ideas into stunning, scannable art." (single line, no "in just a few seconds")
- Green pill button reads "+ Generate Your First Code" and navigates to `/generate` on click
- Text link reads "Explore images" (not "Explore Community") and navigates to `/explore` on click
- Layout is centered and readable at both mobile (`xs`) and desktop widths

- [ ] **Step 3: If admin, confirm the admin-menu overlay still works**

Toggle "My codes" off/on via the admin menu (icon on desktop, FAB on mobile) — confirm the empty state / gallery swap still behaves as before (unaffected by this change).
