'use client'

import React from "react";
import { Box, CardMedia, Skeleton, Chip, IconButton } from "@mui/material";
import LockIcon from "@mui/icons-material/Lock";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";

export default function ImageFill({ image, sx, onPrev, onNext, topOverlay, maxHeight }) {
  const imageUrl = image?.unlocked ? image?.image_url : image?.watermarked_image_url;
  // Real aspect ratio, letterboxed via objectFit:contain instead of force-
  // cropped — matches the myCodes grid fix. `maxHeight` (modal contexts
  // only) clamps a tall portrait image's box height; contain still shows
  // the full image within that clamped box rather than cropping it.
  const aspectRatio =
    image?.width && image?.height ? `${image.width} / ${image.height}` : "1 / 1";

  // maxHeight only ever carries an `md` breakpoint (modal/detail contexts
  // clamp on md+, mobile stays full-bleed) — but `width: 100%` plus a
  // clamped height stopped matching the image's real aspect ratio there:
  // e.g. a square image in a tall column got squashed into a wide box, and
  // objectFit:contain then pillarboxed it, exposing this Box's bgcolor as a
  // visible band instead of blending into the page. On md, driving size off
  // the definite height instead (auto width via aspect-ratio, shrink-wrapped
  // + centered) keeps the box itself square, so any leftover space is the
  // page's own background, not a mismatched inner one. xs is untouched.
  const mediaSx = maxHeight
    ? {
        width: { xs: "100%", md: "auto" },
        height: { md: maxHeight.md },
        maxWidth: "100%",
        aspectRatio,
        mx: { md: "auto" },
      }
    : { width: "100%", aspectRatio };

  return (
    <Box
      sx={{
        position: "relative",
        borderRadius: { xs: 0, md: "16px" },
        overflow: "hidden",
        bgcolor: "#0e0e0e",
        ...(maxHeight && {
          width: { md: "fit-content" },
          maxWidth: "100%",
          mx: { md: "auto" },
        }),
        ...sx,
      }}
    >
      {!imageUrl ? (
        <Skeleton variant="rounded" animation="wave" sx={mediaSx} />
      ) : (
        <CardMedia
          component="img"
          image={imageUrl}
          sx={{
            display: "block",
            objectFit: "contain",
            pointerEvents: "none",
            ...mediaSx,
          }}
        />
      )}

      {onPrev && (
        <IconButton
          onClick={onPrev}
          sx={{
            position: "absolute",
            left: 10,
            top: "50%",
            transform: "translateY(-50%)",
            zIndex: 1,
            bgcolor: "rgba(0,0,0,0.45)",
            color: "#ededed",
            "&:hover": { bgcolor: "rgba(0,0,0,0.7)" },
          }}
        >
          <ChevronLeftIcon />
        </IconButton>
      )}

      {onNext && (
        <IconButton
          onClick={onNext}
          sx={{
            position: "absolute",
            right: 10,
            top: "50%",
            transform: "translateY(-50%)",
            zIndex: 1,
            bgcolor: "rgba(0,0,0,0.45)",
            color: "#ededed",
            "&:hover": { bgcolor: "rgba(0,0,0,0.7)" },
          }}
        >
          <ChevronRightIcon />
        </IconButton>
      )}

      {topOverlay}

      {!image?.unlocked && imageUrl && (
        <Chip
          icon={<LockIcon />}
          label="LOCKED PREVIEW"
          size="small"
          sx={{
            position: "absolute",
            bottom: 16,
            left: 16,
            bgcolor: "rgba(14,14,14,0.72)",
            backdropFilter: "blur(4px)",
            border: "1px solid #2e2e2e",
            color: "#ededed",
            fontWeight: 700,
            fontSize: "11px",
            letterSpacing: "0.08em",
            borderRadius: "999px",
            "& .MuiChip-icon": { color: "#a6ffc3", fontSize: "14px" },
          }}
        />
      )}
    </Box>
  );
}
