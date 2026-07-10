import { getImageAspect } from "@/_utils/imageAspect";

// POC: fixed 3-bucket masonry slots. Square/landscape/portrait mirror
// explore/gridLayout.js's classification but slot the image into a fixed-ratio
// box (letterboxed via objectFit:contain) instead of stretching to the image's
// real ratio — myCodes cards carry a fixed-height footer below the image that
// explore's pure-image tiles don't have.
const SLOT_RATIOS = { square: "1 / 1", landscape: "2 / 1", portrait: "1 / 2" };

// Row placement is MEASURED, not assumed (e.g. "portrait = 2x row-span"),
// because a portrait card's one footer vs. two stacked square cards' two
// footers means a naive 2x assumption leaves a gap at the bottom of the
// portrait card. The container uses a fine-grained gridAutoRows track
// (ROW_UNIT_PX) with rowGap:0, and each card reports its own measured
// pixel height as a row-span in that unit; the visual gap between cards is
// baked into each card's own marginBottom (CARD_GAP_PX) instead of the
// container's row-gap, so the gap isn't multiplied across every fine row line.
export const ROW_UNIT_PX = 4;
export const CARD_GAP_PX = 16;

export function itemLayout(image, colCount) {
  const aspect = getImageAspect(image);
  const span = aspect === "landscape" ? Math.min(2, colCount) : 1;

  return {
    aspect,
    gridColumn: `span ${span}`,
    imageAspectRatio: SLOT_RATIOS[aspect],
  };
}
