# Swipeable use-case modal, shared across /generate and /styles/[slug] Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add swipe-to-close (down) and swipe-to-navigate (left/right) to the use-case enlarged-image modal on `/generate`, and reuse that same modal from a new clickable "Perfect For" grid on `/styles/[slug]`.

**Architecture:** Extract the `Dialog` currently inlined in `UseCasesCarousel.js` into a shared client component `UseCaseModal` (adds `react-swipeable` gesture handling). Both `UseCasesCarousel.js` and a new `PerfectForGrid.js` (which replaces the static, non-clickable Perfect For cards in `styles/[slug]/page.js`) render `UseCaseModal`, each owning its own open/index state and item list.

**Tech Stack:** Next.js 14 (App Router), React 18, MUI v5, `react-swipeable` (already a dependency, used in `ImageModal.js`), Jest + React Testing Library.

## Global Constraints

- Swipe gesture callbacks: `onSwipedDown` → close, `onSwipedLeft` → next, `onSwipedRight` → previous. Use `react-swipeable`'s default thresholds — do not pass custom `delta`/`preventScrollOnSwipe` config (matches `ImageModal.js`'s existing behavior).
- `UseCaseModal` item shape: `{ id, category, description, image, Icon }` (exact field names — `image` not `imageUrl`, `category` not `title`).
- Do not modify `UseCasesCarousel.test.js` — it is already fully broken on master (8/8 failing, pre-existing, unrelated design mismatch). Verify your changes don't add *new* failures beyond that baseline, but do not attempt to fix it.
- Do not touch `ImageModal.js` (`/mycodes`, `/explore`, style-page *Examples* carousel) — it already has swipe support from a prior fix. Out of scope.

---

### Task 1: Create shared `UseCaseModal` component

**Files:**
- Create: `src/_components/UseCaseModal.js`
- Test: `src/__tests__/UseCaseModal.test.js`

**Interfaces:**
- Consumes: nothing from other tasks.
- Produces: `export default function UseCaseModal({ open, items, index, onClose, onNext, onPrevious })` — a client component. `items` is `Array<{ id, category, description, image, Icon }>`. Renders an MUI `Dialog` with a full-bleed image, close button (`aria-label="Close"`), previous/next chevrons (`aria-label="Previous"` / `aria-label="Next"`), and a caption overlay showing `category`/`description`. Later tasks (2 and 3) import this from `@/_components/UseCaseModal`.

- [ ] **Step 1: Write the failing tests**

Create `src/__tests__/UseCaseModal.test.js`:

