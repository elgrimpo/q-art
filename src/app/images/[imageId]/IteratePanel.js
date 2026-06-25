"use client";

import React, { useState, useRef, useEffect } from "react";
import { useStore } from "@/store";
import {
  Box,
  Typography,
  Button,
  TextField,
  Slider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Stack,
  Divider,
  IconButton,
} from "@mui/material";
import AutoFixHighIcon from "@mui/icons-material/AutoFixHigh";
import ShuffleIcon from "@mui/icons-material/Shuffle";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { useRouter } from "next/navigation";

import { styles, selectRandomStyle } from "@/_utils/ImageStyles";
import { generateImage } from "@/_utils/ImagesUtils";
import { qrWeightToSlider, QR_SLIDER_MIN, QR_SLIDER_MAX } from "@/_utils/qrWeight";

const GIF_URL =
  "https://i.giphy.com/media/v1.Y2lkPTc5MGI3NjExNXd0ZmY4N3VweW54ejIwN29yaGQxcmdtOWh5aGZuMG1wZW5mdHprYyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/R8dDMt8IgVvhK/giphy.gif";

const DARK_FIELD_SX = {
  "& .MuiOutlinedInput-root": {
    "& fieldset": { borderColor: "#2e2e2e" },
    "&:hover fieldset": { borderColor: "#4e4e4e" },
    "&.Mui-focused fieldset": { borderColor: "primary.main" },
  },
  "& .MuiInputBase-input": { color: "#f0f0f0" },
  "& .MuiInputLabel-root": { color: "#7d7d7d" },
  "& .MuiInputLabel-root.Mui-focused": { color: "primary.main" },
};

const DISABLED_FIELD_SX = {
  ...DARK_FIELD_SX,
  "& .MuiInputBase-input.Mui-disabled": { color: "#5d5d5d", WebkitTextFillColor: "#5d5d5d" },
  "& .MuiOutlinedInput-root.Mui-disabled .MuiOutlinedInput-notchedOutline": { borderColor: "#2a2a2a" },
  "& .MuiInputLabel-root.Mui-disabled": { color: "#4a4a4a" },
};

const GENERATION_ERRORS = new Set(["GenerationFailed", "InsufficientCredits"]);
const isGenerationFailure = (err) => GENERATION_ERRORS.has(err?.message);

function initFormValues(image, isOwner = true) {
  const sourceStyle = styles.find((s) => s.title === image.style_title) ?? styles[0];
  return {
    prompt: image.prompt ?? "",
    styleId: sourceStyle.id,
    styleTitle: sourceStyle.title,
    stylePrompt: sourceStyle.prompt,
    styleLoras: sourceStyle.loras ?? [],
    sdModel: image.sd_model ?? "cyberrealistic_v40_151857.safetensors",
    qrWeight: qrWeightToSlider(image.qr_weight ?? 0.5),
    url: isOwner ? (image.content ?? "") : "",
  };
}

