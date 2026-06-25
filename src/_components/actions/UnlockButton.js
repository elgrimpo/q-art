"use client";

import React, { useState } from "react";
import { Button, CircularProgress } from "@mui/material";
import LockOpenIcon from "@mui/icons-material/LockOpen";
import DownloadIcon from "@mui/icons-material/Download";
import * as amplitude from "@amplitude/analytics-browser";
import { useStore } from "@/store";
import { createUnlockCheckout } from "@/_utils/paymentUtils";
import { adminDownloadImage } from "@/_utils/ImagesUtils";
import { EVENTS, UNLOCK_PRICE, CURRENCY } from "@/_utils/analytics";

export default function UnlockButton({ image, isAdmin = false }) {
  const { openAlert } = useStore();
  const [loading, setLoading] = useState(false);

  // Admin bypass: download without unlocking
  if (isAdmin && !image?.unlocked) {
    const handleAdminDownload = async () => {
      setLoading(true);
      try {
        const blob = await adminDownloadImage(image._id);
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "QR-art.png";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } catch {
        openAlert("error", "Could not download image.");
      } finally {
        setLoading(false);
      }
    };

    return (
      <Button
        variant="contained"
        color="secondary"
        startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <DownloadIcon />}
        onClick={handleAdminDownload}
        disabled={loading}
      >
        {loading ? "Downloading…" : "Download HD (admin)"}
      </Button>
    );
  }

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
        amplitude.track(EVENTS.CHECKOUT_STARTED, {
          imageId: image._id,
          price: UNLOCK_PRICE,
          currency: CURRENCY,
        });
        window.location.href = sessionUrl;
      } else {
        amplitude.track(EVENTS.PURCHASE_FAILED, {
          imageId: image._id,
          stage: "checkout_creation",
        });
        openAlert("error", "Could not start checkout. Please try again.");
      }
    } catch {
      amplitude.track(EVENTS.PURCHASE_FAILED, {
        imageId: image._id,
        stage: "checkout_creation",
      });
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
