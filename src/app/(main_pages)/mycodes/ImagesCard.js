"use client";
import React, { useState } from "react";
import {
  Box, Chip, Grid, Typography,
  Menu, MenuItem, ListItemIcon, Divider, IconButton,
} from "@mui/material";
import LinkIcon from "@mui/icons-material/Link";
import LockIcon from "@mui/icons-material/Lock";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import BookmarkIcon from "@mui/icons-material/Bookmark";
import BookmarkBorderIcon from "@mui/icons-material/BookmarkBorder";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import DownloadIcon from "@mui/icons-material/Download";
import * as amplitude from "@amplitude/analytics-browser";

import { palette } from "@/_styles/palette";
import LikeButton from "@/_components/actions/LikeButton.js";
import SkeletonCard from "./SkeletonCard.js";
import { useStore } from "@/store.js";
import { bookmarkImage, deleteImage } from "@/_utils/ImagesUtils";

/* -------------------------------------------------------------------------- */
/*  Scannability thresholds — kept in sync with ImageSidebar.js               */
/* -------------------------------------------------------------------------- */
const SCANNABILITY_LEVELS = [
  { min: 85, label: "Excellent", color: "#4A8C5C" },
  { min: 70, label: "Good", color: "#8BC989" },
  { min: 50, label: "Fair", color: "#D4B44A" },
  { min: 20, label: "Poor", color: "#D97B7B" },
  { min: 0, label: "Unscannable", color: "#d22c2c" },
];

function getScannability(score) {
  return (
    SCANNABILITY_LEVELS.find((l) => score >= l.min) ?? SCANNABILITY_LEVELS[4]
  );
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
          background: `conic-gradient(${color} 0% ${pct}%, ${palette.background.elevated} ${pct}% 100%)`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Box
          sx={{
            position: "absolute",
            width: 30,
            height: 30,
            borderRadius: "50%",
            bgcolor: "background.default",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Typography
            sx={{ fontSize: "9px", fontWeight: 800, color, lineHeight: 1 }}
          >
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
            color,
          }}
        >
          {label}
        </Typography>
        <Typography
          sx={{
            display: "block",
            fontSize: "11px",
            fontWeight: 700,
            fontFamily: "Roboto Serif, Georgia, serif",
            color,
          }}
        >
          scannability
        </Typography>
      </Box>
    </Box>
  );
}

