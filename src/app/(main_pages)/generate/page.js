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
    // Check if user is logged in
    amplitude.track("Generate Image", {
      userId: user?.id,
      url: generateFormValues.website,
      style_title: generateFormValues.style_title,
      qr_weight: generateFormValues.qr_weight,
    });
    try {
      // Generate image
      const image = await generateImage(generateFormValues, user);

      // Success Toaster
      openAlert("success", "Image generated");

      // Navigate to Image page
      router.push(`/images/${image._id}`);
    } catch (error) {
      if (error.message === "InsufficientCredits") {
        // Dialog for insufficient credits
        handleInsufficientCredits();
      } else {
        // Error Toaster
        openAlert("error", "Image generation failed");
        console.log("Error occurred:", error);
      }
    }

    setGeneratingImage(false);
  };

  /* -------------------------------------------------------------------------- */
  /*                              COMPONENT RENDER                              */
  /* -------------------------------------------------------------------------- */
  if (!user?._id) {
    router.push("/");
  } else {
    return (
      <div className="generate-page">
        {/* TODO: Remove Link after testing */}
        {/* <Link href="/images/65caa2fade09338f1ff33671">image</Link> */}
        {/* ------------------------------ GENERATE FORM ----------------------------- */}
        {!generatingImage ? (
          <GenerateForm handleGenerate={() => handleGenerate()} />
        ) : (
          <Box className="image-container" sx={{ position: "relative" }}>
            <Skeleton
              variant="rounded"
              animation="wave"
              sx={{
                width:"100vw",
                height:{xs: "calc(100vh - 5.3rem)", sm: "calc(100vh - 6rem)"},
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

        {/* --------------------------------- DIALOG --------------------------------- */}

        {/* User Dialog */}
        <SimpleDialog
          title={dialogContent.title}
          description={dialogContent.description}
          primaryActionText={dialogContent.primaryActionText}
          primaryAction={dialogContent.primaryAction}
          secondaryActionText={dialogContent.secondaryActionText}
          secondaryAction={dialogContent.secondaryAction}
          dialogOpen={dialogOpen}
          handleClose={handleDialogClose}
        />
      </div>
    );
  }
}
