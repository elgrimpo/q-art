# /mycodes Empty-State Redesign

## Problem

`MyCodes` (`src/app/(main_pages)/mycodes/page.js:199-239`) renders a bare `<Typography variant="h5">You don't have any images yet!</Typography>` when a logged-in user has zero images (`images.length === 0 && page === -1 && myCodesOnly`). There's no illustration, no explanation of what the product does, and no call to action — a dead end for a brand-new user's first visit.

## Goal

Replace the bare heading with a full empty-state screen matching the approved mockup (`design/assets/noImages.png`): illustration, heading, subtitle, primary CTA to generate, and a secondary link to Explore.

## Scope

Touches `src/app/(main_pages)/mycodes/page.js` (swaps the empty-state JSX for a new component) and adds one new file, `src/app/(main_pages)/mycodes/NoCodesEmptyState.js`. No changes to the non-empty gallery view, filters, `AdminMyCodesMenu`, or any other page.

## Design

### New component: `NoCodesEmptyState.js`

A new file alongside the other `mycodes/` sub-components (`ImagesCard`, `ImageModal`, `FilterPanelDesktop/Mobile`, `AdminMyCodesMenu`), each already a separate file for one concern.

Renders, centered, top to bottom:

1. **Illustration** — `design/assets/noImages.png` via `next/image` (static import; Next's image optimizer handles compression/responsive sizing regardless of the source file's size). No inline SVG rebuild — the mockup's asset is used as-is.
2. **Heading** — "No codes yet. Let's create your **first** one." — `variant="h5"`/`h2` element (matches current heading level), with "first" styled in `theme.palette.primary.main` (green), rest in `theme.palette.text.primary` (white), matching the mockup's two-tone heading.
3. **Subtitle** — "Turn your ideas into stunning, scannable art" — `theme.palette.text.secondary`, one line (dropping the mockup's second line, "in just a few seconds," per explicit request).
4. **Primary CTA** — pill button, `variant="contained"` `color="primary"` `size="large"` (picks up the existing `containedPrimary` + `sizeLarge` theme overrides — solid green fill, dark bold text, 56px pill), a leading `+` and label "Generate Your First Code", wrapped in `next/link` to `/generate`.
5. **Secondary link** — sparkle icon + "Explore images" (renamed from the mockup's "Explore Community"), green text, no button chrome, wrapped in `next/link` to `/explore` (same destination the navbar's Explore tab already uses).

### Integration in `page.js`

The existing conditional branch (lines 199-239) that currently returns the bare `<Box><Typography>...</Typography></Box>` is replaced with:

```jsx
<Box sx={{ /* same centering/padding wrapper as today */ }}>
  {/* existing isAdmin overlay logic, unchanged */}
  <NoCodesEmptyState />
</Box>
```

The `isAdmin`/`isMobile` admin-menu-overlay block (lines 213-235) and the outer `Box`'s positioning/padding stay exactly as they are today — only the `<Typography>` line is replaced by the new component. The branch condition itself (`images.length === 0 && page === -1 && myCodesOnly`) is unchanged.

### Responsive behavior

No separate mobile variant. The content is centered and stacks naturally via the existing outer `Box`'s flex column layout, the same way the current single-variant empty state already handles both breakpoints.

## Out of scope / explicitly not doing

- No change to what happens when an admin toggles to "other users' codes" and that list is empty (falls through to the existing gallery-grid branch, unaffected by this change).
- No change to `AdminMyCodesMenu`, filters, or the populated-gallery view.
- No inline SVG recreation of the illustration.
- No change to the "in just a few seconds" phrase's presence in any other part of the app — only this one screen.
