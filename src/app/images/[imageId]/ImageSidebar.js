"use client";
// Libraries imports
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
} from "@mui/material";
import dayjs from "dayjs";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useRouter } from "next/navigation";
import theme from "@/_styles/theme";
import DoneIcon from "@mui/icons-material/Done";

//App imports
import DeleteButton from "@/_components/actions/DeleteButton";
import CopyButton from "@/_components/actions/CopyButton";
import LikeButton from "@/_components/actions/LikeButton";
import UnlockButton from "@/_components/actions/UnlockButton";
import ShareButton from "@/_components/actions/ShareButton";
import GuestSignupPrompt from "./GuestSignupPrompt";
import { useStore } from "@/store";
import { unlockImage } from "@/_utils/ImagesUtils";
import * as amplitude from "@amplitude/analytics-browser";
import { EVENTS, trackUnlockRevenue } from "@/_utils/analytics";

/* -------------------------------------------------------------------------- */
/*                               COMPONENT START                              */
/* -------------------------------------------------------------------------- */

export default function ImageSidebar({
  image,
  user,
  customDeleteAction,
  customLikeAction,
}) {
  /* ---------------------------- DECLARE VARIABLES --------------------------- */
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const { openAlert } = useStore();
  const router = useRouter();
  const isOwner = user?._id === image?.user_id;
  const isGuestUser = !user?._id || user?.is_guest;

  // Read URL params client-side only (after hydration) to avoid server/client mismatch.
  const [stripeSessionId, setStripeSessionId] = useState(null);
  const [justGenerated, setJustGenerated] = useState(false);

  const [unlocking, setUnlocking] = useState(false);
  const [currentImage, setCurrentImage] = useState(image);

  /* -------------------------------- EFFECTS --------------------------------- */

  // Sync local state when the image prop changes (e.g. navigating between images in the modal).
  useEffect(() => {
    setCurrentImage(image);
  }, [image]);

  // Read URL params after hydration (avoids server/client mismatch) and, in the
  // same pass, kick off the unlock if we just returned from Stripe or the webhook
  // already flagged the image as paid. Doing both in one mount effect avoids
  // relying on a second render to propagate the param into the unlock trigger.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get("stripe_session_id");
    setStripeSessionId(sessionId);
    setJustGenerated(params.get("justGenerated") === "true");

    if (params.get("canceled") === "true" && currentImage?._id) {
      // Dedupe per image: the ?canceled=true param persists in the URL, so a
      // refresh/remount would otherwise re-fire this and inflate the funnel's
      // abandon count. sessionStorage survives reloads within the tab session.
      const abandonKey = `qrai_abandoned_${currentImage._id}`;
      let alreadyTracked = false;
      try {
        alreadyTracked = window.sessionStorage.getItem(abandonKey) === "1";
      } catch {
        alreadyTracked = false;
      }
      if (!alreadyTracked) {
        amplitude.track(EVENTS.PURCHASE_ABANDONED, {
          imageId: currentImage._id,
        });
        try {
          window.sessionStorage.setItem(abandonKey, "1");
        } catch {
          /* ignore storage failures (private mode, etc.) */
        }
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
        // Refresh server components so ImageFill also shows the HD image.
        router.refresh();
      })
      .catch(() => {
        amplitude.track(EVENTS.PURCHASE_FAILED, {
          imageId: currentImage._id,
          stage: "fulfillment",
        });
        openAlert(
          "error",
          "Image preparation failed — please try again or contact support.",
        );
      })
      .finally(() => setUnlocking(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* -------------------------------------------------------------------------- */
  /*                              COMPONENT RENDER                              */
  /* -------------------------------------------------------------------------- */

  // Show signup prompt if this is a newly generated image by a guest user
  if (justGenerated && isGuestUser) {
    return <GuestSignupPrompt />;
  }

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
      {/* -------------------------------- METADATA -------------------------------- */}
      <div style={{ maxHeight: "100%" }}>
        {justGenerated && (
          <Typography variant="h3" color="text.secondary">
            Your QR Art is Ready!
          </Typography>
        )}

        {/* ------------------------------ ICON BUTTONS ------------------------------ */}
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
            <LikeButton
              image={currentImage}
              user={user}
              customLikeAction={customLikeAction}
            />
          )}

          <ShareButton image={currentImage} index={1} />

          {isOwner && (
            <DeleteButton
              image={currentImage}
              customDeleteAction={customDeleteAction}
            />
          )}
          <CopyButton image={currentImage} />
        </Stack>
        {/* ------------------------------ UNLOCK CARD ------------------------------ */}

        {(justGenerated || isOwner) && (
          <Card
            sx={{
              mb: 2,
              p: 2,
              borderRadius: 2,
              backgroundColor: "rgb(142, 245, 194)",
              border: "1px solid rgba(255,255,255,0.1)",
            }}
          >
            {/* Not yet unlocked */}
            {!currentImage?.unlocked && !unlocking && (
              <>
                <Typography variant="h5" color="text.secondary" sx={{ mb: 1.5 }}>
                  Unlock the HD version
                </Typography>
                <Stack direction="column" sx={{ mb: "1rem" }}>
                  <Stack direction="row" alignItems="center" spacing={0.5}>
                    <DoneIcon />
                    <Typography>HD Image (2048px x 2048px)</Typography>
                  </Stack>
                  <Stack direction="row" alignItems="center" spacing={0.5}>
                    <DoneIcon />
                    <Typography>Remove Watermark</Typography>
                  </Stack>
                  <Stack direction="row" alignItems="center" spacing={0.5}>
                    <DoneIcon />
                    <Typography>Unlock once, download forever</Typography>
                  </Stack>
                </Stack>
                <UnlockButton image={currentImage} />
              </>
            )}

            {/* Generating HD image after payment */}
            {unlocking && (
              <>
                <Typography variant="h5" color="text.secondary" sx={{ mb: 1.5 }}>
                  HD Image Unlocked!
                </Typography>
                <Button
                  variant="contained"
                  color="secondary"
                  disabled
                  startIcon={<CircularProgress size={16} color="inherit" />}
                >
                  Generating HD Image…
                </Button>
              </>
            )}

            {/* HD image ready — show download */}
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

        <Typography variant="h5" align={isMobile ? "center" : "left"}>
          Image Details
        </Typography>
        <List>
          <ListItemText
            primary="Date created"
            secondary={dayjs(currentImage?.created_at).format("MMMM D, YYYY")}
            align={isMobile ? "center" : "left"}
          />
          <ListItemText
            primary="QR Content"
            secondary={currentImage?.content}
            align={isMobile ? "center" : "left"}
          />
          <ListItemText
            primary="Prompt"
            secondary={currentImage?.prompt}
            align={isMobile ? "center" : "left"}
          />
          <ListItemText
            primary="Style"
            secondary={currentImage?.style_title}
            align={isMobile ? "center" : "left"}
          />
          <ListItemText
            primary="Seed"
            secondary={currentImage?.seed}
            align={isMobile ? "center" : "left"}
          />
          <ListItemText
            primary="Image Dimensions"
            secondary={`${currentImage?.width} x ${currentImage?.height} px`}
            align={isMobile ? "center" : "left"}
          />
          <ListItemText
            primary="QR Code Weight"
            secondary={currentImage?.qr_weight}
            align={isMobile ? "center" : "left"}
          />
          <ListItemText
            primary="Image Id"
            secondary={currentImage?._id}
            align={isMobile ? "center" : "left"}
          />
        </List>
      </div>
    </Box>
  );
}
