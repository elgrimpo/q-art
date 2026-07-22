# Low-scannability warning on image detail page/modal

## Problem

The image detail page/modal (`src/app/images/[imageId]/ImageSidebar.js`) shows a scannability score (via `ScannabilityRing`) but gives no guidance when that score is low. Users with a Fair/Poor/Unscannable QR code have no in-context nudge toward the fix (raising QR Weight).

## Scope

`ImageSidebar.js` only — the file already backs both the standalone `/images/[imageId]` page and the modal (both routes go through `ImageDetailContent.js`, which always renders `ImageSidebar` with `showActions={false}`; the alternate `showActions={true}` branch is dead code, unreachable from any caller, and is out of scope for this change).

## Design

- Threshold: show the warning whenever `hasScore && score < 80` — i.e. the `SCANNABILITY_LEVELS` categories Fair (70-79), Poor (40-69), or Unscannable (0-39). Good (80-89) and Excellent (90+) show nothing new.
- Placement: a new block directly below the existing Style/Scannability row (after line 544, before the Prompt section).
- Copy: "Scannability might be low. **Increase QR Weight** to improve it." The bolded segment is a clickable inline text link.
- Behavior: clicking the link calls the same `setIterateOpen(true)` already wired to the "Iterate this image" / "Make it your own" panel entry — no new route, no new panel. This naturally only renders while the Iterate panel is closed, since it lives inside the existing `{!iterateOpen && !iterateActive && (...)}` block.
- Visual style: inline text (not an MUI `Alert` banner), consistent with the sidebar's existing understated conventions — link styled `primary.main`/underline like the "Links to" section, message in `text.secondary`.
- Applies regardless of `isOwner` (same audience as the existing scannability ring and Iterate panel, which already supports both owner and non-owner flows).

## Out of scope

- The dead `showActions={true}` code path in `ImageSidebar.js` (not touched).
- `ScannabilityBadge.js` / `ImagesCard.js` grid-card meter (different page, different thresholds, not part of this request).
- Auto-scrolling or auto-focusing the QR Weight slider once the Iterate panel opens.
