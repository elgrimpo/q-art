# Image Card Redesign

**Date:** 2026-06-24
**Scope:** `ImagesCard.js` + `SkeletonCard.js` in `src/app/(main_pages)/mycodes/` (serves both `/mycodes` and `/explore` via the next.config rewrite)

## Goal

Replace the current minimal card (image + like/copy/share icons below) with a richer, gallery-style card that surfaces the scannability score, destination URL, style, and locked state — while keeping the visual language consistent with the existing image detail modal/sidebar.

---

## Approved Design (v4)

### Card shell

- Background `#161616`, `border-radius: 12px`, `border: 1px solid #252525`
- Hover: border lightens to `#383838`, card lifts `translateY(-2px)`
- `overflow: hidden` so image fills flush to the top edge
- No extra padding around the image — image bleeds to card edges

### Image area

Square aspect ratio (`aspect-ratio: 1/1`). Three overlays:

| Position | Element | Notes |
|---|---|---|
| Top-right | **Like button** | MUI `Chip` (`color="secondary"`, `height: 32px`, `borderRadius: 24px`). Filled heart + count in pink `#FF8585` when liked; outlined heart + count in `primary.main` `#70E195` when not liked. Reuses existing `LikeButton` component. |
| Bottom-left | **Locked Preview badge** | Only shown when `!image.unlocked` (covers `false` and `undefined`). Dark pill: `background: rgba(22,22,22,0.75)`, `border: 1px solid #2e2e2e`, `backdrop-filter: blur(6px)`, `color: #7d7d7d`, lock icon + "LOCKED PREVIEW" uppercase. Hidden on unlocked images. |

Copy and Share buttons are removed from the card surface — they remain in the detail modal only.

Right-click on the image is prevented (`onContextMenu` handler) as in the current card.

**Null/missing fields:** Style chip is hidden when `style_title` is null or undefined. Scannability widget is hidden when `scannability_score` is null. Both the URL and style chip columns still render even if only one field is present.

### Card body (below image)

`padding: 14px 16px 16px`. Two-column flex layout (`align-items: stretch`, `gap: 14px`):

**Left column** (`flex: 1`, stacks vertically with `gap: 8px`):
- **URL row** — link icon (`LinkIcon`, 15px, `#70E195`) + destination URL in italic Georgia serif, 15px, `color: primary.main` (`#70E195`), truncated with ellipsis.
- **Style chip** — MUI `Chip` matching sidebar style exactly: `bgcolor: #2a2a2a`, `color: primary.light` (`#A5FFC3`), `fontWeight: 700`, `fontSize: 11px`, `letterSpacing: 0.08em`, `height: 28px`, `borderRadius: 999px`, label in uppercase.

**Right column** (fixed, `flex-shrink: 0`, centered, `~68px` wide) — **Scannability widget**:
- Circular ring: 36px diameter, `conic-gradient` filled to the score percentage in the score color, remainder `#2a2a2a`. Inner circle (25px) cut from card background `#161616`, score number centered inside (9px, `fontWeight: 800`, score color).
- Below ring: score label ("Excellent" / "Good" / "Fair" / "Poor" / "Unscannable") in italic serif, 11px, score color.
- Below label: "scannability" in 10px, `#7d7d7d`.
- Hidden entirely when `image.scannability_score == null`.

Scannability color thresholds (match `SCANNABILITY_LEVELS` in `ImageSidebar.js`):

| Score | Label | Color |
|---|---|---|
| ≥ 85 | Excellent | `#4A8C5C` |
| ≥ 70 | Good | `#8BC989` |
| ≥ 50 | Fair | `#D4B44A` |
| ≥ 20 | Poor | `#D97B7B` |
| < 20 | Unscannable | `#8B2020` |

### Skeleton card

Update `SkeletonCard.js` to match the new card structure:
- Square skeleton for the image
- Two shorter skeleton bars below (url row height, style chip height)
- No icon row skeletons (the old 4-icon row is gone)

### Grid breakpoints

Update the MUI `Grid` in `page.js` from `columns={{ xs: 1, sm: 2, md: 2, lg: 3, xl: 4 }}` to `columns={{ xs: 1, sm: 2, md: 2, lg: 3, xl: 3 }}` so the layout stays at 3 columns at 1600px (xl) instead of expanding to 4.

---

## Files to change

| File | Change |
|---|---|
| `src/app/(main_pages)/mycodes/ImagesCard.js` | Full rewrite of the card layout |
| `src/app/(main_pages)/mycodes/SkeletonCard.js` | Update skeleton to match new card structure |
| `src/app/(main_pages)/mycodes/page.js` | Change `xl: 4` → `xl: 3` in Grid `columns` prop |

No backend changes. No new dependencies. `LikeButton` component is reused as-is.

---

## Out of scope

- Scannability display in the detail modal/sidebar (separate ticket)
- Copy and Share actions (remain in modal only)
- Any changes to the `/explore` route or filtering
