"use client";

import React, { useState, useRef, useEffect } from "react";
import { useStore } from "@/store";
import {
  Box,
  Typography,
  Button,
  Stack,
  IconButton,
} from "@mui/material";
import AutoFixHighIcon from "@mui/icons-material/AutoFixHigh";
import ShuffleIcon from "@mui/icons-material/Shuffle";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { useRouter } from "next/navigation";
import GenerationFormFields from "@/app/(main_pages)/generate/(formComponents)/GenerationFormFields";

import { styles, selectRandomStyle } from "@/_utils/ImageStyles";
import { generateImage } from "@/_utils/ImagesUtils";
import { qrWeightToSlider } from "@/_utils/qrWeight";

const GIF_URL =
  "https://i.giphy.com/media/v1.Y2lkPTc5MGI3NjExNXd0ZmY4N3VweW54ejIwN29yaGQxcmdtOWh5aGZuMG1wZW5mdHprYyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/R8dDMt8IgVvhK/giphy.gif";

// Border/text/label/disabled colors now come from the theme's MuiOutlinedInput
// and MuiInputLabel defaults (see _styles/theme.js) — no per-field sx needed.

const GENERATION_ERRORS = new Set(["GenerationFailed", "InsufficientCredits"]);
const isGenerationFailure = (err) => GENERATION_ERRORS.has(err?.message);

function initFormValues(image, isOwner = true) {
  const img = image ?? {};
  const sourceStyle = styles.find((s) => s.title === img.style_title) ?? styles[0];
  return {
    website: isOwner ? (img.content ?? "") : "",
    prompt: img.prompt ?? "",
    style_id: sourceStyle.id,
    style_title: sourceStyle.title,
    style_prompt: sourceStyle.prompt,
    loras: sourceStyle.loras ?? [],
    sd_model: img.sd_model ?? "cyberrealistic_v40_151857.safetensors",
    qr_weight: qrWeightToSlider(img.qr_weight ?? 0.5),
  };
}

