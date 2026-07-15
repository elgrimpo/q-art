"use client";
import React, { useEffect, useRef, useState } from "react";
import { Box, Button } from "@mui/material";
import * as amplitude from "@amplitude/analytics-browser";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

import "../../globals.css";
import promptRandomizer from "@/_utils/PromptGenerator";
import { useStore } from "@/store";
import SimpleDialog from "@/_components/SimpleDialog";
import GenerationFormFields from "./(formComponents)/GenerationFormFields";
import GeneratingLoader from "./(formComponents)/GeneratingLoader";
import { startGeneration } from "@/_utils/ImagesUtils";
import { useGenerationPolling } from "@/_utils/useGenerationPolling";
import { selectRandomStyle, RANDOM_STYLE_ID, styles } from "@/_utils/ImageStyles";

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

  const [dialogContent, setDialogContent] = useState({});
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitDisabled, setSubmitDisabled] = useState(true);
  const [jobId, setJobId] = useState(null);

  // Measure the form box's natural height while it's showing the fields, so
  // switching into the loading state can lock to that height instead of
  // resizing to fit the loader's own dimensions.
  const paperBoxRef = useRef(null);
  const [formHeight, setFormHeight] = useState(null);

  useEffect(() => {
    if (generatingImage) return;
    const el = paperBoxRef.current;
    if (!el) return;
    const measure = () => setFormHeight(el.getBoundingClientRect().height);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [generatingImage]);

  // Deep-link support for the /styles/[slug] landing pages: "Generate with
  // this style" (?style=watercolor-qr-code) preselects the matching style;
  // a prompt-idea chip (?style=...&prompt=...) also prefills the prompt
  // field without submitting. Style page slugs are keyword-rich
  // ("watercolor-qr-code"); strip that suffix back off to match ImageStyles
  // by title alone.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const styleParam = params.get("style");
    const promptParam = params.get("prompt");
    if (!styleParam && !promptParam) return;

    const match = styleParam
      ? styles.find(
          (s) =>
            s.id !== RANDOM_STYLE_ID &&
            s.title.toLowerCase().replace(/\s+/g, "-") ===
              styleParam.toLowerCase().replace(/-qr-code$/, ""),
        )
      : null;

    setGenerateFormValues((prev) => ({
      ...prev,
      ...(match && { style_id: match.id, style_title: match.title }),
      ...(promptParam && { prompt: promptParam }),
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      setGenerateFormValues((prev) =>
        prev.prompt === "" ? { ...prev, prompt: promptRandomizer() } : prev,
      );
    }
  }, [generateFormValues]);

  const handleStyleChipClick = (item) => {
    setGenerateFormValues({
      ...generateFormValues,
      style_id: item.id,
      style_title: item.title,
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

  const percent = useGenerationPolling(jobId, {
    onSucceeded: async (image) => {
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
    },
    onFailed: (error) => {
      console.error("handleGenerate: Generation error:", error);
      if (error.message === "InsufficientCredits") {
        handleInsufficientCredits();
      } else {
        openAlert("error", "Failed to generate image. Please try again.");
      }
      setGeneratingImage(false);
    },
  });

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
      if (generateForm.style_id === RANDOM_STYLE_ID) {
        const randomStyle = selectRandomStyle();
        generateForm = {
          ...generateFormValues,
          style_id: randomStyle.id,
          style_title: randomStyle.title,
        };
      }

      const { job_id } = await startGeneration(generateForm, user);
      setJobId(job_id);
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

  return (
    <Box sx={{ mt: 4, width: "100%", maxWidth: "720px" }}>
      <Box
        ref={paperBoxRef}
        sx={{
          backgroundColor: "background.paper",
          border: "1px solid",
          borderColor: "divider",
          borderRadius: "16px",
          width: "100%",
          boxSizing: "border-box",
          padding: generatingImage && formHeight ? 0 : { xs: 2, sm: 3 },
          ...(generatingImage && formHeight ? { height: `${formHeight}px` } : {}),
        }}
      >
        {generatingImage ? (
          <GeneratingLoader fill={Boolean(formHeight)} percent={percent} />
        ) : (
          <Box sx={{ width: "100%" }}>
            <GenerationFormFields
              values={generateFormValues}
              onFieldChange={handleInputChange}
              onStyleChange={handleStyleChipClick}
              onQrWeightChange={(val) =>
                setGenerateFormValues({ ...generateFormValues, qr_weight: val })
              }
              showQrWeight={false}
              urlDisabled={false}
            />

            <Button
              variant="contained"
              color="primary"
              size="large"
              fullWidth
              aria-label="generate"
              disabled={submitDisabled}
              onClick={() => handleGenerate()}
              sx={{
    "&:not(.Mui-disabled)": {
      background: "linear-gradient(90.29deg, #8DDF9C 39%, #73DBCC 99.75%)",
      boxShadow: "none",
    },
   mt: 3
  }}
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
    </Box>
  );
}

export default GenerateForm;