```js
import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'

let capturedSwipeConfig = null
jest.mock('react-swipeable', () => ({
  useSwipeable: (config) => {
    capturedSwipeConfig = config
    return {}
  },
}))

import UseCaseModal from '../_components/UseCaseModal'

const items = [
  { id: 'a', category: 'Restaurants', description: 'desc a', image: '/a.png', Icon: null },
  { id: 'b', category: 'Nightlife', description: 'desc b', image: '/b.png', Icon: null },
]

afterEach(() => {
  capturedSwipeConfig = null
})

test('renders the active item at the given index', () => {
  render(
    <UseCaseModal open items={items} index={0} onClose={jest.fn()} onNext={jest.fn()} onPrevious={jest.fn()} />
  )
  expect(screen.getByText('Restaurants')).toBeInTheDocument()
  expect(screen.getByText('desc a')).toBeInTheDocument()
})

test('renders nothing when closed', () => {
  render(
    <UseCaseModal open={false} items={items} index={0} onClose={jest.fn()} onNext={jest.fn()} onPrevious={jest.fn()} />
  )
  expect(screen.queryByText('Restaurants')).not.toBeInTheDocument()
})

test('swiping down calls onClose', () => {
  const onClose = jest.fn()
  render(<UseCaseModal open items={items} index={0} onClose={onClose} onNext={jest.fn()} onPrevious={jest.fn()} />)
  capturedSwipeConfig.onSwipedDown()
  expect(onClose).toHaveBeenCalledTimes(1)
})

test('swiping left calls onNext', () => {
  const onNext = jest.fn()
  render(<UseCaseModal open items={items} index={0} onClose={jest.fn()} onNext={onNext} onPrevious={jest.fn()} />)
  capturedSwipeConfig.onSwipedLeft()
  expect(onNext).toHaveBeenCalledTimes(1)
})

test('swiping right calls onPrevious', () => {
  const onPrevious = jest.fn()
  render(<UseCaseModal open items={items} index={0} onClose={jest.fn()} onNext={jest.fn()} onPrevious={onPrevious} />)
  capturedSwipeConfig.onSwipedRight()
  expect(onPrevious).toHaveBeenCalledTimes(1)
})

test('chevron clicks call onNext/onPrevious', () => {
  const onNext = jest.fn()
  const onPrevious = jest.fn()
  render(<UseCaseModal open items={items} index={0} onClose={jest.fn()} onNext={onNext} onPrevious={onPrevious} />)
  fireEvent.click(screen.getByLabelText('Next'))
  fireEvent.click(screen.getByLabelText('Previous'))
  expect(onNext).toHaveBeenCalledTimes(1)
  expect(onPrevious).toHaveBeenCalledTimes(1)
})

test('close button calls onClose', () => {
  const onClose = jest.fn()
  render(<UseCaseModal open items={items} index={0} onClose={onClose} onNext={jest.fn()} onPrevious={jest.fn()} />)
  fireEvent.click(screen.getByLabelText('Close'))
  expect(onClose).toHaveBeenCalledTimes(1)
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx jest src/__tests__/UseCaseModal.test.js`
Expected: FAIL — `Cannot find module '../_components/UseCaseModal'`

- [ ] **Step 3: Create the component**

Create `src/_components/UseCaseModal.js`:

```jsx
"use client";

import Image from "next/image";
import { Box, Typography, IconButton, Dialog } from "@mui/material";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import CloseIcon from "@mui/icons-material/Close";
import { useSwipeable } from "react-swipeable";

/**
 * Enlarged-image modal shared by the /generate use-case carousel and the
 * /styles/[slug] Perfect For grid. Each consumer owns its own open/index
 * state and passes in its own `items` list — this component is purely
 * presentational plus swipe gestures.
 */
export default function UseCaseModal({ open, items, index, onClose, onNext, onPrevious }) {
  const activeItem = open ? items[index] : null;

  // No scrollable content and no sidebar competing for horizontal gestures
  // here (unlike ImageModal.js), so a single handler covers close + nav.
  const swipeHandlers = useSwipeable({
    onSwipedDown: onClose,
    onSwipedLeft: onNext,
    onSwipedRight: onPrevious,
  });

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth={false}
      slotProps={{
        backdrop: { sx: { backgroundColor: "rgba(0,0,0,0.85)" } },
      }}
      PaperProps={{
        sx: {
          bgcolor: "transparent",
          backgroundImage: "none",
          boxShadow: "none",
          width: { xs: "100vw", md: "auto" },
          m: { xs: 0, md: 2 },
          "&.MuiDialog-paper": { maxWidth: "100vw", maxHeight: "100vh" },
        },
      }}
    >
      {activeItem && (
        <Box
          {...swipeHandlers}
          sx={{
            position: "relative",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: { xs: "100vw", md: "min(90vw, 640px)" },
            height: { xs: "100vh", md: "85vh" },
          }}
        >
          <IconButton
            onClick={onClose}
            aria-label="Close"
            sx={{
              position: "absolute",
              top: 8,
              right: 8,
              zIndex: 10,
              bgcolor: "rgba(0,0,0,0.45)",
              color: "primary.main",
              "&:hover": { bgcolor: "rgba(0,0,0,0.7)" },
            }}
          >
            <CloseIcon />
          </IconButton>

          <IconButton
            onClick={onPrevious}
            aria-label="Previous"
            sx={{
              position: "absolute",
              left: 8,
              top: "50%",
              transform: "translateY(-50%)",
              zIndex: 10,
              bgcolor: "rgba(0,0,0,0.45)",
              color: "primary.main",
              "&:hover": { bgcolor: "rgba(0,0,0,0.7)" },
            }}
          >
            <ChevronLeftIcon />
          </IconButton>

          <IconButton
            onClick={onNext}
            aria-label="Next"
            sx={{
              position: "absolute",
              right: 8,
              top: "50%",
              transform: "translateY(-50%)",
              zIndex: 10,
              bgcolor: "rgba(0,0,0,0.45)",
              color: "primary.main",
              "&:hover": { bgcolor: "rgba(0,0,0,0.7)" },
            }}
          >
            <ChevronRightIcon />
          </IconButton>

          <Box sx={{ position: "relative", width: "100%", height: "100%" }}>
            <Image
              src={activeItem.image}
              alt={`${activeItem.category} QR code example`}
              fill
              unoptimized
              style={{ objectFit: "contain" }}
              sizes="90vw"
            />
          </Box>

          <Box
            sx={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              background:
                "linear-gradient(0deg, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.4) 60%, transparent 100%)",
              px: 3,
              pb: 3,
              pt: 6,
              textAlign: "center",
            }}
          >
            <Typography variant="overline" sx={{ color: "primary.main", letterSpacing: "0.08em" }}>
              {activeItem.category}
            </Typography>
            <Typography variant="body1" sx={{ color: "white" }}>
              {activeItem.description}
            </Typography>
          </Box>
        </Box>
      )}
    </Dialog>
  );
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx jest src/__tests__/UseCaseModal.test.js`
Expected: PASS (7 tests)

