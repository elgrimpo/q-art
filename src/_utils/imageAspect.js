export function getImageAspect(image) {
  if (!image?.width || !image?.height) return "square";
  const ratio = image.width / image.height;
  if (ratio > 1.2) return "landscape";
  if (ratio < 0.8) return "portrait";
  return "square";
}

export function isSquareImage(image) {
  return getImageAspect(image) === "square";
}
