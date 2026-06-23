"use client";

import React, { useState, useEffect } from "react";
import {
  List,
  ListItemText,
  Typography,
  Box,
  Stack,
  CircularProgress,
  Card,
  Button,
  Chip,
  IconButton,
} from "@mui/material";
import dayjs from "dayjs";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useRouter } from "next/navigation";
import theme from "@/_styles/theme";
import DoneIcon from "@mui/icons-material/Done";
import LinkIcon from "@mui/icons-material/Link";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";

import DeleteButton from "@/_components/actions/DeleteButton";
import CopyButton from "@/_components/actions/CopyButton";
import LikeButton from "@/_components/actions/LikeButton";
import UnlockButton from "@/_components/actions/UnlockButton";
import ShareButton from "@/_components/actions/ShareButton";
import GuestSignupPrompt from "./GuestSignupPrompt";
import RemixCard from "./RemixCard";
import { useStore } from "@/store";
import { unlockImage } from "@/_utils/ImagesUtils";
import * as amplitude from "@amplitude/analytics-browser";
import { EVENTS, trackUnlockRevenue } from "@/_utils/analytics";

const SCANNABILITY_LEVELS = [
  { min: 85, label: "Excellent", color: "#4A8C5C" },
  { min: 70, label: "Good",      color: "#8BC989" },
  { min: 50, label: "Fair",      color: "#D4B44A" },
  { min: 20, label: "Poor",      color: "#D97B7B" },
  { min: 0,  label: "Unscannable", color: "#8B2020" },
];

function getScannability(score) {
  return SCANNABILITY_LEVELS.find((l) => score >= l.min) ?? SCANNABILITY_LEVELS[4];
}

