"use client";

import React from "react";
import { Box, Typography, Button } from "@mui/material";
import AutoFixHighIcon from "@mui/icons-material/AutoFixHigh";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import { useRouter } from "next/navigation";
import { useStore } from "@/store";

export default function RemixCard({ image }) {
  const router = useRouter();
  const { setGenerateFormValues } = useStore();

  const handleRemix = () => {
    if (!image) return;
    setGenerateFormValues({
      website: image.content,
      prompt: image.prompt,
      style_title: image.style_title,
      style_prompt: image.style_prompt,
      qr_weight: image.qr_weight,
      negative_prompt: image.negative_prompt,
      seed: image.seed,
      sd_model: image.sd_model,
    });
    router.push("/generate");
  };

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 2.5,
        p: "20px 22px",
        border: "1px solid #2e2e2e",
        borderRadius: "16px",
        bgcolor: "#0e0e0e",
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.75 }}>
        <Box
          sx={{
            flexShrink: 0,
            width: 44,
            height: 44,
            borderRadius: "12px",
            bgcolor: "rgba(112, 225, 149, 0.12)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <AutoFixHighIcon sx={{ color: "primary.main", fontSize: 22 }} />
        </Box>
        <Box>
          <Typography variant="h5" sx={{ fontSize: "22px", lineHeight: 1.1, color: "primary.main" }}>
            Iterate this image
          </Typography>
          <Typography variant="body2" sx={{ color: "#b8b8b8", mt: 0.5, lineHeight: 1.45 }}>
            Open this in the generator and tweak the prompt or style.
          </Typography>
        </Box>
      </Box>

      <Button
        variant="outlined"
        color="primary"
        endIcon={<ArrowForwardIcon />}
        onClick={handleRemix}
        sx={{ flexShrink: 0 }}
      >
        Remix
      </Button>
    </Box>
  );
}
