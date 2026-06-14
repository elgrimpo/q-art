"use client";

import React, { useState } from "react";
import { Button, CircularProgress } from "@mui/material";
import LockOpenIcon from "@mui/icons-material/LockOpen";
import DownloadIcon from "@mui/icons-material/Download";
import * as amplitude from "@amplitude/analytics-browser";
import { useStore } from "@/store";
import { createUnlockCheckout } from "@/_utils/paymentUtils";

export default function UnlockButton({ image }) {
  const { openAlert } = useStore();
  const [loading, setLoading] = useState(false);

  if (image?.unlocked) {
    // Append image ID as cache-buster — S3 URL is unchanged after 2048px overwrite,
    // so the browser needs a hint to fetch the new content.
    const downloadUrl = `${image.image_url}?t=${image._id}`;
    return (
      <Button
        variant="contained"
        color="secondary"
        startIcon={<DownloadIcon />}
        href={downloadUrl}
        download="QR-art.png"
      >
        Download HD
      </Button>
    );
  }

  const handleUnlock = async () => {
    setLoading(true);
    try {
      amplitude.track("Unlock Image Clicked", { imageId: image._id });
      const sessionUrl = await createUnlockCheckout(image._id);
      if (sessionUrl) {
        window.location.href = sessionUrl;
      } else {
        openAlert("error", "Could not start checkout. Please try again.");
      }
    } catch {
      openAlert("error", "Could not start checkout. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant="contained"
      color="secondary"
      startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <LockOpenIcon />}
      onClick={handleUnlock}
      disabled={loading}
    >
      {loading ? "Loading…" : "Unlock HD — $3.99"}
    </Button>
  );
}
