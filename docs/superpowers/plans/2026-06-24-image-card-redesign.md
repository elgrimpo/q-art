# Image Card Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign `ImagesCard.js` and `SkeletonCard.js` to show a rich gallery card (image + like overlay + locked badge + URL + style chip + scannability ring widget) that matches the visual language of the existing detail modal/sidebar.

**Architecture:** `ImagesCard.js` is fully rewritten as a Box-based dark card (replacing the current MUI Card + below-image icon row). A self-contained `ScannabilityWidget` sub-component lives in the same file. `SkeletonCard.js` is updated to match the new two-row body structure. `page.js` gets a one-line grid breakpoint fix.

**Tech Stack:** Next.js 14 App Router, React 18, MUI v5 (`Box`, `Chip`, `Typography`, `Grid`, `Skeleton`), Jest + React Testing Library.

## Global Constraints

- MUI v5 only — no new UI library dependencies
- Dark theme: card background `#161616`, border `1px solid #252525`, hover border `#383838`
- Primary green: `#70E195` (`primary.main`), light: `#A5FFC3` (`primary.light`)
- Scannability thresholds and colors must exactly match `SCANNABILITY_LEVELS` in `src/app/images/[imageId]/ImageSidebar.js` — copy them verbatim, do not redefine separately
- `LikeButton` component (`src/_components/actions/LikeButton.js`) is reused unchanged — wrap in a positioned `Box`, do not modify its internals
- Right-click on the image must be prevented (`onContextMenu` handler)
- Style chip and scannability widget are conditionally hidden when their field is null/undefined

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `src/app/(main_pages)/mycodes/ImagesCard.js` | **Rewrite** | Card shell, image area, two overlays, card body with URL/style/scannability |
| `src/app/(main_pages)/mycodes/SkeletonCard.js` | **Update** | Match new card structure (image skeleton + two body rows) |
| `src/app/(main_pages)/mycodes/page.js` | **One-line edit** | `xl: 4` → `xl: 3` in Grid `columns` prop |
| `src/__tests__/ImagesCard.test.js` | **Create** | Rendering logic tests (locked badge, scannability, style chip visibility) |

---

## Task 1: Fix grid breakpoint

**Files:**
- Modify: `src/app/(main_pages)/mycodes/page.js`

**Interfaces:**
- Produces: nothing consumed by other tasks

- [ ] **Step 1: Edit the Grid columns prop**

In `page.js`, find the two `<Grid container ... columns={{ xs: 1, sm: 2, md: 2, lg: 3, xl: 4 }}>` elements (images list and skeleton list) and change both from `xl: 4` to `xl: 3`:

```jsx
// Both Grid containers change from:
columns={{ xs: 1, sm: 2, md: 2, lg: 3, xl: 4 }}
// to:
columns={{ xs: 1, sm: 2, md: 2, lg: 3, xl: 3 }}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/\(main_pages\)/mycodes/page.js
git commit -m "fix: cap gallery grid at 3 columns on xl viewports"
```

---

## Task 2: Rewrite ImagesCard.js

**Files:**
- Modify: `src/app/(main_pages)/mycodes/ImagesCard.js`
- Create: `src/__tests__/ImagesCard.test.js`

**Interfaces:**
- Consumes: `LikeButton` (from `@/_components/actions/LikeButton.js`) unchanged; `SkeletonCard` (from `./SkeletonCard.js`) — can run before or after Task 3, but the skeleton will look different until Task 3 is done
- Produces: `ImageCard` default export — props: `{ variant: "image"|"skeleton", image, index, handleCardClick, customLikeAction }`

- [ ] **Step 1: Write the failing tests**

Create `src/__tests__/ImagesCard.test.js`:

```js
import React from 'react'
import { render, screen } from '@testing-library/react'

jest.mock('@/store.js', () => ({
  useStore: () => ({ user: { _id: 'u1', is_guest: false } }),
}))
jest.mock('@/_components/actions/LikeButton.js', () => ({
  __esModule: true,
  default: () => <div data-testid="like-button" />,
}))
jest.mock('../app/(main_pages)/mycodes/SkeletonCard.js', () => ({
  __esModule: true,
  default: () => <div data-testid="skeleton-card" />,
}))

import ImageCard from '../app/(main_pages)/mycodes/ImagesCard'

const BASE = {
  _id: 'img1',
  watermarked_image_url: 'http://example.com/img.jpg',
  content: 'loremipsum.com',
  style_title: 'Doodle Art',
  unlocked: false,
  scannability_score: null,
  likes: [],
}

function renderCard(imageOverrides = {}) {
  return render(
    <ImageCard
      image={{ ...BASE, ...imageOverrides }}
      index={0}
      variant="image"
      handleCardClick={jest.fn()}
    />
  )
}

test('renders image with URL text', () => {
  renderCard()
  expect(screen.getByRole('img')).toBeInTheDocument()
  expect(screen.getByText('loremipsum.com')).toBeInTheDocument()
})

test('shows locked badge when unlocked is false', () => {
  renderCard({ unlocked: false })
  expect(screen.getByText(/locked preview/i)).toBeInTheDocument()
})

test('shows locked badge when unlocked is undefined', () => {
  renderCard({ unlocked: undefined })
  expect(screen.getByText(/locked preview/i)).toBeInTheDocument()
})

test('hides locked badge when unlocked is true', () => {
  renderCard({ unlocked: true })
  expect(screen.queryByText(/locked preview/i)).not.toBeInTheDocument()
})

test('shows scannability widget with score and label when score is present', () => {
  renderCard({ scannability_score: 92 })
  expect(screen.getByText('92')).toBeInTheDocument()
  expect(screen.getByText('Excellent')).toBeInTheDocument()
  expect(screen.getByText('scannability')).toBeInTheDocument()
})

test('shows correct label for each scannability tier', () => {
  const cases = [
    [90, 'Excellent'],
    [75, 'Good'],
    [55, 'Fair'],
    [30, 'Poor'],
    [10, 'Unscannable'],
  ]
  for (const [score, label] of cases) {
    const { unmount } = renderCard({ scannability_score: score })
    expect(screen.getByText(label)).toBeInTheDocument()
    unmount()
  }
})

test('hides scannability widget when score is null', () => {
  renderCard({ scannability_score: null })
  expect(screen.queryByText('scannability')).not.toBeInTheDocument()
})

test('hides style chip when style_title is null', () => {
  renderCard({ style_title: null })
  expect(screen.queryByText(/doodle art/i)).not.toBeInTheDocument()
})

test('renders skeleton card when variant is skeleton', () => {
  render(<ImageCard variant="skeleton" index={0} />)
  expect(screen.getByTestId('skeleton-card')).toBeInTheDocument()
  expect(screen.queryByRole('img')).not.toBeInTheDocument()
})

test('renders like button overlay', () => {
  renderCard()
  expect(screen.getByTestId('like-button')).toBeInTheDocument()
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd /path/to/codebase && npm run test:frontend -- --testPathPattern=ImagesCard --no-coverage
```

Expected: All tests FAIL with `Cannot find module '../app/(main_pages)/mycodes/ImagesCard'` or similar import errors since the component doesn't yet export the new design.

- [ ] **Step 3: Rewrite ImagesCard.js**

Replace the entire contents of `src/app/(main_pages)/mycodes/ImagesCard.js`:

