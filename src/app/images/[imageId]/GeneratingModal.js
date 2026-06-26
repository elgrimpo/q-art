"use client";

import React from "react";
import { Box, Typography, Button, Stack, Dialog } from "@mui/material";
import GeneratingLoader from "@/app/(main_pages)/generate/(formComponents)/GeneratingLoader";

export default function GeneratingModal({ open, error, onRetry, onBack }) {
  return (
    <Dialog
      open={open}
      PaperProps={{
        sx: {
          bgcolor: "background.default",
          backgroundImage: "none",
          borderRadius: "16px",
          width: "min(90vw, 600px)",
        },
      }}
    >
      <Box sx={{ p: 3 }}>
        {error ? (
          <Box sx={{ textAlign: "center" }}>
            <Typography variant="h5" sx={{ mb: 1 }}>
              Something went wrong
            </Typography>
            <Typography variant="body2" sx={{ mb: 3 }}>
              Generation failed. You can retry or go back to the image.
            </Typography>
            <Stack direction="row" spacing={2} justifyContent="center">
              <Button variant="contained" color="primary" onClick={onRetry}>
                Retry
              </Button>
              <Button variant="outlined" color="primary" onClick={onBack}>
                Back to image
              </Button>
            </Stack>
          </Box>
        ) : (
          <GeneratingLoader />
        )}
      </Box>
    </Dialog>
  );
}
