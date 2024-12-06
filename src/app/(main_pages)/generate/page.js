"use client";

// Libraries imports
import React, { useState } from "react";
import { Box, Typography, Skeleton } from "@mui/material";
import { useRouter } from "next/navigation";
import * as amplitude from "@amplitude/analytics-browser";
import { useSession } from "next-auth/react";

// App imports
import GenerateForm from "./GenerateForm";
import SimpleDialog from "@/_components/SimpleDialog";
import { useStore } from "@/store";
import { generateImage } from "@/_utils/ImagesUtils";

/* -------------------------------------------------------------------------- */
/*                               COMPONENT START                              */
/* -------------------------------------------------------------------------- */
export default function Generate() {
  /* ---------------------------- DECLARE VARIABLES --------------------------- */

  const router = useRouter();
  const { data: session, update: updateSession } = useSession();

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
    const description = user?.is_guest 
      ? "Sign up to get more credits and unlock all features!"
      : "You don't have enough credits to generate this image. Please go to your account to purchase additional credits.";
    
    setDialogContent({
      title: "Insufficient Credits",
      description,
      primaryActionText: user?.is_guest ? "Sign Up" : "Add Credits",
      primaryAction: () => router.push(user?.is_guest ? "/api/auth/signin" : "/profile"),
      secondaryActionText: "Close",
      secondaryAction: handleDialogClose,
    });
    setDialogOpen(true);
  };

  const updateGuestCredits = async (newCredits) => {

    try {
      // Update the session with new credits
      const result = await updateSession({
        ...session,
        user: {
          ...session.user,
          credits: newCredits
        }
      });
      
      // Update local state
      useStore.setState({ 
        user: {
          ...user,
          credits: newCredits
        }
      });

      // Verify the update
      if (result?.user?.credits === newCredits) {
        return true;
      } else {
        console.error('updateGuestCredits: Credits update verification failed');
        return false;
      }
    } catch (error) {
      console.error('updateGuestCredits: Error updating credits:', error);
      return false;
    }
  };

  const handleGenerate = async () => {
    
    setGeneratingImage(true);
    
    try {
      // Check if user has credits
      if (user?.credits < 1) {
        handleInsufficientCredits();
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
      
      setGeneratingImage(false);

      // Success Toaster
      openAlert("success", "Image generated successfully!");

      // Update credits and redirect based on user type
      if (user?.is_guest) {
        const newCredits = user.credits - 1;
        
        const updated = await updateGuestCredits(newCredits);
        if (updated) {
          router.push(`/images/${image._id}?isNewGuestImage=true`);
        } else {
          console.error('handleGenerate: Failed to update credits');
          openAlert("error", "Failed to update credits. Please refresh the page.");
        }
      } else {
        router.push(`/images/${image._id}`);
      }
    } catch (error) {
      console.error('handleGenerate: Generation error:', error);
      if (error.message === "InsufficientCredits") {
        handleInsufficientCredits();
      } else {
        openAlert("error", "Failed to generate image. Please try again.");
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

      {/* ----------------------------- DIALOG MODAL ----------------------------- */}
      <SimpleDialog
        open={dialogOpen}
        onClose={handleDialogClose}
        title={dialogContent.title}
        description={dialogContent.description}
        primaryActionText={dialogContent.primaryActionText}
        primaryAction={dialogContent.primaryAction}
        secondaryActionText={dialogContent.secondaryActionText}
        secondaryAction={dialogContent.secondaryAction}
      />
    </div>
  );
}