/* -------------------------------------------------------------------------- */
/*  ImageCard                                                                  */
/* -------------------------------------------------------------------------- */
export default function ImageCard({
  variant,
  image,
  index,
  handleCardClick,
  customLikeAction,
  customDeleteAction,
}) {
  const { user, openAlert } = useStore();
  const isAdmin = !!user?.is_admin;

  const [menuAnchor, setMenuAnchor] = useState(null);
  const [featured, setFeatured] = useState(!!image?.featured);

  const handleMenuOpen = (e) => setMenuAnchor(e.currentTarget);
  const handleMenuClose = () => setMenuAnchor(null);

  const triggerRouteDownload = (href) => {
    const a = document.createElement("a");
    a.href = href;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleBookmark = async () => {
    handleMenuClose();
    const prev = featured;
    setFeatured(!prev);
    try {
      await bookmarkImage(image._id);
    } catch {
      setFeatured(prev);
      openAlert("error", "Could not update bookmark.");
    }
  };

  const handleDownloadWatermarked = () => {
    handleMenuClose();
    triggerRouteDownload(`/api/admin/watermarked/${image._id}`);
  };

  const handleDownloadOriginal = () => {
    handleMenuClose();
    triggerRouteDownload(`/api/admin/original/${image._id}`);
  };

  const handleAdminDelete = async () => {
    handleMenuClose();
    try {
      amplitude.track("Delete Image");
      await deleteImage(image._id);
      openAlert("success", "Image deleted");
      if (customDeleteAction) customDeleteAction(image._id);
    } catch {
      openAlert("error", "Error deleting image");
    }
  };

  const preventRightClick = (e) => e.preventDefault();

  return (
    <Grid item xs={1} key={index}>
      {variant === "skeleton" ? (
        <SkeletonCard index={index} />
      ) : (
        <Box
          onClick={handleCardClick}
          sx={{
            bgcolor: "background.paper",
            borderRadius: "12px",
            overflow: "hidden",
            border: "0.5px solid",
            borderColor: "primary.main",
            cursor: "pointer",
            transition: "border-color 0.2s, transform 0.15s",
            "&:hover": {
              borderColor: "primary.light",
              transform: "translateY(-2px)",
            },
          }}
        >
          {/* ── Image area ── */}
          <Box
            sx={{
              position: "relative",
              width: "100%",
              aspectRatio: "1/1",
              overflow: "hidden",
            }}
          >
            <Box
              component="img"
              src={image.watermarked_image_url}
              alt={image.content}
              onContextMenu={preventRightClick}
              sx={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                display: "block",
              }}
            />

            {/* Admin menu — top left */}
            {isAdmin && (
              <Box
                sx={{ position: "absolute", top: 6, left: 6 }}
                onClick={(e) => e.stopPropagation()}
              >
                <IconButton
                  onClick={handleMenuOpen}
                  aria-label="Admin actions"
                  size="small"
                  sx={{
                    bgcolor: "rgba(22,22,22,0.75)",
                    color: "primary.main",
                    backdropFilter: "blur(6px)",
                    width: 28,
                    height: 28,
                    "&:hover": { bgcolor: "rgba(40,40,40,0.9)" },
                  }}
                >
                  <MoreVertIcon sx={{ fontSize: 18 }} />
                </IconButton>
                <Menu
                  anchorEl={menuAnchor}
                  open={Boolean(menuAnchor)}
                  onClose={handleMenuClose}
                  anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
                  transformOrigin={{ vertical: "top", horizontal: "left" }}
                  PaperProps={{ sx: { bgcolor: "background.paper", color: "text.primary", minWidth: 220 } }}
                >
                  <MenuItem onClick={handleBookmark}>
                    <ListItemIcon sx={{ color: featured ? "warning.main" : "primary.main" }}>
                      {featured ? <BookmarkIcon fontSize="small" /> : <BookmarkBorderIcon fontSize="small" />}
                    </ListItemIcon>
                    <Typography variant="body2">{featured ? "Remove from Explore" : "Add to Explore"}</Typography>
                  </MenuItem>
                  <Divider />
                  <MenuItem onClick={handleDownloadWatermarked}>
                    <ListItemIcon sx={{ color: "primary.main" }}>
                      <DownloadIcon fontSize="small" />
                    </ListItemIcon>
                    <Typography variant="body2">Download Watermarked</Typography>
                  </MenuItem>
                  <MenuItem onClick={handleDownloadOriginal}>
                    <ListItemIcon sx={{ color: "primary.main" }}>
                      <DownloadIcon fontSize="small" />
                    </ListItemIcon>
                    <Typography variant="body2">Download Original</Typography>
                  </MenuItem>
                  <Divider />
                  <MenuItem onClick={handleAdminDelete} sx={{ color: "error.main" }}>
                    <ListItemIcon sx={{ color: "error.main" }}>
                      <DeleteOutlineIcon fontSize="small" />
                    </ListItemIcon>
                    <Typography variant="body2">Delete</Typography>
                  </MenuItem>
                </Menu>
              </Box>
            )}

            {/* Like button — top right */}
            <Box
              sx={{ position: "absolute", top: 10, right: 10 }}
              onClick={(e) => e.stopPropagation()}
            >
              <LikeButton
                image={image}
                user={user}
                customLikeAction={customLikeAction}
              />
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
                  border: "1px solid",
                  borderColor: "divider",
                  borderRadius: "999px",
                  pl: "8px",
                  pr: "10px",
                  py: "4px",
                  backdropFilter: "blur(6px)",
                }}
              >
                <LockIcon sx={{ fontSize: 11, color: "primary.main" }} />
                <Typography
                  sx={{
                    fontSize: "10px",
                    fontWeight: 700,
                    letterSpacing: "0.08em",
                    color: "text.secondary",
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
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: "7px",
                  overflow: "hidden",
                  mt: 0.3,
                }}
              >
                <LinkIcon
                  sx={{ fontSize: 20, color: "primary.main", flexShrink: 0 }}
                />
                <Typography
                  sx={{
                    fontFamily: "Georgia, 'Times New Roman', serif",
                    fontStyle: "italic",
                    fontSize: "23px",
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
                    bgcolor: "background.elevated",
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
