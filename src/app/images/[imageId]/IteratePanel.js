"use client";

import React, { useState, useRef } from "react";
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
  IconButton,
  Grid,
} from "@mui/material";
import AutoFixHighIcon from "@mui/icons-material/AutoFixHigh";
import ShuffleIcon from "@mui/icons-material/Shuffle";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { useRouter } from "next/navigation";

import { styles, selectRandomStyle } from "@/_utils/ImageStyles";
import { generateImage } from "@/_utils/ImagesUtils";
import { qrWeightToSlider, QR_SLIDER_MIN, QR_SLIDER_MAX } from "@/_utils/qrWeight";
import StylesCard from "@/app/(main_pages)/generate/(formComponents)/StylesCard";
import GeneratingModal from "./GeneratingModal";

function initFormValues(image) {
  const sourceStyle = styles.find((s) => s.title === image.style_title) ?? styles[0];
  return {
    prompt: image.prompt ?? "",
    styleId: sourceStyle.id,
    styleTitle: sourceStyle.title,
    stylePrompt: sourceStyle.prompt,
    styleLoras: sourceStyle.loras ?? [],
    sdModel: image.sd_model ?? "cyberrealistic_v40_151857.safetensors",
    qrWeight: qrWeightToSlider(image.qr_weight ?? 0.5),
    url: image.content ?? "",
  };
}

export default function IteratePanel({ image, isOpen, onOpen, onClose }) {
  const router = useRouter();
  const originalStyleTitle = useRef(image.style_title ?? "");
  const lastPayload = useRef(null);
  const lastTrigger = useRef("iterate");

  const [formValues, setFormValues] = useState(() => initFormValues(image));
  const [generating, setGenerating] = useState(false);
  const [generatingError, setGeneratingError] = useState(false);

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
    lastPayload.current = payload;
    lastTrigger.current = trigger;
    setGeneratingError(false);
    setGenerating(true);
    try {
      const newImage = await generateImage(payload);
      router.push(`/images/${newImage._id}`);
    } catch {
      setGeneratingError(true);
    } finally {
      setGenerating(false);
    }
  };

  const handleRetry = async () => {
    if (!lastPayload.current) return;
    setGeneratingError(false);
    setGenerating(true);
    try {
      const newImage = await generateImage(lastPayload.current);
      router.push(`/images/${newImage._id}`);
    } catch {
      setGeneratingError(true);
    } finally {
      setGenerating(false);
    }
  };

  const handleBackToImage = () => {
    setGenerating(false);
    setGeneratingError(false);
  };

  return (
    <>
      <GeneratingModal
        open={generating || generatingError}
        error={generatingError}
        onRetry={handleRetry}
        onBack={handleBackToImage}
      />

      {/* DEFAULT PANEL — visible when isOpen=false */}
      {!isOpen && (
        <Stack spacing={2}>
          {/* New Variation box */}
          <Box
            onClick={() => handleGenerate("newVariation")}
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1.75,
              p: "16px 18px",
              border: "1px dashed #2e2e2e",
              borderRadius: "16px",
              bgcolor: "#0e0e0e",
              cursor: "pointer",
              "&:hover": { borderColor: "primary.main" },
            }}
          >
            <Box
              sx={{
                flexShrink: 0,
                width: 44,
                height: 44,
                borderRadius: "12px",
                bgcolor: "rgba(112, 225, 149, 0.08)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <ShuffleIcon sx={{ color: "primary.main", fontSize: 22 }} />
            </Box>
            <Box>
              <Typography variant="h5" sx={{ fontSize: "18px", lineHeight: 1.1, color: "primary.main" }}>
                New Variation
              </Typography>
              <Typography variant="body2" sx={{ color: "#b8b8b8", mt: 0.5, lineHeight: 1.45 }}>
                Same style, new random seed.
              </Typography>
            </Box>
          </Box>

          {/* Iterate this image box */}
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
            <Box
              sx={{
                flexShrink: 0,
                width: 44,
                height: 44,
                borderRadius: "12px",
                bgcolor: "rgba(112, 225, 149, 0.12)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <AutoFixHighIcon sx={{ color: "primary.main", fontSize: 22 }} />
            </Box>
            <Box>
              <Typography variant="h5" sx={{ fontSize: "22px", lineHeight: 1.1, color: "primary.main" }}>
                Iterate this image
              </Typography>
              <Typography variant="body2" sx={{ color: "#b8b8b8", mt: 0.5, lineHeight: 1.45 }}>
                Edit prompt, style, or QR weight and generate a new version.
              </Typography>
            </Box>
          </Box>
        </Stack>
      )}

      {/* ITERATE FORM — shown when isOpen=true */}
      {isOpen && (
        <Box>
          <IconButton
            aria-label="back"
            onClick={onClose}
            sx={{ mb: 1, color: "primary.main" }}
          >
            <ArrowBackIcon />
          </IconButton>

          <Stack spacing={2.5}>
            {/* Prompt */}
            <TextField
              label="Prompt"
              name="prompt"
              multiline
              minRows={3}
              fullWidth
              value={formValues.prompt}
              onChange={(e) =>
                setFormValues((prev) => ({ ...prev, prompt: e.target.value }))
              }
              inputProps={{ "aria-label": "prompt" }}
            />

            {/* Style accordion */}
            <Accordion
              disableGutters
              TransitionProps={{ unmountOnExit: true }}
              sx={{
                bgcolor: "#0e0e0e",
                border: "1px solid #2e2e2e",
                borderRadius: "12px !important",
                "&:before": { display: "none" },
              }}
            >
              <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: "primary.main" }} />}>
                <Typography sx={{ color: "#b8b8b8" }}>
                  Style: <strong style={{ color: "#fff" }}>{formValues.styleTitle}</strong>
                </Typography>
              </AccordionSummary>
              <AccordionDetails sx={{ p: 1 }}>
                <Grid container spacing={1}>
                  {styles.map((item, index) => (
                    <Grid item xs={6} sm={4} key={index}>
                      <StylesCard
                        item={item}
                        index={index}
                        handleClick={handleStyleClick}
                        selectedTitle={formValues.styleTitle}
                      />
                    </Grid>
                  ))}
                </Grid>
              </AccordionDetails>
            </Accordion>

            {/* QR Weight slider */}
            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                QR Code Weight
              </Typography>
              <Slider
                min={QR_SLIDER_MIN}
                max={QR_SLIDER_MAX}
                step={0.1}
                value={formValues.qrWeight}
                onChange={(_, val) =>
                  setFormValues((prev) => ({ ...prev, qrWeight: val }))
                }
                marks={[
                  { value: QR_SLIDER_MIN, label: "Artistic" },
                  { value: QR_SLIDER_MAX, label: "Scannable" },
                ]}
              />
            </Box>

            {/* URL (secondary) */}
            <TextField
              label="URL"
              name="url"
              fullWidth
              size="small"
              value={formValues.url}
              onChange={(e) =>
                setFormValues((prev) => ({ ...prev, url: e.target.value }))
              }
              sx={{ "& .MuiInputLabel-root": { color: "#7d7d7d" } }}
            />

            <Button
              variant="contained"
              color="secondary"
              size="large"
              fullWidth
              onClick={() => handleGenerate("iterate")}
            >
              Generate
            </Button>
          </Stack>
        </Box>
      )}
    </>
  );
}
