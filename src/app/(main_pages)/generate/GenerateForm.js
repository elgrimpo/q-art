"use client";
import React, { useEffect, useState } from "react";
import { Box, Button, Chip, Typography } from "@mui/material";
import StyleIcon from "@mui/icons-material/Style";
import * as amplitude from "@amplitude/analytics-browser";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

import "../../globals.css";
import promptRandomizer from "@/_utils/PromptGenerator";
import { useStore } from "@/store";
import SimpleDialog from "@/_components/SimpleDialog";
import UrlPrompt from "./(formComponents)/UrlPrompt";
import StylesModal from "./(formComponents)/StylesModal";
import GeneratingLoader from "./(formComponents)/GeneratingLoader";
import { generateImage } from "@/_utils/ImagesUtils";
import { styles, selectRandomStyle } from "@/_utils/ImageStyles";

// First 6 styles in file order: Random + first 5 named. Reorder ImageStyles.js to curate.
const FEATURED_STYLES = styles.slice(0, 6);

function nextGenerationNumber() {
  if (typeof window === "undefined") return 1;
  try {
    const prev = parseInt(
      window.sessionStorage.getItem("qrai_generation_count") || "0",
      10,
    );
    const next = Number.isNaN(prev) ? 1 : prev + 1;
    window.sessionStorage.setItem("qrai_generation_count", String(next));
    return next;
  } catch {
    return 1;
  }
}

function GenerateForm() {
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

  const [styleModalOpen, setStyleModalOpen] = useState(false);
  const [dialogContent, setDialogContent] = useState({});
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitDisabled, setSubmitDisabled] = useState(true);

  const handleStyleModalOpen = () => setStyleModalOpen(true);
  const handleModalClose = () => setStyleModalOpen(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setGenerateFormValues({ ...generateFormValues, [name]: value });
  };

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

  const handleStyleChipClick = (item) => {
    setGenerateFormValues({
      ...generateFormValues,
      style_id: item.id,
      style_prompt: item.prompt,
      style_title: item.title,
      sd_model: item.sd_model,
      loras: item.loras ?? [],
    });
  };

  const handleDialogClose = () => setDialogOpen(false);

  const handleInsufficientCredits = () => {
    setDialogContent({
      title: "Sign in to keep going",
      description: "Sign in to keep generating and save your images to your profile.",
      primaryActionText: "Sign In",
      primaryAction: () => router.push("/api/auth/signin"),
      secondaryActionText: "Close",
      secondaryAction: handleDialogClose,
    });
    setDialogOpen(true);
  };

  const updateGuestCredits = async (newCredits) => {
    try {
      const result = await updateSession({
        ...session,
        user: { ...session.user, credits: newCredits },
      });
      useStore.setState({ user: { ...user, credits: newCredits } });
      if (result?.user?.credits === newCredits) return true;
      console.error("updateGuestCredits: Credits update verification failed");
      return false;
    } catch (error) {
      console.error("updateGuestCredits: Error updating credits:", error);
      return false;
    }
  };

  const handleGenerate = async () => {
    setGeneratingImage(true);
    try {
      const generationNumber = nextGenerationNumber();
      amplitude.track("Generate Image", {
        userId: user?.id,
        url: generateFormValues.website,
        style_title: generateFormValues.style_title,
        qr_weight: generateFormValues.qr_weight,
        isGuest: user?.is_guest || false,
        generation_number: generationNumber,
        is_first_generation: generationNumber === 1,
      });

      let generateForm = generateFormValues;
      if (generateForm.style_id === 1) {
        const randomStyle = selectRandomStyle();
        generateForm = {
          ...generateFormValues,
          style_id: randomStyle.id,
          style_prompt: randomStyle.prompt,
          style_title: randomStyle.title,
          sd_model: randomStyle.sd_model,
          loras: randomStyle.loras ?? [],
        };
      }

      const image = await generateImage(generateForm, user);
      setGeneratingImage(false);
      openAlert("success", "Image generated successfully!");

      if (user?.is_guest) {
        const newCredits = user.credits - 1;
        const updated = await updateGuestCredits(newCredits);
        if (updated) {
          router.push(`/images/${image._id}?justGenerated=true`);
        } else {
          console.error("handleGenerate: Failed to update credits");
          openAlert("error", "Failed to update credits. Please refresh the page.");
        }
      } else {
        router.push(`/images/${image._id}?justGenerated=true`);
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

  // Overflow: if the selected style is not in the featured 6, show it as an extra chip
  const featuredIds = new Set(FEATURED_STYLES.map((s) => s.id));
  const overflowStyle = !featuredIds.has(generateFormValues.style_id)
    ? styles.find((s) => s.id === generateFormValues.style_id)
    : null;

  return (
    <Box sx={{ mt: 4, width: "100%", maxWidth: "720px" }}>
      <Box
        sx={{
          backgroundColor: "background.paper",
          border: "1px solid",
          borderColor: "divider",
          borderRadius: "16px",
          width: "100%",
          padding: { xs: 2, sm: 3 },
        }}
      >
        {generatingImage ? (
          <GeneratingLoader />
        ) : (
          <Box sx={{ width: "100%" }}>
            <UrlPrompt handleInputChange={handleInputChange} />

            {/* Style section */}
            <Box sx={{ mt: 2 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, mb: 1 }}>
                <StyleIcon sx={{ fontSize: "1rem" }} color="primary" />
                <Typography variant="h6">Style</Typography>
              </Box>
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                {FEATURED_STYLES.map((style) => (
                  <Chip
                    key={style.id + style.title}
                    label={style.title}
                    variant={generateFormValues.style_id === style.id ? "filled" : "outlined"}
                    color="primary"
                    onClick={() => handleStyleChipClick(style)}
                  />
                ))}
                {overflowStyle && (
                  <Chip
                    key={overflowStyle.id + overflowStyle.title}
                    label={overflowStyle.title}
                    variant="filled"
                    color="primary"
                  />
                )}
                <Chip
                  label="+"
                  variant="outlined"
                  color="primary"
                  onClick={handleStyleModalOpen}
                />
              </Box>
            </Box>

            <Button
              variant="contained"
              color="primary"
              size="large"
              fullWidth
              aria-label="generate"
              disabled={submitDisabled}
              onClick={() => handleGenerate()}
              sx={{ mt: 3 }}
            >
              Generate
            </Button>
          </Box>
        )}
      </Box>

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
    </Box>
  );
}

export default GenerateForm;
