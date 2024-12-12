"use client";
// Libraries imports
import React, { useEffect, useState } from "react";
import { Button, Box, Stack, Typography, Divider } from "@mui/material";
import DiamondTwoToneIcon from "@mui/icons-material/DiamondTwoTone";
import * as amplitude from "@amplitude/analytics-browser";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

import theme from "@/_styles/theme";

// App imports
import "../../globals.css";
import promptRandomizer from "@/_utils/PromptGenerator";
import { useStore } from "@/store";
import { calculateCredits } from "@/_utils/utils";
import SimpleDialog from "@/_components/SimpleDialog";
import UrlPrompt from "./(formComponents)/UrlPrompt";
import StylesModal from "./(formComponents)/StylesModal";
import GeneratingLoader from "./(formComponents)/GeneratingLoader";
import SettingsModal from "./(formComponents)/SettingsModal";
import { generateImage } from "@/_utils/ImagesUtils";

/* -------------------------------------------------------------------------- */
/*                               COMPONENT START                              */
/* -------------------------------------------------------------------------- */

function GenerateForm() {
  /* ---------------------------- DECLARE VARIABLES --------------------------- */

  // Context variables
  const {
    user,
    generateFormValues,
    setGenerateFormValues,
    openAlert,
    generatingImage,
    setGeneratingImage,
  } = useStore();

  const router = useRouter();
  const { data: session, update: updateSession } = useSession();

  // Modules Modal (Prompt keywords, Negative Prompt, SD Models)
  const [styleModalOpen, setStyleModalOpen] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);

  // Open Modal
  const handleStyleModalOpen = () => {
    setStyleModalOpen(true);
  };

  // Open Modal
  const handleSettingsModalOpen = () => {
    setSettingsModalOpen(true);
  };

  // Open Modules Modal
  const handleModalClose = () => {
    setStyleModalOpen(false);
    setSettingsModalOpen(false);
  };

  // Dialog Content
  const [dialogContent, setDialogContent] = useState({});
  const [dialogOpen, setDialogOpen] = useState(false);

  // Submit Button state
  const [submitDisabled, setSubmitDisabled] = useState(true);

  // Track user credits
  const [price, setPrice] = useState(calculateCredits({ generate: 1 }));

  /* -------------------------------- FUNCTIONS ------------------------------- */

  // Handle input change
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setGenerateFormValues({ ...generateFormValues, [name]: value });
  };

  //Track Form Values
  useEffect(() => {
    if (generateFormValues.website && generateFormValues.prompt) {
      setSubmitDisabled(false);
    } else {
      setSubmitDisabled(true);
    }

    if (generateFormValues.prompt === "") {
      setGenerateFormValues({
        ...generateFormValues,
        prompt: promptRandomizer(),
      });
    }
  }, [generateFormValues]);

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
      primaryAction: () =>
        router.push(user?.is_guest ? "/api/auth/signin" : "/profile"),
      secondaryActionText: "Close",
      secondaryAction: handleDialogClose,
    });
    setDialogOpen(true);
  };

  const updateGuestCredits = async (newCredits) => {
    try {
      const result = await updateSession({
        ...session,
        user: {
          ...session.user,
          credits: newCredits,
        },
      });

      useStore.setState({
        user: {
          ...user,
          credits: newCredits,
        },
      });

      if (result?.user?.credits === newCredits) {
        return true;
      } else {
        console.error("updateGuestCredits: Credits update verification failed");
        return false;
      }
    } catch (error) {
      console.error("updateGuestCredits: Error updating credits:", error);
      return false;
    }
  };

  const handleGenerate = async () => {
    setGeneratingImage(true);

    try {
      if (user?.credits < 1) {
        handleInsufficientCredits();
        setGeneratingImage(false);
        return;
      }

      amplitude.track("Generate Image", {
        userId: user?.id,
        url: generateFormValues.website,
        style_title: generateFormValues.style_title,
        qr_weight: generateFormValues.qr_weight,
        isGuest: user?.is_guest || false,
      });

      const image = await generateImage(generateFormValues, user);

      setGeneratingImage(false);
      openAlert("success", "Image generated successfully!");

      if (user?.is_guest) {
        const newCredits = user.credits - 1;
        const updated = await updateGuestCredits(newCredits);

        if (updated) {
          router.push(`/images/${image._id}?isNewGuestImage=true`);
        } else {
          console.error("handleGenerate: Failed to update credits");
          openAlert(
            "error",
            "Failed to update credits. Please refresh the page."
          );
        }
      } else {
        router.push(`/images/${image._id}`);
      }
    } catch (error) {
      console.error("handleGenerate: Generation error:", error);
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
    <Box
      sx={{
        mt: 4,
        width: "100%",
        maxWidth: "720px",
      }}
    >
      <Box
        sx={{
          backgroundColor: theme.palette.primary.light,
          borderRadius: "8px",
          width: "100%",
          padding: 2,
        }}
      >
        {generatingImage ? (
          <GeneratingLoader />
        ) : (
          <Box sx={{ width: "100%" }}>
            <UrlPrompt handleInputChange={handleInputChange} />

            <Stack
              direction={{xs: "column", sm: "row"}}
              spacing={2}
              alignItems="stretch"
              sx={{ width: "100%", mb: 2, mt: 1 }}
            >
              <Button
                color="primary"
                variant="contained"
                sx={{ width: {xs: "100%", sm: "50%"} }}
                onClick={handleStyleModalOpen}
              >
                Style: {generateFormValues.style_title}
              </Button>

              <Button
                color="primary"
                variant="contained"
                sx={{ width: {xs: "100%", sm: "50%"} }}
                onClick={handleSettingsModalOpen}
              >
                Advanced Settings
              </Button>
            </Stack>
            <Divider />

            <Button
              variant="contained"
              color="secondary"
              size="large"
              aria-label="generate"
              sx={{ width: "100%", mt: "1rem" }}
              disabled={submitDisabled}
              onClick={() => handleGenerate()}
            >
              <Typography
                variant="body1"
                component="div"
                sx={{
                  display: "flex",
                  alignItems: "center",
                  flexWrap: "wrap",
                }}
              >
                Generate ( {price}
                <DiamondTwoToneIcon
                  fontSize="small"
                  color="primary"
                  sx={{ mr: "4px" }}
                />{" "}
                )
              </Typography>
            </Button>
          </Box>
        )}
      </Box>

      {/* --------------------------------- Dialog --------------------------------- */}

      {/* Dialog Modal */}
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

      <StylesModal open={styleModalOpen} handleClose={handleModalClose} />

      <SettingsModal
        open={settingsModalOpen}
        handleClose={handleModalClose}
        handleInputChange={handleInputChange}
      />
    </Box>
  );
}

export default GenerateForm;