export default function IteratePanel({ image = {}, isOpen, onOpen, onClose, onGeneratingChange, isOwner = true }) {
  const router = useRouter();
  const originalStyleTitle = useRef(image?.style_title ?? "");

  const iterateSession = useStore((s) => s.iterateSession);
  const setIterateSession = useStore((s) => s.setIterateSession);
  const clearIterateSession = useStore((s) => s.clearIterateSession);

  // Generating state lives in the store so it survives modal close/reopen
  const generating = iterateSession?.imageId === image?._id && !!iterateSession?.generating;
  const generatingError = iterateSession?.imageId === image?._id && !!iterateSession?.error;

  const [formValues, setFormValues] = useState(() => initFormValues(image, isOwner));

  const isActive = generating || generatingError;

  useEffect(() => {
    onGeneratingChange?.(isActive);
  }, [isActive]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setFormValues(initFormValues(image, isOwner));
  }, [image?._id]); // eslint-disable-line react-hooks/exhaustive-deps

  const buildPayload = (trigger) => {
    if (trigger === "newVariation") {
      const sourceStyle = styles.find((s) => s.title === image.style_title) ?? styles[0];
      return {
        website: image.content ?? "",
        prompt: image.prompt ?? "",
        style_id: sourceStyle.id,
        style_title: sourceStyle.title,
        style_prompt: sourceStyle.prompt,
        loras: sourceStyle.loras ?? [],
        sd_model: image.sd_model,
        qr_weight: qrWeightToSlider(image.qr_weight ?? 0.5),
        negative_prompt: image.negative_prompt ?? "",
        seed: -1,
      };
    }

    let style_id = formValues.style_id;
    let style_title = formValues.style_title;
    let style_prompt = formValues.style_prompt;
    let loras = formValues.loras;
    let sd_model = formValues.sd_model;

    if (style_id === 1) {
      const resolved = selectRandomStyle();
      style_id = resolved.id;
      style_title = resolved.title;
      style_prompt = resolved.prompt;
      loras = resolved.loras ?? [];
      sd_model = resolved.sd_model;
    }

    const seed = style_title !== originalStyleTitle.current ? -1 : image.seed;

    return {
      website: formValues.website,
      prompt: formValues.prompt,
      style_id,
      style_title,
      style_prompt,
      loras,
      sd_model,
      qr_weight: formValues.qr_weight,
      negative_prompt: image.negative_prompt ?? "",
      seed,
    };
  };

  const handleGenerate = async (trigger) => {
    const payload = buildPayload(trigger);
    setIterateSession({ imageId: image._id, generating: true, error: false, payload, trigger });
    try {
      const newImage = await generateImage(payload);
      clearIterateSession();
      router.push(`/images/${newImage._id}`);
    } catch (err) {
      if (isGenerationFailure(err)) {
        setIterateSession({ imageId: image._id, generating: false, error: true, payload, trigger });
      } else {
        clearIterateSession();
      }
    }
  };

  const handleRetry = async () => {
    if (!iterateSession?.payload) return;
    const { payload, trigger } = iterateSession;
    setIterateSession({ imageId: image._id, generating: true, error: false, payload, trigger });
    try {
      const newImage = await generateImage(payload);
      clearIterateSession();
      router.push(`/images/${newImage._id}`);
    } catch (err) {
      if (isGenerationFailure(err)) {
        setIterateSession({ imageId: image._id, generating: false, error: true, payload, trigger });
      } else {
        clearIterateSession();
      }
    }
  };

  const handleBackToImage = () => clearIterateSession();

  const isFormValid =
    formValues.prompt.trim().length > 0 &&
    (isOwner || formValues.website.trim().length > 0);

  return (
    <>
      {/* Inline generating / error state */}
      {isActive && (
        <Box
          data-testid="generating-inline"
          sx={{
            border: "1px solid",
            borderColor: "divider",
            borderRadius: "16px",
            bgcolor: "background.well",
            overflow: "hidden",
          }}
        >
          {!generatingError ? (
            <Box sx={{ position: "relative", aspectRatio: "1/1" }}>
              <Box
                component="img"
                src={GIF_URL}
                alt="Generating…"
                sx={{ width: "100%", height: "100%", display: "block", objectFit: "cover", objectPosition: "center" }}
              />
              <Box
                sx={{
                  position: "absolute",
                  inset: 0,
                  background: "linear-gradient(to top, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.35) 45%, transparent 70%)",
                }}
              />
              <Box sx={{ position: "absolute", bottom: 0, left: 0, right: 0, p: "20px 22px" }}>
                <Typography variant="h5" sx={{ fontSize: "30px", lineHeight: 1.15, color: "primary.main" }}>
                  Generating another piece of art…
                </Typography>
                <Typography variant="body2" sx={{ mt: 0.75, lineHeight: 1.45 }}>
                  Hang tight, this takes about a minute.
                </Typography>
              </Box>
            </Box>
          ) : (
            <Box sx={{ p: "20px 22px" }}>
              <Typography variant="h5" sx={{ fontSize: "20px", lineHeight: 1.1, color: "text.primary", mb: 1 }}>
                Something went wrong
              </Typography>
              <Typography variant="body2" sx={{ mb: 3, lineHeight: 1.45 }}>
                Generation failed. You can retry or go back to the image.
              </Typography>
              <Stack direction="row" spacing={2}>
                <Button variant="contained" color="primary" onClick={handleRetry}>
                  Retry
                </Button>
                <Button variant="outlined" color="primary" onClick={handleBackToImage}>
                  Back to image
                </Button>
              </Stack>
            </Box>
          )}
        </Box>
      )}

      {/* DEFAULT PANEL */}
      {!isOpen && !isActive && (
        <Stack spacing={2}>
          {isOwner && (
            <Box
              onClick={() => handleGenerate("newVariation")}
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1.75,
                p: "16px 18px",
                border: "1px solid",
                borderColor: "divider",
                borderRadius: "16px",
                bgcolor: "background.well",
                cursor: "pointer",
                "&:hover": { borderColor: "primary.main" },
              }}
            >
              <Box sx={{ flexShrink: 0, width: 44, height: 44, borderRadius: "12px", bgcolor: "rgba(112, 225, 149, 0.08)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <ShuffleIcon sx={{ color: "primary.main", fontSize: 22 }} />
              </Box>
              <Box>
                <Typography variant="h5" sx={{ fontSize: "22px", lineHeight: 1.1, color: "primary.main" }}>New Variation</Typography>
                <Typography variant="body2" sx={{ mt: 0.5, lineHeight: 1.45 }}>Same style, new random seed.</Typography>
              </Box>
            </Box>
          )}

          <Box
            onClick={onOpen}
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1.75,
              p: "20px 22px",
              border: "1px solid",
              borderColor: "divider",
              borderRadius: "16px",
              bgcolor: "background.well",
              cursor: "pointer",
              "&:hover": { borderColor: "primary.main" },
            }}
          >
            <Box sx={{ flexShrink: 0, width: 44, height: 44, borderRadius: "12px", bgcolor: "rgba(112, 225, 149, 0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <AutoFixHighIcon sx={{ color: "primary.main", fontSize: 22 }} />
            </Box>
            <Box>
              <Typography variant="h5" sx={{ fontSize: "22px", lineHeight: 1.1, color: "primary.main" }}>
                {isOwner ? "Iterate this image" : "Make it your own"}
              </Typography>
              <Typography variant="body2" sx={{ mt: 0.5, lineHeight: 1.45 }}>
                {isOwner
                  ? "Edit prompt, style, or QR weight and generate a new version."
                  : "Enter a URL and customise the prompt and style to generate your version."}
              </Typography>
            </Box>
          </Box>
        </Stack>
      )}

      {/* ITERATE FORM */}
      {isOpen && !isActive && (
        <Box sx={{ display: "flex", flexDirection: "column" }}>
          {/* Form card */}
          <Box
            sx={{
              border: "1px solid",
              borderColor: "divider",
              borderRadius: "16px",
              bgcolor: "background.well",
              p: "20px 22px",
            }}
          >
            {/* Header: back chevron + title/subtitle */}
            <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1.5, mb: 2.5 }}>
              <IconButton
                aria-label="back"
                onClick={onClose}
                sx={{ color: "primary.main", mt: "-2px", ml: "-8px", flexShrink: 0 }}
              >
                <ArrowBackIcon />
              </IconButton>
              <Box>
                <Typography variant="h5" sx={{ fontSize: "22px", lineHeight: 1.1, color: "primary.main" }}>
                  {isOwner ? "Iterate this image" : "Make it your own"}
                </Typography>
                <Typography variant="body2" sx={{ mt: 0.5, lineHeight: 1.45 }}>
                  {isOwner
                    ? "Edit prompt, style, or QR weight and generate a new version."
                    : "Enter a URL and customise the prompt and style to generate your version."}
                </Typography>
              </Box>
            </Box>

            <GenerationFormFields
              values={formValues}
              onFieldChange={(e) =>
                setFormValues((prev) => ({ ...prev, [e.target.name]: e.target.value }))
              }
              onStyleChange={(style) =>
                setFormValues((prev) => ({
                  ...prev,
                  style_id: style.id,
                  style_title: style.title,
                  style_prompt: style.prompt,
                  loras: style.loras ?? [],
                  sd_model: style.sd_model,
                }))
              }
              onQrWeightChange={(val) =>
                setFormValues((prev) => ({ ...prev, qr_weight: val }))
              }
              showQrWeight={true}
              urlDisabled={isOwner}
            />
          </Box>

          {/* Generate button — sticky at bottom of scroll container */}
          <Box
            sx={{
              position: "sticky",
              bottom: 0,
              pt: 1.5,
              pb: 1,
              bgcolor: "background.default",
            }}
          >
            <Button
              variant="contained"
              color="primary"
              size="large"
              fullWidth
              disabled={!isFormValid}
              onClick={() => handleGenerate("iterate")}
            >
              Generate
            </Button>
          </Box>
        </Box>
      )}
    </>
  );
}
