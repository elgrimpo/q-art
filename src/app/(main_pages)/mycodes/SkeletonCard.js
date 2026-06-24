import React from "react";
import { Box, Skeleton } from "@mui/material";

export default function SkeletonCard({ index }) {
  return (
    <Box
      sx={{
        bgcolor: "#161616",
        borderRadius: "12px",
        overflow: "hidden",
        border: "1px solid #252525",
      }}
      key={index}
    >
      {/* Image skeleton */}
      <Skeleton
        variant="rounded"
        width="100%"
        animation="wave"
        sx={{ aspectRatio: "1/1", height: 0, paddingTop: "100%", borderRadius: 0 }}
      />

      {/* Body skeleton */}
      <Box sx={{ p: "14px 16px 16px", display: "flex", alignItems: "center", gap: "14px" }}>
        {/* Left: url bar + style chip */}
        <Box sx={{ flex: 1, display: "flex", flexDirection: "column", gap: "8px" }}>
          <Skeleton variant="rounded" width="65%" height={18} animation="wave" />
          <Skeleton
            variant="rounded"
            width="42%"
            height={28}
            animation="wave"
            sx={{ borderRadius: "999px" }}
          />
        </Box>
        {/* Right: scannability ring placeholder */}
        <Skeleton variant="circular" width={36} height={36} animation="wave" />
      </Box>
    </Box>
  );
}
