"use client";

import { Box, Typography } from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { useRouter } from "next/navigation";

// Desktop-only counterpart to BackButton.js's mobile icon button — sits
// inline in the hero text column, above the heading, as a plain link.
export default function BackLink() {
  const router = useRouter();

  return (
    <Box
      onClick={() => router.back()}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter") router.back();
      }}
      sx={{
        display: { xs: "none", md: "inline-flex" },
        alignItems: "center",
        gap: 0.5,
        mb: 2,
        color: "primary.main",
        cursor: "pointer",
        width: "fit-content",
      }}
    >
      <ArrowBackIcon sx={{ fontSize: 18 }} />
      <Typography sx={{ fontSize: "0.9rem", fontWeight: 500 }}>Back</Typography>
    </Box>
  );
}
