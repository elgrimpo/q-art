"use client";

// Libraries imports
import React, { useState } from "react";
import { Box, Typography, Skeleton } from "@mui/material";
import { useRouter } from "next/navigation";
import * as amplitude from "@amplitude/analytics-browser";

// App imports
import GenerateForm from "./GenerateForm";
import SimpleDialog from "@/_components/SimpleDialog";
import { useStore } from "@/store";
import { generateImage } from "@/_utils/ImagesUtils";
import { updateGuestCredits } from "@/_utils/userUtils";
/* -------------------------------------------------------------------------- */
/*                               COMPONENT START                              */
/* -------------------------------------------------------------------------- */
export default function Generate() {
  /* ---------------------------- DECLARE VARIABLES --------------------------- */

  const router = useRouter();

  // Context variables
  const {
    user,
    generateFormValues,
    openAlert,
    generatingImage,
    setGeneratingImage,
  } = useStore();
  // Dialog Content
  const [dialogContent, setDialogContent] = useState({});
  const [dialogOpen, setDialogOpen] = useState(false);

  /* -------------------------------- FUNCTIONS ------------------------------- */

  const handleDialogClose = () => {
    setDialogOpen(false);
  };

  const handleInsufficientCredits = () => {
    setDialogContent({
      title: "Insufficient Credits",
      description:
        "You don't have enough credits to generate this image. Please go to your account to purchase additional credits.",
      primaryActionText: "Add Credits",
      primaryAction: () => router.push("/profile"),
      secondaryActionText: "Close",
      secondaryAction: handleDialogClose,
    });
    setDialogOpen(true);
  };

  const handleGenerate = async () => {
    setGeneratingImage(true);
    
    try {
      console.log('Starting image generation with user:', user);

      // Check if user has credits
      if (user?.credits < 1) {
        openAlert("error", "Insufficient credits to generate image");
        setGeneratingImage(false);
        return;
      }

      // Track generation
      amplitude.track("Generate Image", {
        userId: user?.id,
        url: generateFormValues.website,
        style_title: generateFormValues.style_title,
        qr_weight: generateFormValues.qr_weight,
        isGuest: user?.is_guest || false,
      });

      // Generate image
      const image = await generateImage(generateFormValues, user);

      // Success Toaster
      openAlert("success", "Image generated");

      // If guest user, update credits and redirect with flag
      if (user?.is_guest) {
        console.log('Updating guest credits after generation');
        await updateGuestCredits(0);
        window.location.href = `/images/${image._id}?isNewGuestImage=true`;
      } else {
        window.location.href = `/images/${image._id}`;
      }
    } catch (error) {
      console.error('Generation error:', error);
      if (error.message === "InsufficientCredits") {
        openAlert("error", "Insufficient credits to generate image");
      } else {
        openAlert("error", "Image generation failed");
      }
      setGeneratingImage(false);
    }
  };

  /* -------------------------------------------------------------------------- */
  /*                              COMPONENT RENDER                              */
  /* -------------------------------------------------------------------------- */
  return (
    <div className="generate-page">
      {/* ------------------------------ GENERATE FORM ----------------------------- */}
      {!generatingImage ? (
        <GenerateForm handleGenerate={() => handleGenerate()} />
      ) : (
        <Box className="image-container" sx={{ position: "relative" }}>
          <Skeleton
            variant="rounded"
            animation="wave"
            sx={{
              width: "100vw",
              height: { xs: "calc(100vh - 5.3rem)", sm: "calc(100vh - 6rem)" },
            }}
          />
          <Box
            sx={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              textAlign: "center",
            }}
          >
            <Typography variant="h5" align="center">
              Your code is being generated!
            </Typography>
            <Typography variant="h7" align="center">
              This may take up to a minute
            </Typography>
          </Box>
        </Box>
      )}
    </div>
  );
}
