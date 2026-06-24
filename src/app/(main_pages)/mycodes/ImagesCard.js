"use client";
import React from "react";
import { Box, Chip, Grid, Typography } from "@mui/material";
import LinkIcon from "@mui/icons-material/Link";
import LockIcon from "@mui/icons-material/Lock";

import LikeButton from "@/_components/actions/LikeButton.js";
import SkeletonCard from "./SkeletonCard.js";
import { useStore } from "@/store.js";

/* -------------------------------------------------------------------------- */
/*  Scannability thresholds — kept in sync with ImageSidebar.js               */
/* -------------------------------------------------------------------------- */
const SCANNABILITY_LEVELS = [
  { min: 85, label: "Excellent",   color: "#4A8C5C" },
  { min: 70, label: "Good",        color: "#8BC989" },
  { min: 50, label: "Fair",        color: "#D4B44A" },
  { min: 20, label: "Poor",        color: "#D97B7B" },
  { min: 0,  label: "Unscannable", color: "#8B2020" },
];

function getScannability(score) {
  return SCANNABILITY_LEVELS.find((l) => score >= l.min) ?? SCANNABILITY_LEVELS[4];
}

/* -------------------------------------------------------------------------- */
/*  ScannabilityWidget                                                         */
/* -------------------------------------------------------------------------- */
function ScannabilityWidget({ score }) {
  if (score == null) return null;
  const pct = Math.round(score);
  const { label, color } = getScannability(score);

  return (
    <Box
      sx={{
        flexShrink: 0,
        minWidth: "68px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "5px",
      }}
    >
      {/* Ring */}
      <Box
        sx={{
          position: "relative",
          width: 36,
          height: 36,
          borderRadius: "50%",
          background: `conic-gradient(${color} 0% ${pct}%, #2a2a2a ${pct}% 100%)`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Box
          sx={{
            position: "absolute",
            width: 25,
            height: 25,
            borderRadius: "50%",
            bgcolor: "#161616",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Typography sx={{ fontSize: "9px", fontWeight: 800, color, lineHeight: 1 }}>
            {pct}
          </Typography>
        </Box>
      </Box>

      {/* Label */}
      <Box sx={{ textAlign: "center", lineHeight: 1.25 }}>
        <Typography
          sx={{
            display: "block",
            fontSize: "11px",
            fontWeight: 700,
            fontFamily: "Roboto Serif, Georgia, serif",
            fontStyle: "italic",
            color,
          }}
        >
          {label}
        </Typography>
        <Typography sx={{ display: "block", fontSize: "10px", color: "#7d7d7d", fontWeight: 500 }}>
          scannability
        </Typography>
      </Box>
    </Box>
  );
}

/* -------------------------------------------------------------------------- */
/*  ImageCard                                                                  */
/* -------------------------------------------------------------------------- */
export default function ImageCard({ variant, image, index, handleCardClick, customLikeAction }) {
  const { user } = useStore();

  const preventRightClick = (e) => e.preventDefault();

  return (
    <Grid item xs={1} key={index}>
      {variant === "skeleton" ? (
        <SkeletonCard index={index} />
      ) : (
        <Box
          onClick={handleCardClick}
          sx={{
            bgcolor: "#161616",
            borderRadius: "12px",
            overflow: "hidden",
            border: "1px solid #252525",
            cursor: "pointer",
            transition: "border-color 0.2s, transform 0.15s",
            "&:hover": { borderColor: "#383838", transform: "translateY(-2px)" },
          }}
        >
          {/* ── Image area ── */}
          <Box sx={{ position: "relative", width: "100%", aspectRatio: "1/1", overflow: "hidden" }}>
            <Box
              component="img"
              src={image.watermarked_image_url}
              alt={image.content}
              onContextMenu={preventRightClick}
              sx={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
            />

            {/* Like button — top right */}
            <Box sx={{ position: "absolute", top: 10, right: 10 }}>
              <LikeButton image={image} user={user} customLikeAction={customLikeAction} />
            </Box>

            {/* Locked preview badge — bottom left */}
            {!image.unlocked && (
              <Box
                sx={{
                  position: "absolute",
                  bottom: 10,
                  left: 10,
                  display: "flex",
                  alignItems: "center",
                  gap: "5px",
                  bgcolor: "rgba(22,22,22,0.75)",
                  border: "1px solid #2e2e2e",
                  borderRadius: "999px",
                  pl: "8px",
                  pr: "10px",
                  py: "4px",
                  backdropFilter: "blur(6px)",
                }}
              >
                <LockIcon sx={{ fontSize: 11, color: "#7d7d7d" }} />
                <Typography
                  sx={{
                    fontSize: "10px",
                    fontWeight: 700,
                    letterSpacing: "0.08em",
                    color: "#7d7d7d",
                    textTransform: "uppercase",
                  }}
                >
                  Locked Preview
                </Typography>
              </Box>
            )}
          </Box>

          {/* ── Card body ── */}
          <Box
            sx={{
              p: "14px 16px 16px",
              display: "flex",
              alignItems: "stretch",
              gap: "14px",
            }}
          >
            {/* Left: URL + style chip */}
            <Box
              sx={{
                flex: 1,
                minWidth: 0,
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                gap: "8px",
              }}
            >
              {/* URL */}
              <Box sx={{ display: "flex", alignItems: "center", gap: "7px", overflow: "hidden" }}>
                <LinkIcon sx={{ fontSize: 15, color: "primary.main", flexShrink: 0 }} />
                <Typography
                  sx={{
                    fontFamily: "Georgia, 'Times New Roman', serif",
                    fontStyle: "italic",
                    fontSize: "15px",
                    color: "primary.main",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    lineHeight: 1.2,
                  }}
                >
                  {image.content}
                </Typography>
              </Box>

              {/* Style chip */}
              {image.style_title && (
                <Chip
                  label={image.style_title.toUpperCase()}
                  size="small"
                  sx={{
                    bgcolor: "#2a2a2a",
                    color: "primary.light",
                    fontWeight: 700,
                    fontSize: "11px",
                    letterSpacing: "0.08em",
                    height: "28px",
                    borderRadius: "999px",
                    alignSelf: "flex-start",
                  }}
                />
              )}
            </Box>

            {/* Right: scannability widget */}
            <ScannabilityWidget score={image.scannability_score} />
          </Box>
        </Box>
      )}
    </Grid>
  );
}