export default function ImageSidebar({
  image,
  user,
  customDeleteAction,
  customLikeAction,
  showActions = true,
}) {
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const { openAlert } = useStore();
  const router = useRouter();
  const isOwner = user?._id === image?.user_id;
  const isGuestUser = !user?._id || user?.is_guest;

  const [stripeSessionId, setStripeSessionId] = useState(null);
  const [justGenerated, setJustGenerated] = useState(false);
  const [unlocking, setUnlocking] = useState(false);
  const [currentImage, setCurrentImage] = useState(image);
  const [promptCopied, setPromptCopied] = useState(false);

  useEffect(() => {
    setCurrentImage(image);
  }, [image]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get("stripe_session_id");
    setStripeSessionId(sessionId);
    setJustGenerated(params.get("justGenerated") === "true");

    if (params.get("canceled") === "true" && currentImage?._id) {
      const abandonKey = `qrai_abandoned_${currentImage._id}`;
      let alreadyTracked = false;
      try { alreadyTracked = window.sessionStorage.getItem(abandonKey) === "1"; }
      catch { alreadyTracked = false; }
      if (!alreadyTracked) {
        amplitude.track(EVENTS.PURCHASE_ABANDONED, { imageId: currentImage._id });
        try { window.sessionStorage.setItem(abandonKey, "1"); }
        catch { /* ignore */ }
      }
    }

    if (currentImage?.unlocked) return;
    const shouldUnlock = sessionId || currentImage?.unlock_pending;
    if (!shouldUnlock) return;

    setUnlocking(true);
    unlockImage(currentImage._id, sessionId)
      .then((updatedImage) => {
        trackUnlockRevenue(currentImage._id);
        setCurrentImage(updatedImage);
        router.refresh();
      })
      .catch(() => {
        amplitude.track(EVENTS.PURCHASE_FAILED, { imageId: currentImage._id, stage: "fulfillment" });
        openAlert("error", "Image preparation failed — please try again or contact support.");
      })
      .finally(() => setUnlocking(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (justGenerated && isGuestUser) {
    return <GuestSignupPrompt />;
  }

  const hasScore = currentImage?.scannability_score != null;
  const score = currentImage?.scannability_score ?? 0;
  const scannability = getScannability(score);
  const filledSegments = Math.min(5, Math.max(1, Math.round(score / 20)));
  const showUnlockCard = justGenerated || isOwner;

  const handleCopyPrompt = () => {
    if (currentImage?.prompt) {
      navigator.clipboard.writeText(currentImage.prompt);
      setPromptCopied(true);
      setTimeout(() => setPromptCopied(false), 2000);
    }
  };

  /* -------------------------------------------------------------------------- */
  /*  MODAL MODE (showActions=true) — preserves existing layout                  */
  /* -------------------------------------------------------------------------- */
  if (showActions) {
    return (
      <Box
        sx={{
          flex: "1",
          padding: "3rem",
          minWidth: "300px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          overflowY: { md: "scroll" },
          overflowX: "clip",
        }}
      >
        <div style={{ maxHeight: "100%" }}>
          {justGenerated && (
            <Typography variant="h3" color="text.secondary">
              Your QR Art is Ready!
            </Typography>
          )}

          <Stack
            direction="row"
            justifyContent={{ xs: "center", md: "left" }}
            alignItems="center"
            spacing={2}
            useFlexGap
            flexWrap="wrap"
            sx={{ mb: "1rem" }}
          >
            {!isGuestUser && (
              <LikeButton image={currentImage} user={user} customLikeAction={customLikeAction} />
            )}
            <ShareButton image={currentImage} index={1} />
            {isOwner && (
              <DeleteButton image={currentImage} customDeleteAction={customDeleteAction} />
            )}
            <CopyButton image={currentImage} />
          </Stack>

          {showUnlockCard && (
            <Card
              sx={{
                mb: 2,
                p: 2,
                borderRadius: 2,
                backgroundColor: "rgb(142, 245, 194)",
                border: "1px solid rgba(255,255,255,0.1)",
              }}
            >
              {!currentImage?.unlocked && !unlocking && (
                <>
                  <Typography variant="h5" color="text.secondary" sx={{ mb: 1.5 }}>
                    Unlock the HD version
                  </Typography>
                  <Stack direction="column" sx={{ mb: "1rem" }}>
                    <Stack direction="row" alignItems="center" spacing={0.5}>
                      <DoneIcon /><Typography>HD Image (2048px x 2048px)</Typography>
                    </Stack>
                    <Stack direction="row" alignItems="center" spacing={0.5}>
                      <DoneIcon /><Typography>Remove Watermark</Typography>
                    </Stack>
                    <Stack direction="row" alignItems="center" spacing={0.5}>
                      <DoneIcon /><Typography>Unlock once, download forever</Typography>
                    </Stack>
                  </Stack>
                  <UnlockButton image={currentImage} />
                </>
              )}
              {unlocking && (
                <>
                  <Typography variant="h5" color="text.secondary" sx={{ mb: 1.5 }}>
                    HD Image Unlocked!
                  </Typography>
                  <Button variant="contained" color="secondary" disabled
                    startIcon={<CircularProgress size={16} color="inherit" />}>
                    Generating HD Image…
                  </Button>
                </>
              )}
              {currentImage?.unlocked && !unlocking && (
                <>
                  <Typography variant="h5" color="text.secondary" sx={{ mb: 1.5 }}>
                    HD Image Unlocked!
                  </Typography>
                  <UnlockButton image={currentImage} />
                </>
              )}
            </Card>
          )}

          {hasScore && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="h5" align={isMobile ? "center" : "left"} sx={{ mb: 1 }}>
                Scannability
              </Typography>
              <Box sx={{ display: "flex", justifyContent: isMobile ? "center" : "flex-start" }}>
                <Box>
                  <Stack direction="row" spacing={0.5} sx={{ mb: 0.5 }}>
                    {Array.from({ length: 5 }, (_, i) => (
                      <Box key={i} sx={{ width: 36, height: 22, borderRadius: 1,
                        bgcolor: i < filledSegments ? scannability.color : "#CCCCCC" }} />
                    ))}
                  </Stack>
                  <Typography variant="caption" sx={{ color: scannability.color, fontWeight: 700, display: "block" }}>
                    {scannability.label}
                  </Typography>
                </Box>
              </Box>
            </Box>
          )}

          <Typography variant="h5" align={isMobile ? "center" : "left"}>
            Image Details
          </Typography>
          <List>
            <ListItemText primary="Date created"
              secondary={dayjs(currentImage?.created_at).format("MMMM D, YYYY")}
              align={isMobile ? "center" : "left"} />
            <ListItemText primary="QR Content" secondary={currentImage?.content}
              align={isMobile ? "center" : "left"} />
            <ListItemText primary="Prompt" secondary={currentImage?.prompt}
              align={isMobile ? "center" : "left"} />
            <ListItemText primary="Style" secondary={currentImage?.style_title}
              align={isMobile ? "center" : "left"} />
            <ListItemText primary="Seed" secondary={currentImage?.seed}
              align={isMobile ? "center" : "left"} />
            <ListItemText primary="Image Dimensions"
              secondary={`${currentImage?.width} x ${currentImage?.height} px`}
              align={isMobile ? "center" : "left"} />
            <ListItemText primary="QR Code Weight" secondary={currentImage?.qr_weight}
              align={isMobile ? "center" : "left"} />
            <ListItemText primary="Image Id" secondary={currentImage?._id}
              align={isMobile ? "center" : "left"} />
          </List>
        </div>
      </Box>
    );
  }

  /* -------------------------------------------------------------------------- */
  /*  STANDALONE PAGE MODE (showActions=false) — new design                      */
  /* -------------------------------------------------------------------------- */
  return (
    <Box
      sx={{
        width: "100%",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* LINKS TO */}
      <Box>
        <Typography
          variant="overline"
          sx={{ fontSize: "11px", color: "#7d7d7d", letterSpacing: "0.08em", display: "block", mb: 1 }}
        >
          Links to
        </Typography>
        {currentImage?.content && (
          <Box
            component="a"
            href={
              currentImage.content.startsWith("http")
                ? currentImage.content
                : `https://${currentImage.content}`
            }
            target="_blank"
            rel="noopener noreferrer"
            sx={{
              display: "inline-flex",
              alignItems: "center",
              gap: 1.125,
              textDecoration: "none",
              color: "primary.main",
              maxWidth: "100%",
            }}
          >
            <LinkIcon sx={{ flexShrink: 0, fontSize: 20 }} />
            <Typography
              variant="h3"
              sx={{ fontSize: "30px", lineHeight: 1.05, wordBreak: "break-all" }}
            >
              {currentImage.content}
            </Typography>
          </Box>
        )}
      </Box>

      {/* STYLE + SCANNABILITY */}
      <Box
        sx={{
          display: "flex",
          gap: 4,
          alignItems: "flex-start",
          mt: 3.25,
          pt: 3,
          borderTop: "1px solid #2e2e2e",
        }}
      >
        {currentImage?.style_title && (
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography
              variant="overline"
              sx={{ fontSize: "11px", color: "#7d7d7d", letterSpacing: "0.08em", display: "block", mb: 1.25 }}
            >
              Style
            </Typography>
            <Chip
              label={currentImage.style_title.toUpperCase()}
              size="small"
              sx={{
                bgcolor: "#2a2a2a",
                color: "primary.light",
                fontWeight: 700,
                fontSize: "12px",
                letterSpacing: "0.08em",
                height: "36px",
                borderRadius: "999px",
              }}
            />
          </Box>
        )}

        {hasScore && (
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Box
              sx={{
                display: "flex",
                alignItems: "baseline",
                justifyContent: "space-between",
                mb: 1.375,
              }}
            >
              <Typography
                variant="overline"
                sx={{ fontSize: "11px", color: "#7d7d7d", letterSpacing: "0.08em" }}
              >
                Scannability
              </Typography>
              <Typography variant="h5" sx={{ fontSize: "16px", color: scannability.color }}>
                {scannability.label}
              </Typography>
            </Box>
            <Stack direction="row" spacing={0.75}>
              {Array.from({ length: 5 }, (_, i) => (
                <Box
                  key={i}
                  sx={{
                    flex: 1,
                    height: "16px",
                    borderRadius: "4px",
                    bgcolor: i < filledSegments ? scannability.color : "#2e2e2e",
                  }}
                />
              ))}
            </Stack>
          </Box>
        )}
      </Box>

      {/* PROMPT */}
      {currentImage?.prompt && (
        <Box sx={{ mt: 3.25, pt: 3, borderTop: "1px solid #2e2e2e" }}>
          <Typography
            variant="overline"
            sx={{ fontSize: "11px", color: "#7d7d7d", letterSpacing: "0.08em", display: "block", mb: 1.25 }}
          >
            Prompt
          </Typography>
          <Box
            sx={{
              bgcolor: "#0e0e0e",
              border: "1px solid #2e2e2e",
              borderRadius: "12px",
              p: "16px 18px",
              pr: "52px",
              color: "#b8b8b8",
              fontSize: "14px",
              lineHeight: 1.55,
              position: "relative",
            }}
          >
            {currentImage.prompt}
            <IconButton
              size="small"
              onClick={handleCopyPrompt}
              sx={{
                position: "absolute",
                top: 10,
                right: 10,
                width: 30,
                height: 30,
                borderRadius: "8px",
                bgcolor: "#2a2a2a",
                color: promptCopied ? "primary.main" : "#b8b8b8",
                "&:hover": { bgcolor: "#3a3a3a" },
              }}
            >
              <ContentCopyIcon sx={{ fontSize: 15 }} />
            </IconButton>
          </Box>
        </Box>
      )}

      {/* UNLOCK CARD */}
      {showUnlockCard && (
        <Box sx={{ mt: 4, bgcolor: "primary.light", borderRadius: "16px", p: 3 }}>
          {!currentImage?.unlocked && !unlocking && (
            <>
              <Typography variant="h3" sx={{ fontSize: "24px", color: "#161616", lineHeight: 1.12, mb: 0.75 }}>
                Unlock the full-resolution QR code
              </Typography>
              <Typography sx={{ fontSize: "14px", color: "#2f7d4f", lineHeight: 1.45 }}>
                Watermark removed · print-ready PNG · scans on every reader.
              </Typography>
              <Box sx={{ mt: 2.25 }}>
                <UnlockButton image={currentImage} />
              </Box>
            </>
          )}
          {unlocking && (
            <>
              <Typography variant="h3" sx={{ fontSize: "24px", color: "#161616", lineHeight: 1.12, mb: 0.75 }}>
                HD Image Unlocked!
              </Typography>
              <Button
                variant="contained"
                color="secondary"
                disabled
                fullWidth
                startIcon={<CircularProgress size={16} color="inherit" />}
                sx={{ mt: 1 }}
              >
                Generating HD Image…
              </Button>
            </>
          )}
          {currentImage?.unlocked && !unlocking && (
            <>
              <Typography variant="h3" sx={{ fontSize: "24px", color: "#161616", lineHeight: 1.12, mb: 0.75 }}>
                HD Image Unlocked!
              </Typography>
              <Box sx={{ mt: 2.25 }}>
                <UnlockButton image={currentImage} />
              </Box>
            </>
          )}
        </Box>
      )}

      {/* REMIX CARD */}
      <Box sx={{ mt: 4 }}>
        <RemixCard image={currentImage} />
      </Box>
    </Box>
  );
}
