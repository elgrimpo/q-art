"use client";
// Libraries imports
import React, { useState, useEffect } from "react";
import { List, ListItemText, Typography, Box, Stack, CircularProgress } from "@mui/material";
import dayjs from "dayjs";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useRouter, useSearchParams } from "next/navigation";
import theme from "@/_styles/theme";

//App imports
import DeleteButton from "@/_components/actions/DeleteButton";
import CopyButton from "@/_components/actions/CopyButton";
import LikeButton from "@/_components/actions/LikeButton";
import UnlockButton from "@/_components/actions/UnlockButton";
import ShareButton from "@/_components/actions/ShareButton";
import GuestSignupPrompt from "./GuestSignupPrompt";
import { useStore } from "@/store";
import { unlockImage } from "@/_utils/ImagesUtils";

/* -------------------------------------------------------------------------- */
/*                               COMPONENT START                              */
/* -------------------------------------------------------------------------- */

export default function ImageSidebar({
  image,
  user,
  customDeleteAction,
  customLikeAction,
  isNewGuestImage,
}) {
  /* ---------------------------- DECLARE VARIABLES --------------------------- */
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const { openAlert } = useStore();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isOwner = user?._id === image?.user_id;
  const isGuestUser = !user?._id || user?.is_guest;

  const stripeSessionId = searchParams?.get("stripe_session_id");
  const justGenerated = searchParams?.get("justGenerated") === "true";

  const [unlocking, setUnlocking] = useState(false);
  const [currentImage, setCurrentImage] = useState(image);

  /* -------------------------------- EFFECTS --------------------------------- */

  // Sync local state when the image prop changes (e.g. navigating between images in the modal).
  useEffect(() => { setCurrentImage(image); }, [image]);

  useEffect(() => {
    if (currentImage?.unlocked) return;
    const shouldUnlock = stripeSessionId || currentImage?.unlock_pending;
    if (!shouldUnlock) return;

    setUnlocking(true);
    unlockImage(currentImage._id, stripeSessionId)
      .then((updatedImage) => {
        setCurrentImage(updatedImage);
        // Refresh server components so ImageFill also shows the HD image.
        router.refresh();
      })
      .catch(() => openAlert("error", "Image preparation failed — please try again or contact support."))
      .finally(() => setUnlocking(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* -------------------------------------------------------------------------- */
  /*                              COMPONENT RENDER                              */
  /* -------------------------------------------------------------------------- */

  // Show signup prompt if this is a newly generated image by a guest user
  if (isNewGuestImage && isGuestUser) {
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
        {/* ------------------------------ UNLOCK LOADING / BANNER ------------------------------ */}
        {unlocking && (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
            <CircularProgress size={20} color="secondary" />
            <Typography variant="body2" color="text.secondary">
              Preparing your HD image…
            </Typography>
          </Box>
        )}

        {justGenerated && !currentImage?.unlocked && !unlocking && (
          <Box sx={{ mb: 2, p: 2, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}>
            <Typography variant="body1" color="primary" sx={{ mb: 1, fontWeight: 600 }}>
              Your QR art is ready!
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
              Unlock the HD version for $3.99 — no watermark, 2048×2048px, yours to keep.
            </Typography>
            <UnlockButton image={currentImage} />
          </Box>
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

          {isOwner && !isGuestUser && !(justGenerated && !currentImage?.unlocked) && <UnlockButton image={currentImage} />}
        </Stack>
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