- [ ] **Step 5: Commit**

```bash
git add src/_components/UseCaseModal.js src/__tests__/UseCaseModal.test.js
git commit -m "feat(ui): add shared swipeable UseCaseModal component"
```

---

### Task 2: Wire `UseCasesCarousel.js` to use `UseCaseModal`

**Files:**
- Modify: `src/app/(main_pages)/generate/UseCasesCarousel.js`

**Interfaces:**
- Consumes: `UseCaseModal` from Task 1 (`@/_components/UseCaseModal`), exact prop names `{ open, items, index, onClose, onNext, onPrevious }`.
- Produces: nothing new for later tasks — this is a leaf consumer.

- [ ] **Step 1: Replace the inline Dialog with `UseCaseModal`**

In `src/app/(main_pages)/generate/UseCasesCarousel.js`:

Change the imports at the top from:

```jsx
import { Box, Typography, IconButton, Dialog } from "@mui/material";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import CloseIcon from "@mui/icons-material/Close";
import { palette } from "@/_styles/palette";
```

to:

```jsx
import { Box, Typography, IconButton } from "@mui/material";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import { palette } from "@/_styles/palette";
import UseCaseModal from "@/_components/UseCaseModal";
```

(`Dialog` and `CloseIcon` were only used inside the block being removed; `IconButton`/`ChevronLeftIcon`/`ChevronRightIcon` stay — they're still used by the scroll-row prev/next buttons.)

Replace the entire `{/* Enlarged image modal */}` block — from `<Dialog` through its matching closing `</Dialog>` (currently the last JSX block before the component's closing `</Box>`) — with:

```jsx
      <UseCaseModal
        open={modalOpen}
        items={items}
        index={modalIndex ?? 0}
        onClose={closeModal}
        onNext={showNext}
        onPrevious={showPrevious}
      />
```

Leave everything else (shuffle effect, scroll row, keydown effect, `activeItem` variable — now unused and removable since `UseCaseModal` computes its own active item internally) unchanged except: delete the now-unused `const activeItem = modalOpen ? items[modalIndex] : null;` line.

- [ ] **Step 2: Run the frontend test suite to confirm no new breakage**

Run: `npx jest src/__tests__/UseCasesCarousel.test.js`
Expected: still 8 failed / 8 total (same pre-existing count as before this change — confirms this refactor didn't add new failures on top of the already-broken suite documented in the spec's Non-goals).

- [ ] **Step 3: Commit**

```bash
git add src/app/\(main_pages\)/generate/UseCasesCarousel.js
git commit -m "refactor(generate): use shared UseCaseModal in use-cases carousel"
```

---

### Task 3: Create `PerfectForGrid` and wire it into `/styles/[slug]`

**Files:**
- Create: `src/app/(marketing)/styles/[slug]/PerfectForGrid.js`
- Modify: `src/app/(marketing)/styles/[slug]/page.js`

**Interfaces:**
- Consumes: `UseCaseModal` from Task 1 (`@/_components/UseCaseModal`).
- Produces: `export default function PerfectForGrid({ perfectFor })` where `perfectFor` is `Array<{ title, description, icon, imageUrl }>` (the existing `lp.perfectFor` shape from `ImageStyles.js` — unchanged). Task 3's own `page.js` edit is the only consumer.

- [ ] **Step 1: Create `PerfectForGrid.js`**

Create `src/app/(marketing)/styles/[slug]/PerfectForGrid.js`:

```jsx
"use client";

import { useState } from "react";
import Image from "next/image";
import { Box, Typography } from "@mui/material";
import { STYLE_ICONS as ICONS } from "@/_utils/styleIcons";
import UseCaseModal from "@/_components/UseCaseModal";

// Different portrait ratios per column so the Perfect For cards stagger
// like a Pinterest board instead of lining up as uniform squares.
const PERFECT_FOR_RATIO = "4 / 5";

export default function PerfectForGrid({ perfectFor }) {
  const [modalIndex, setModalIndex] = useState(null);
  const modalOpen = modalIndex !== null;

  // Only the first 3 cards are ever displayed (Pinterest-style 3-column
  // masonry), so the modal only ever cycles through those same 3 — not
  // any cards beyond the slice.
  const displayedCards = perfectFor.slice(0, 3);
  const items = displayedCards.map((card) => ({
    id: card.title,
    category: card.title,
    description: card.description,
    image: card.imageUrl,
    Icon: ICONS[card.icon],
  }));

  const closeModal = () => setModalIndex(null);
  const showNext = () => setModalIndex((i) => (i + 1) % items.length);
  const showPrevious = () => setModalIndex((i) => (i - 1 + items.length) % items.length);

  return (
    <>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", sm: "repeat(3, 1fr)" },
          alignItems: "start",
          gap: 2,
        }}
      >
        {displayedCards.map((card, i) => {
          const Icon = ICONS[card.icon];
          return (
            <Box
              key={card.title}
              onClick={() => setModalIndex(i)}
              sx={{
                aspectRatio: PERFECT_FOR_RATIO,
                position: "relative",
                overflow: "hidden",
                borderRadius: 2,
                border: "1px solid",
                borderColor: "divider",
                backgroundColor: "background.paper",
                cursor: "pointer",
              }}
            >
              {card.imageUrl && (
                <Image
                  src={card.imageUrl}
                  alt={card.title}
                  fill
                  unoptimized
                  sizes="(max-width: 600px) 100vw, 33vw"
                  style={{ objectFit: "cover" }}
                />
              )}
              <Box
                sx={{
                  position: "absolute",
                  inset: 0,
                  background:
                    "linear-gradient(0deg, rgba(0,0,0,0.8), rgba(0,0,0,0) 30%)",
                }}
              />
              <Box sx={{ position: "absolute", left: 0, right: 0, bottom: 0, p: 2.5 }}>
                {Icon && <Icon sx={{ color: "primary.main", fontSize: 26, mb: 1 }} />}
                <Typography sx={{ fontWeight: 600, fontSize: "1rem", mb: 0.5, color: "text.primary" }}>
                  {card.title}
                </Typography>
                <Typography sx={{ fontSize: "0.85rem", color: "text.muted", lineHeight: 1.5 }}>
                  {card.description}
                </Typography>
              </Box>
            </Box>
          );
        })}
      </Box>

      <UseCaseModal
        open={modalOpen}
        items={items}
        index={modalIndex ?? 0}
        onClose={closeModal}
        onNext={showNext}
        onPrevious={showPrevious}
      />
    </>
  );
}
```

- [ ] **Step 2: Wire it into `page.js`**

In `src/app/(marketing)/styles/[slug]/page.js`, remove the now-unused constant (originally at the top of the file):

```jsx
// Different portrait ratios per column so the Perfect For cards stagger
// like a Pinterest board instead of lining up as uniform squares.
const PERFECT_FOR_RATIO = "4 / 5";
```

Add the import alongside the other local component imports:

```jsx
import PerfectForGrid from "./PerfectForGrid";
```

Replace the "Perfect for" section's grid `Box` — everything from the `<Box sx={{ display: "grid", ... }}>` that opens the masonry grid through its matching closing `</Box>` (the `{lp.perfectFor.slice(0, 3).map((card) => { ... })}` block sits inside it) — with:

```jsx
        <PerfectForGrid perfectFor={lp.perfectFor} />
```

Leave the surrounding `<Box sx={{ mb: 8 }}>` wrapper and the "Perfect For" `<Typography variant="h2">` heading in `page.js` unchanged — only the grid itself moves to the client component.

- [ ] **Step 3: Verify the build compiles**

Run: `npm run build`
Expected: build succeeds with no errors (in particular, no "PERFECT_FOR_RATIO is not defined" or unused-import lint failures).

- [ ] **Step 4: Commit**

```bash
git add src/app/\(marketing\)/styles/\[slug\]/PerfectForGrid.js src/app/\(marketing\)/styles/\[slug\]/page.js
git commit -m "feat(styles): make Perfect For cards open the shared UseCaseModal"
```

---

### Task 4: Manual verification in the browser

**Files:** none (verification only).

- [ ] **Step 1: Start the dev server and open `/generate`**

Use the `run` skill or `npm run dev`, then open `http://localhost:3000/generate` in the browser preview. Resize to a mobile viewport (375×812).

- [ ] **Step 2: Verify the use-case modal**

Click a use-case card to open the modal. Confirm:
- Close button and chevrons still work (click).
- The modal DOM contains the swipeable content `Box` (inspect via `read_page` — no visual-only check needed for swipe wiring, since Task 1's tests already cover the gesture-to-callback wiring).

- [ ] **Step 3: Verify the Perfect For grid on a style page**

Navigate to a rich style page, e.g. `http://localhost:3000/styles/ukiyo-e` (or whichever slug `stylesWithLandingPage()` returns first — check `src/_utils/ImageStyles.js` if unsure). Confirm the 3 "Perfect For" cards are now clickable, open the same modal, and chevrons cycle through exactly those 3 cards (previous from card 1 wraps to card 3).

- [ ] **Step 4: Take a screenshot for the record**

Use `computer { action: "screenshot" }` on both the open use-case modal and the open Perfect For modal to confirm visual parity with the pre-existing design.

---

## Self-Review Notes

- **Spec coverage:** swipe-to-close (Task 1, `onSwipedDown`) ✓; swipe-to-navigate (Task 1, `onSwipedLeft`/`onSwipedRight`) ✓; shared modal reused on `/generate` (Task 2) and `/styles/[slug]` (Task 3) ✓; test coverage for the new component (Task 1) ✓; explicit non-goal callout for `UseCasesCarousel.test.js` (Task 2, Step 2) ✓.
- **Type consistency:** `UseCaseModal` prop names (`open, items, index, onClose, onNext, onPrevious`) and item shape (`id, category, description, image, Icon`) are identical across Task 1's definition, Task 2's usage, and Task 3's usage.
- **No placeholders:** every step has complete code; no "TBD" or "similar to Task N" shortcuts.
