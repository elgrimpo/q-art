import { getImageAspect } from "@/_utils/imageAspect";

// A 2x2 "hero" tile for images explicitly curated via the admin Hero toggle.
// Index 0 never renders as a hero, so the grid never opens on one.
export function isHeroTile(image, index) {
  return !!image?.is_hero && index !== 0;
}

export function itemLayout(image, index) {
  if (isHeroTile(image, index)) {
    return { gridColumn: "span 2", gridRow: "span 2", aspectRatio: "1 / 1" };
  }

  const aspect = getImageAspect(image);
  const ratio =
    image?.width && image?.height ? `${image.width} / ${image.height}` : "1 / 1";

  if (aspect === "landscape") return { gridColumn: "span 2", aspectRatio: ratio };
  if (aspect === "portrait") return { gridColumn: "span 1", gridRow: "span 2", aspectRatio: ratio };
  return { gridColumn: "span 1", aspectRatio: "1 / 1" };
}
