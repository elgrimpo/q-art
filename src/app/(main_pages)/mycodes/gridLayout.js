import { getImageAspect } from "@/_utils/imageAspect";

// Column span buckets by aspect (a wide image gets more horizontal room, a
// square/portrait image gets one column) — but the image itself renders at
// its REAL aspect ratio, not a forced slot ratio. An earlier version forced
// portrait images into a fixed 1:2 slot (padded further to align with 2
// stacked squares); that wasted a lot of space for portrait-heavy grids,
// worst on mobile's single column where there's no square neighbor to align
// with at all. Dense packing + the measured row-span (see ROW_UNIT_PX below)
// still organizes things reasonably when portraits mix with squares, without
// the artificial padding.
export const ROW_UNIT_PX = 4;
export const CARD_GAP_PX = 16;

export function itemLayout(image, colCount) {
  const aspect = getImageAspect(image);
  const span = aspect === "landscape" ? Math.min(2, colCount) : 1;
  const imageAspectRatio =
    image?.width && image?.height ? `${image.width} / ${image.height}` : "1 / 1";

  return {
    aspect,
    gridColumn: `span ${span}`,
    imageAspectRatio,
  };
}
