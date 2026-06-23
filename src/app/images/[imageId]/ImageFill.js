'use client'

import React from "react";
import { Box, CardMedia, Skeleton, Chip, IconButton } from "@mui/material";
import LockIcon from "@mui/icons-material/Lock";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";

export default function ImageFill({ image, sx, onPrev, onNext, topOverlay }) {
  const imageUrl = image?.unlocked ? image?.image_url : image?.watermarked_image_url;

  return (
    <Box
      sx={{
        position: "relative",
        borderRadius: { xs: 0, md: "16px" },
        overflow: "hidden",
        bgcolor: "#0e0e0e",
        ...sx,
      }}
    >
      {!imageUrl ? (
        <Skeleton
          variant="rounded"
          animation="wave"
          sx={{ width: "100%", aspectRatio: "1/1" }}
        />
      ) : (
        <CardMedia
          component="img"
          image={imageUrl}
          sx={{
            display: "block",
            width: "100%",
            aspectRatio: "1/1",
            objectFit: "cover",
            pointerEvents: "none",
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
