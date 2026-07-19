"use client";

import { Box, Typography } from "@mui/material";

// "QR" in bold white Inter next to a rounded-square outline badge containing
// lowercase "ai" in brand green — matches the reference wordmark design.
export default function QrAiWordmark({ fontSize = 26 }) {
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: `${fontSize * 0.22}px` }}>
      <Typography
        component="span"
        sx={{
          fontFamily: "var(--font-inter), sans-serif",
          fontWeight: 800,
          fontSize: `${fontSize}px`,
          lineHeight: 1,
          color: "#FFFFFF",
          letterSpacing: "-0.02em",
        }}
      >
        QR
      </Typography>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          border: "1px solid",
          borderColor: "primary.main",
          borderRadius: `${fontSize * 0.3}px`,
          padding: `0 ${fontSize * 0.22}px`,
        }}
      >
        <Typography
          component="span"
          sx={{
            fontFamily: "var(--font-instrument-serif), serif",
            fontStyle: "italic",
            fontWeight: 400,
            fontSize: `${fontSize * 0.95}px`,
            lineHeight: 1,
            color: "primary.main",
          }}
        >
          ai
        </Typography>
      </Box>
    </Box>
  );
}
