# Explore Page Improvements: Curated Hero, True Aspect Ratio, Scannability Rescore

**Date:** 2026-07-07
**Status:** Approved

---

## Scope

Four related improvements to the Explore page (`src/app/(main_pages)/explore/page.js`), all discovered while reviewing the current quilted-style CSS grid:

1. Replace the automatic hero-tile heuristic with an admin-curated `is_hero` flag.
2. Never open the grid on a hero tile.
3. Render non-square images at their true aspect ratio instead of forcing/cropping to square.
4. Rescore existing images whose stored `scannability_score` predates the aspect-ratio-aware scorer.

---

## 1. Backend: `is_hero` flag

- Add `is_hero: Optional[bool] = False` to `ImageDoc` in [api/schemas/schemas.py](../../../api/schemas/schemas.py).
- New admin-only endpoint `PUT /api/images/hero/{id}` → `toggle_hero(id)` in `api/controllers/images_controller.py`, following the same shape as `toggle_featured`:
  - 404 if the image doesn't exist.
  - 400 if the image is not currently `featured` (Hero requires Featured — you can't make a non-Explore image a hero).
  - Otherwise flips `is_hero` and returns `{"message": "Hero toggled successfully", "is_hero": new_value}`.
- Route registered in `api/main.py` next to the existing `toggle_featured_endpoint`, gated by `Depends(require_admin)`.
- `toggle_featured` gets one addition: when setting `featured: False`, the same update also sets `is_hero: False`, so a de-featured image can never be left as a stale hero. (When setting `featured: True`, `is_hero` is untouched.)
- No changes to `get_images` / `createImagesFilterQuery` — Explore already fetches with `featured=true`; `is_hero` rides along on the existing document shape.

## 2. Frontend: Hero toggle UI

- Add `bookmarkHero(id)` to `src/_utils/ImagesUtils.js`, mirroring `bookmarkImage` (PUT to the new endpoint, `revalidateTag('images')` on success).
- In `src/app/images/[imageId]/ImageTopBar.js` and the mycodes admin menu (`src/app/(main_pages)/mycodes/ImagesCard.js`), add a "Set as Hero" / "Remove as Hero" menu item directly below the existing "Add to Explore" / "Remove from Explore" item.
  - Visible only when `isAdmin && image.featured` is true.
  - Visible only when the image is square (`width/height` within the same ~1:1 tolerance the Explore grid uses) — non-square images don't get a Hero option at all, since the Hero tile stays square-only (see §4).
  - Use `Star` / `StarBorder` icons (visually distinct from the `Bookmark` icons already used for Featured) with label "Set as Hero" / "Remove as Hero".
  - Same optimistic-update-with-rollback pattern as `handleBookmark`.

## 3. Explore grid: hero placement

In `src/app/(main_pages)/explore/page.js`:

- Delete the `isHero()` heuristic (`getImageAspect(image) === "square" && index % 7 === 0`).
- `itemLayout(image, index)` instead renders the 2×2 hero treatment when `image.is_hero === true && index !== 0`. Index 0 always renders as a normal tile even if `is_hero` is true — the grid never opens on a hero.
- Since Hero is square-only (backend/UI constraint above), the hero branch keeps its existing `{ gridColumn: "span 2", gridRow: "span 2", aspectRatio: "1/1" }`.

## 4. Explore grid: true aspect ratio for non-hero tiles

Replace the current 3-bucket `getImageAspect`/`itemLayout` logic (which forces landscape and portrait into square-cropped cells) with sizing derived from the image's actual `width`/`height`:

- **Square** (ratio within ~0.8–1.2, existing thresholds): unchanged — 1 column × 1 row, `aspectRatio: "1/1"`.
- **Landscape** (ratio > 1.2, e.g. ~3:2): spans 2 columns × 1 row, `aspectRatio` set to the image's real `width/height` (not forced back to `1/1`).
- **Portrait** (ratio < 0.8, e.g. ~2:3): spans 1 column × 2 rows, `aspectRatio` set to the image's real `width/height`.
- `objectFit: cover` on the `<img>` stays as-is; since the cell's `aspect-ratio` now matches the image's real ratio, no visible cropping occurs for the ratios in actual use (1:1, 2:3, 3:2). Cover just guards against any image whose stored `width`/`height` doesn't exactly match its file (rare/legacy data).
- Getting the CSS grid's implicit row-track sizing to behave correctly for mixed 1-row/2-row items in the same `grid-auto-flow: row dense` container is the fiddly part of this change (auto-row height derived from content vs. multi-row spans). This will be verified visually in-browser during implementation, not fully pinned down in this spec — acceptable outcome is: no cropping, no visible distortion/stretching of neighboring tiles, reasonable packing density.
- Skeleton loading state (`loading` branch) is unaffected — it already just alternates one 2×2 skeleton with 1×1 skeletons and doesn't need to reflect real aspect ratios.

## 5. Fixing stale scannability scores

Context: `api/utils/structural_score.py` was upgraded (QRAI-110) to crop to a centered square (`localize_qr`) before scoring, so portrait/landscape renders align correctly. But `api/scripts/backfill_scannability.py` only scores documents matching `{"scannability_score": {"$exists": False}}` — a one-time backfill run before the aspect-ratio fix landed. Images scored during that original run (including all non-square ones, and possibly some squares depending on which scorer-v2 commit they predate) still carry scores from an older scorer version and are never touched again by the existing script.

- Update `backfill_scannability.py` to rescore **every** image with an `image_url`, regardless of whether `scannability_score` already exists — drop the `$exists: False` filter (or replace the query with `{}` / add an explicit `--force` mode; implementation detail, but the default behavior after this change is "rescore everything").
- Run the updated script once against production Mongo (`MONGO_URL`) as part of this task. It downloads every image and recomputes its score — expect it to take a while proportional to image count; report processed/failed counts when done.
- No schema change needed — `scannability_score` is simply overwritten in place.

---

## Files changed

| File | Change |
|------|--------|
| `api/schemas/schemas.py` | Add `is_hero: Optional[bool] = False` to `ImageDoc` |
| `api/controllers/images_controller.py` | Add `toggle_hero()`; `toggle_featured()` cascades `is_hero: False` on un-feature |
| `api/main.py` | Register `PUT /api/images/hero/{id}` route, admin-gated |
| `api/scripts/backfill_scannability.py` | Drop the `$exists: False` filter so it rescores all images |
| `src/_utils/ImagesUtils.js` | Add `bookmarkHero(id)` |
| `src/app/images/[imageId]/ImageTopBar.js` | Add Hero menu item (admin, featured + square only) |
| `src/app/(main_pages)/mycodes/ImagesCard.js` | Add matching Hero menu item |
| `src/app/(main_pages)/explore/page.js` | Replace `isHero()` heuristic with `is_hero`-flag + index-0 guard; replace forced-square landscape/portrait layout with true-aspect-ratio sizing |
| `api/tests/test_images.py` | Tests for `toggle_hero` (requires featured, cascades on un-feature) |
| `src/__tests__/*` | Tests for new menu items and updated `itemLayout`/`isHero` logic in Explore |

## Out of scope

- Bulk/multi-select hero curation UI — toggling stays one image at a time via the existing per-image admin menus.
- Changing the Featured/Explore selection mechanism itself.
- Any change to `structural_score.py` itself — it's already correct; only the stale stored data needs fixing.
