"use client";

import { Box, Typography } from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { useRouter } from "next/navigation";

// Sits where the style landing page's badge chip used to be (first element
// of the hero text column, above the heading) — replaces it entirely rather
// than living alongside it.
export default function BackButton() {
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
        display: "inline-flex",
        alignItems: "center",
        gap: 0.5,
        mb: 2,
        color: "text.secondary",
        cursor: "pointer",
        width: "fit-content",
        "&:hover": { color: "primary.main" },
      }}
    >
      <ArrowBackIcon sx={{ fontSize: 18 }} />
      <Typography sx={{ fontSize: "0.9rem", fontWeight: 500 }}>Back</Typography>
    </Box>
  );
}
