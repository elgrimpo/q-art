"use client";

import { IconButton } from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { useRouter } from "next/navigation";

// Mobile-only: pinned to the hero panel's top-left corner (see
// RichStyleLayout in page.js), matching the circular icon-button style used
// for the close button on the image detail overlay (ImageTopBar.js: 40px,
// secondary.main background, primary.main icon). Desktop keeps the inline
// text link instead — see BackLink.js.
export default function BackButton() {
  const router = useRouter();

  return (
    <IconButton
      onClick={() => router.back()}
      aria-label="Back"
      sx={{
        display: { xs: "inline-flex", md: "none" },
        position: "absolute",
        top: 16,
        left: 16,
        zIndex: 3,
        width: "40px",
        height: "40px",
        backgroundColor: "secondary.main",
        color: "primary.main",
        "&:hover": { backgroundColor: "secondary.main" },
      }}
    >
      <ArrowBackIcon />
    </IconButton>
  );
}