```jsx
"use client";
import React from "react";
import { Box, Chip, Grid, Typography } from "@mui/material";
import LinkIcon from "@mui/icons-material/Link";
import LockIcon from "@mui/icons-material/Lock";

import LikeButton from "@/_components/actions/LikeButton.js";
import SkeletonCard from "./SkeletonCard.js";
import { useStore } from "@/store.js";

/* -------------------------------------------------------------------------- */
/*  Scannability thresholds — kept in sync with ImageSidebar.js               */
/* -------------------------------------------------------------------------- */
const SCANNABILITY_LEVELS = [
  { min: 85, label: "Excellent",   color: "#4A8C5C" },
  { min: 70, label: "Good",        color: "#8BC989" },
  { min: 50, label: "Fair",        color: "#D4B44A" },
  { min: 20, label: "Poor",        color: "#D97B7B" },
  { min: 0,  label: "Unscannable", color: "#8B2020" },
];

function getScannability(score) {
  return SCANNABILITY_LEVELS.find((l) => score >= l.min) ?? SCANNABILITY_LEVELS[4];
}

/* -------------------------------------------------------------------------- */
/*  ScannabilityWidget                                                         */
/* -------------------------------------------------------------------------- */
function ScannabilityWidget({ score }) {
  if (score == null) return null;
  const pct = Math.round(score);
  const { label, color } = getScannability(score);

  return (
    <Box
      sx={{
        flexShrink: 0,
        minWidth: "68px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "5px",
      }}
    >
      {/* Ring */}
      <Box
        sx={{
          position: "relative",
          width: 36,
          height: 36,
          borderRadius: "50%",
          background: `conic-gradient(${color} 0% ${pct}%, #2a2a2a ${pct}% 100%)`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Box
          sx={{
            position: "absolute",
            width: 25,
            height: 25,
            borderRadius: "50%",
            bgcolor: "#161616",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Typography sx={{ fontSize: "9px", fontWeight: 800, color, lineHeight: 1 }}>
            {pct}
          </Typography>
        </Box>
      </Box>

      {/* Label */}
      <Box sx={{ textAlign: "center", lineHeight: 1.25 }}>
        <Typography
          sx={{
            display: "block",
            fontSize: "11px",
            fontWeight: 700,
            fontFamily: "Roboto Serif, Georgia, serif",
            fontStyle: "italic",
            color,
          }}
        >
          {label}
        </Typography>
        <Typography sx={{ display: "block", fontSize: "10px", color: "#7d7d7d", fontWeight: 500 }}>
          scannability
        </Typography>
      </Box>
    </Box>
  );
}

/* -------------------------------------------------------------------------- */
/*  ImageCard                                                                  */
/* -------------------------------------------------------------------------- */
export default function ImageCard({ variant, image, index, handleCardClick, customLikeAction }) {
  const { user } = useStore();

  const preventRightClick = (e) => e.preventDefault();

  return (
    <Grid item xs={1} key={index}>
      {variant === "skeleton" ? (
        <SkeletonCard index={index} />
      ) : (
        <Box
          sx={{
            bgcolor: "#161616",
            borderRadius: "12px",
            overflow: "hidden",
            border: "1px solid #252525",
            cursor: "pointer",
            transition: "border-color 0.2s, transform 0.15s",
            "&:hover": { borderColor: "#383838", transform: "translateY(-2px)" },
          }}
        >
          {/* ── Image area ── */}
          <Box sx={{ position: "relative", width: "100%", aspectRatio: "1/1", overflow: "hidden" }}>
            <Box
              component="img"
              src={image.watermarked_image_url}
              alt={image.content}
              onClick={handleCardClick}
              onContextMenu={preventRightClick}
              sx={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
            />

            {/* Like button — top right */}
            <Box sx={{ position: "absolute", top: 10, right: 10 }}>
              <LikeButton image={image} user={user} customLikeAction={customLikeAction} />
            </Box>

            {/* Locked preview badge — bottom left */}
            {!image.unlocked && (
              <Box
                sx={{
                  position: "absolute",
                  bottom: 10,
                  left: 10,
                  display: "flex",
                  alignItems: "center",
                  gap: "5px",
                  bgcolor: "rgba(22,22,22,0.75)",
                  border: "1px solid #2e2e2e",
                  borderRadius: "999px",
                  pl: "8px",
                  pr: "10px",
                  py: "4px",
                  backdropFilter: "blur(6px)",
                }}
              >
                <LockIcon sx={{ fontSize: 11, color: "#7d7d7d" }} />
                <Typography
                  sx={{
                    fontSize: "10px",
                    fontWeight: 700,
                    letterSpacing: "0.08em",
                    color: "#7d7d7d",
                    textTransform: "uppercase",
                  }}
                >
                  Locked Preview
                </Typography>
              </Box>
            )}
          </Box>

          {/* ── Card body ── */}
          <Box
            sx={{
              p: "14px 16px 16px",
              display: "flex",
              alignItems: "stretch",
              gap: "14px",
            }}
          >
            {/* Left: URL + style chip */}
            <Box
              sx={{
                flex: 1,
                minWidth: 0,
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                gap: "8px",
              }}
            >
              {/* URL */}
              <Box sx={{ display: "flex", alignItems: "center", gap: "7px", overflow: "hidden" }}>
                <LinkIcon sx={{ fontSize: 15, color: "primary.main", flexShrink: 0 }} />
                <Typography
                  sx={{
                    fontFamily: "Georgia, 'Times New Roman', serif",
                    fontStyle: "italic",
                    fontSize: "15px",
                    color: "primary.main",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    lineHeight: 1.2,
                  }}
                >
                  {image.content}
                </Typography>
              </Box>

              {/* Style chip */}
              {image.style_title && (
                <Chip
                  label={image.style_title.toUpperCase()}
                  size="small"
                  sx={{
                    bgcolor: "#2a2a2a",
                    color: "primary.light",
                    fontWeight: 700,
                    fontSize: "11px",
                    letterSpacing: "0.08em",
                    height: "28px",
                    borderRadius: "999px",
                    alignSelf: "flex-start",
                  }}
                />
              )}
            </Box>

            {/* Right: scannability widget */}
            <ScannabilityWidget score={image.scannability_score} />
          </Box>
        </Box>
      )}
    </Grid>
  );
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npm run test:frontend -- --testPathPattern=ImagesCard --no-coverage
```

Expected: All 10 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/\(main_pages\)/mycodes/ImagesCard.js src/__tests__/ImagesCard.test.js
git commit -m "feat: redesign image card with scannability widget and overlays"
```

---

## Task 3: Update SkeletonCard.js

**Files:**
- Modify: `src/app/(main_pages)/mycodes/SkeletonCard.js`

**Interfaces:**
- Consumes: nothing from earlier tasks
- Produces: `SkeletonCard` default export — prop `{ index }` — renders the dark card shell with loading skeleton matching the new two-row body

- [ ] **Step 1: Rewrite SkeletonCard.js**

Replace the entire contents of `src/app/(main_pages)/mycodes/SkeletonCard.js`:

```jsx
import React from "react";
import { Box, Skeleton } from "@mui/material";

export default function SkeletonCard({ index }) {
  return (
    <Box
      sx={{
        bgcolor: "#161616",
        borderRadius: "12px",
        overflow: "hidden",
        border: "1px solid #252525",
      }}
      key={index}
    >
      {/* Image skeleton */}
      <Skeleton
        variant="rounded"
        width="100%"
        animation="wave"
        sx={{ aspectRatio: "1/1", height: 0, paddingTop: "100%", borderRadius: 0 }}
      />

      {/* Body skeleton */}
      <Box sx={{ p: "14px 16px 16px", display: "flex", alignItems: "center", gap: "14px" }}>
        {/* Left: url bar + style chip */}
        <Box sx={{ flex: 1, display: "flex", flexDirection: "column", gap: "8px" }}>
          <Skeleton variant="rounded" width="65%" height={18} animation="wave" />
          <Skeleton
            variant="rounded"
            width="42%"
            height={28}
            animation="wave"
            sx={{ borderRadius: "999px" }}
          />
        </Box>
        {/* Right: scannability ring placeholder */}
        <Skeleton variant="circular" width={36} height={36} animation="wave" />
      </Box>
    </Box>
  );
}
```

- [ ] **Step 2: Visually verify skeleton in dev**

```bash
npm run dev
```

Open `http://localhost:3000/explore` — on first load the skeleton cards should show: dark card, square image placeholder, then two loading bars + a circular ring placeholder in the body. No icon-row skeletons.

- [ ] **Step 3: Commit**

```bash
git add src/app/\(main_pages\)/mycodes/SkeletonCard.js
git commit -m "feat: update skeleton card to match new card layout"
```

---

## Done

All three tasks complete. Verify end-to-end:
1. `npm run test:frontend` — full suite passes
2. `npm run dev` — open `/mycodes` and `/explore`, confirm: 3-col grid at wide viewport, like button top-right, locked badge bottom-left of image, URL + style chip below, scannability ring right-aligned, skeleton cards match new layout
