"use client";

// Libraries imports
import React, { useState } from "react";
import { CircularProgress, Box, Typography } from "@mui/material";
import useMediaQuery from "@mui/material/useMediaQuery";
import theme from "@/_styles/theme";
import { useRouter } from "next/navigation";

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
  const { user, generateFormValues, openAlert } = useStore();


  // Switch between Form and Image view for mobile screen
  const [formSubmitted, setFormSubmitted] = useState(false);

  // Dialog Content
  const [dialogContent, setDialogContent] = useState({});
  const [dialogOpen, setDialogOpen] = useState(false);

  /* -------------------------------- FUNCTIONS ------------------------------- */

  const handleDialogClose = () => {
    setDialogOpen(false);
  };

  const handleNotLoggedIn = () => {
    setDialogContent({
      title: "Not logged in",
      description: "Please log in to generate a QC Code image.",
      primaryActionText: "Log In",
      primaryAction: () => router.push("api/auth/signin"),
      secondaryActionText: "Close",
      secondaryAction: handleDialogClose,
    });
    setDialogOpen(true);
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
    setFormSubmitted(true);
    // Check if user is logged in
    if (!user._id) {
      // Open Dialog
      handleNotLoggedIn();
    } else {
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
    }
    setFormSubmitted(false);
  };

  /* -------------------------------------------------------------------------- */
  /*                              COMPONENT RENDER                              */
  /* -------------------------------------------------------------------------- */

  return (
    <div className="generate-page">
      {/* TODO: Remove Link after testing */}
      {/* <Link href="/images/65caa2fade09338f1ff33671">image</Link> */}
      {/* ------------------------------ GENERATE FORM ----------------------------- */}
      {!formSubmitted ? (
        <GenerateForm
          handleGenerate={() => handleGenerate()}
          setFormSubmitted={setFormSubmitted}
        />
      ) : (
        <Box className="image-container">
          <Box className="loading-box">
            <CircularProgress color="secondary" />
          </Box>
        </Box>
      )}

      {/* --------------------------------- DIALOG --------------------------------- */}

      {/* USER NOT LOGGED IN */}
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
