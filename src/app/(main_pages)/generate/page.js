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
    console.log('updateGuestCredits: Starting update');
    console.log('updateGuestCredits: Current session:', JSON.stringify(session, null, 2));
    console.log('updateGuestCredits: New credits value:', newCredits);

    try {
      // Update the session with new credits
      const result = await updateSession({
        ...session,
        user: {
          ...session.user,
          credits: newCredits
        }
      });
      
      console.log('updateGuestCredits: Update result:', JSON.stringify(result, null, 2));

      // Update local state
      useStore.setState({ 
        user: {
          ...user,
          credits: newCredits
        }
      });

      // Verify the update
      if (result?.user?.credits === newCredits) {
        console.log('updateGuestCredits: Credits updated successfully');
        return true;
      } else {
        console.error('updateGuestCredits: Credits update verification failed');
        console.log('updateGuestCredits: Expected:', newCredits);
        console.log('updateGuestCredits: Got:', result?.user?.credits);
        return false;
      }
    } catch (error) {
      console.error('updateGuestCredits: Error updating credits:', error);
      return false;
    }
  };

  const handleGenerate = async () => {
    console.log('handleGenerate: Starting generation process');
    console.log('handleGenerate: Current user:', JSON.stringify(user, null, 2));
    console.log('handleGenerate: Current session:', JSON.stringify(session, null, 2));
    
    setGeneratingImage(true);
    
    try {
      // Check if user has credits
      if (user?.credits < 1) {
        console.log('handleGenerate: Insufficient credits');
        handleInsufficientCredits();
        setGeneratingImage(false);
        return;
      }

      // Track generation
      console.log('handleGenerate: Tracking generation with Amplitude');
      amplitude.track("Generate Image", {
        userId: user?.id,
        url: generateFormValues.website,
        style_title: generateFormValues.style_title,
        qr_weight: generateFormValues.qr_weight,
        isGuest: user?.is_guest || false,
      });

      // Generate image
      console.log('handleGenerate: Calling generateImage');
      const image = await generateImage(generateFormValues, user);
      console.log('handleGenerate: Image generated:', JSON.stringify(image, null, 2));
      
      setGeneratingImage(false);

      // Success Toaster
      openAlert("success", "Image generated successfully!");

      // Update credits and redirect based on user type
      if (user?.is_guest) {
        console.log('handleGenerate: Updating guest credits');
        const newCredits = user.credits - 1;
        console.log('handleGenerate: New credits value:', newCredits);
        
        const updated = await updateGuestCredits(newCredits);
        if (updated) {
          console.log('handleGenerate: Credits updated successfully, redirecting...');
          router.push(`/images/${image._id}?isNewGuestImage=true`);
        } else {
          console.error('handleGenerate: Failed to update credits');
          openAlert("error", "Failed to update credits. Please refresh the page.");
        }
      } else {
        console.log('handleGenerate: Regular user, redirecting without credits update');
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