export default function IteratePanel({ image = {}, isOpen, onOpen, onClose, onGeneratingChange, isOwner = true }) {
  const router = useRouter();
  const originalStyleTitle = useRef(image.style_title ?? "");

  const iterateSession = useStore((s) => s.iterateSession);
  const setIterateSession = useStore((s) => s.setIterateSession);
  const clearIterateSession = useStore((s) => s.clearIterateSession);

  // Generating state lives in the store so it survives modal close/reopen
  const generating = iterateSession?.imageId === image._id && !!iterateSession?.generating;
  const generatingError = iterateSession?.imageId === image._id && !!iterateSession?.error;

  const [formValues, setFormValues] = useState(() => initFormValues(image, isOwner));
  const [promptTouched, setPromptTouched] = useState(false);

  const isActive = generating || generatingError;

  useEffect(() => {
    onGeneratingChange?.(isActive);
  }, [isActive]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleStyleClick = (item) => {
    setFormValues((prev) => ({
      ...prev,
      styleId: item.id,
      styleTitle: item.title,
      stylePrompt: item.prompt,
      styleLoras: item.loras ?? [],
      sdModel: item.sd_model,
    }));
  };

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

    let styleId = formValues.styleId;
    let styleTitle = formValues.styleTitle;
    let stylePrompt = formValues.stylePrompt;
    let styleLoras = formValues.styleLoras;
    let sdModel = formValues.sdModel;

    if (styleId === 1) {
      const resolved = selectRandomStyle();
      styleId = resolved.id;
      styleTitle = resolved.title;
      stylePrompt = resolved.prompt;
      styleLoras = resolved.loras ?? [];
      sdModel = resolved.sd_model;
    }

    const seed = styleTitle !== originalStyleTitle.current ? -1 : image.seed;

    return {
      website: formValues.url,
      prompt: formValues.prompt,
      style_id: styleId,
      style_title: styleTitle,
      style_prompt: stylePrompt,
      loras: styleLoras,
      sd_model: sdModel,
      qr_weight: formValues.qrWeight,
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
    (isOwner || formValues.url.trim().length > 0);

  return (
    <>
      {/* Inline generating / error state */}
      {isActive && (
        <Box
          data-testid="generating-inline"
          sx={{
            border: "1px solid #2e2e2e",
            borderRadius: "16px",
            bgcolor: "#0e0e0e",
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
                <Typography variant="body2" sx={{ color: "#d8d8d8", mt: 0.75, lineHeight: 1.45 }}>
                  Hang tight, this takes about a minute.
                </Typography>
              </Box>
            </Box>
          ) : (
            <Box sx={{ p: "20px 22px" }}>
              <Typography variant="h5" sx={{ fontSize: "20px", lineHeight: 1.1, color: "#e0e0e0", mb: 1 }}>
                Something went wrong
              </Typography>
              <Typography variant="body2" sx={{ color: "#b8b8b8", mb: 3, lineHeight: 1.45 }}>
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
                border: "1px solid #2e2e2e",
                borderRadius: "16px",
                bgcolor: "#0e0e0e",
                cursor: "pointer",
                "&:hover": { borderColor: "primary.main" },
              }}
            >
              <Box sx={{ flexShrink: 0, width: 44, height: 44, borderRadius: "12px", bgcolor: "rgba(112, 225, 149, 0.08)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <ShuffleIcon sx={{ color: "primary.main", fontSize: 22 }} />
              </Box>
              <Box>
                <Typography variant="h5" sx={{ fontSize: "22px", lineHeight: 1.1, color: "primary.main" }}>New Variation</Typography>
                <Typography variant="body2" sx={{ color: "#b8b8b8", mt: 0.5, lineHeight: 1.45 }}>Same style, new random seed.</Typography>
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
              border: "1px solid #2e2e2e",
              borderRadius: "16px",
              bgcolor: "#0e0e0e",
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
              <Typography variant="body2" sx={{ color: "#b8b8b8", mt: 0.5, lineHeight: 1.45 }}>
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
              border: "1px solid #2e2e2e",
              borderRadius: "16px",
              bgcolor: "#0e0e0e",
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
                <Typography variant="body2" sx={{ color: "#b8b8b8", mt: 0.5, lineHeight: 1.45 }}>
                  {isOwner
                    ? "Edit prompt, style, or QR weight and generate a new version."
                    : "Enter a URL and customise the prompt and style to generate your version."}
                </Typography>
              </Box>
            </Box>

            <Stack
              spacing={2.5}
              divider={<Divider sx={{ borderColor: "#1e1e1e" }} />}
            >
              {/* URL */}
              <TextField
                label="URL"
                name="url"
                fullWidth
                size="small"
                disabled={isOwner}
                value={formValues.url}
                onChange={
                  !isOwner
                    ? (e) => setFormValues((prev) => ({ ...prev, url: e.target.value }))
                    : undefined
                }
                sx={isOwner ? DISABLED_FIELD_SX : DARK_FIELD_SX}
              />

              {/* Prompt */}
              <TextField
                label="Prompt"
                name="prompt"
                multiline
                minRows={3}
                fullWidth
                value={formValues.prompt}
                onChange={(e) => setFormValues((prev) => ({ ...prev, prompt: e.target.value }))}
                onBlur={() => setPromptTouched(true)}
                error={promptTouched && formValues.prompt.trim().length === 0}
                helperText={promptTouched && formValues.prompt.trim().length === 0 ? "Prompt is required" : ""}
                inputProps={{ "aria-label": "prompt" }}
                sx={DARK_FIELD_SX}
              />

              {/* Style accordion */}
              <Accordion
                disableGutters
                TransitionProps={{ unmountOnExit: true }}
                sx={{
                  bgcolor: "#161616",
                  border: "1px solid #2e2e2e",
                  borderRadius: "12px !important",
                  "&:before": { display: "none" },
                }}
              >
                <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: "primary.main" }} />}>
                  <Typography sx={{ color: "#b8b8b8" }}>
                    Style:{" "}
                    <Box component="span" sx={{ color: "primary.main", fontWeight: 700 }}>
                      {formValues.styleTitle}
                    </Box>
                  </Typography>
                </AccordionSummary>
                <AccordionDetails sx={{ p: 1 }}>
                  <Box sx={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 1 }}>
                    {styles.map((item) => {
                      const isSelected = item.title === formValues.styleTitle;
                      return (
                        <Box
                          key={item.id}
                          data-testid={`style-${item.title}`}
                          onClick={() => handleStyleClick(item)}
                          sx={{
                            cursor: "pointer",
                            borderRadius: "8px",
                            border: "2px solid",
                            borderColor: isSelected ? "primary.main" : "rgba(181, 181, 181, 0.35)",
                            bgcolor: isSelected ? "rgba(112, 225, 149, 0.08)" : "transparent",
                            overflow: "hidden",
                            "&:hover": { borderColor: "primary.main" },
                          }}
                        >
                          <Box
                            component="img"
                            src={item.image_url}
                            alt={item.title}
                            sx={{ width: "100%", aspectRatio: "1/1", display: "block" }}
                          />
                          <Typography
                            sx={{
                              display: "block",
                              textAlign: "center",
                              color: isSelected ? "primary.main" : "#b8b8b8",
                              fontSize: "16px",
                              py: 0.5,
                              px: 0.25,
                              lineHeight: 1.2,
                            }}
                          >
                            {item.title}
                          </Typography>
                        </Box>
                      );
                    })}
                  </Box>
                </AccordionDetails>
              </Accordion>

              {/* QR Weight slider */}
              <Box sx={{ px: 1 }}>
                <Typography variant="body2" sx={{ mb: 1, color: "#b8b8b8" }}>
                  QR Code Weight
                </Typography>
                <Slider
                  min={QR_SLIDER_MIN}
                  max={QR_SLIDER_MAX}
                  step={0.1}
                  value={formValues.qrWeight}
                  onChange={(_, val) => setFormValues((prev) => ({ ...prev, qrWeight: val }))}
                  marks={[
                    { value: QR_SLIDER_MIN, label: "Artistic" },
                    { value: QR_SLIDER_MAX, label: "Scannable" },
                  ]}
                  sx={{ "& .MuiSlider-markLabel": { color: "#7d7d7d" } }}
                />
              </Box>
            </Stack>
          </Box>

          {/* Generate button — sticky at bottom of scroll container */}
          <Box
            sx={{
              position: "sticky",
              bottom: 0,
              pt: 1.5,
              pb: 1,
              bgcolor: "#161616",
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
