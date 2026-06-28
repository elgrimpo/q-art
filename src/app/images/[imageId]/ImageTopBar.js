"use client";

import React, { useState } from "react";
import { Box, Button, Divider, IconButton, ListItemIcon, Menu, MenuItem, Typography } from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import BookmarkBorderIcon from "@mui/icons-material/BookmarkBorder";
import BookmarkIcon from "@mui/icons-material/Bookmark";
import CloseIcon from "@mui/icons-material/Close";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import DownloadIcon from "@mui/icons-material/Download";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import { useRouter } from "next/navigation";
import * as amplitude from "@amplitude/analytics-browser";

import LikeButton from "@/_components/actions/LikeButton";
import ShareButton from "@/_components/actions/ShareButton";
import DeleteButton from "@/_components/actions/DeleteButton";
import { bookmarkImage, deleteImage } from "@/_utils/ImagesUtils";
import { useStore } from "@/store";
import AdminImageInfoDialog from "./AdminImageInfoDialog";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";

export default function ImageTopBar({ image, user, customDeleteAction, customLikeAction, onBack, sx, backVariant = "text" }) {
  const router = useRouter();
  const { openAlert } = useStore();
  const isOwner = user?._id === image?.user_id;
  const isGuestUser = !user?._id || user?.is_guest;
  const isAdmin = !!user?.is_admin;

  const handleBack = onBack ?? (() => router.back());

  const [menuAnchor, setMenuAnchor] = useState(null);
  const [featured, setFeatured] = useState(!!image?.featured);
  const [infoDialogOpen, setInfoDialogOpen] = useState(false);

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
      openAlert("success", "Image deleted successfully");
      if (customDeleteAction) customDeleteAction();
    } catch {
      openAlert("error", "Error deleting image");
    }
  };

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        ...sx,
      }}
    >
      {backVariant === "icon" ? (
        <IconButton
          onClick={handleBack}
          aria-label="Close"
          sx={{
            width: "40px",
            height: "40px",
            backgroundColor: "secondary.main",
            color: "primary.main",
            "&:hover": { backgroundColor: "secondary.main" },
          }}
        >
          <CloseIcon />
        </IconButton>
      ) : (
        <Button
          onClick={handleBack}
          startIcon={<ArrowBackIcon sx={{ color: "primary.main" }} />}
          sx={{
            color: "text.secondary",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            fontSize: "12px",
            fontWeight: 700,
            "&:hover": { color: "text.primary", bgcolor: "transparent" },
          }}
        >
          Back
        </Button>
      )}

      <Box sx={{ display: "flex", gap: 1.25 }}>
        {!isGuestUser && <LikeButton image={image} user={user} customLikeAction={customLikeAction} />}
        <ShareButton image={image} index={1} />
        {isOwner && (
          <DeleteButton image={image} customDeleteAction={customDeleteAction} />
        )}
        {isAdmin && (
          <>
            <IconButton
              onClick={handleMenuOpen}
              aria-label="Admin actions"
              sx={{
                width: "36px",
                height: "36px",
                backgroundColor: "secondary.main",
                color: "primary.main",
                "&:hover": { backgroundColor: "secondary.main" },
              }}
            >
              <MoreVertIcon />
            </IconButton>
            <Menu
              anchorEl={menuAnchor}
              open={Boolean(menuAnchor)}
              onClose={handleMenuClose}
              anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
              transformOrigin={{ vertical: "top", horizontal: "right" }}
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
              <MenuItem onClick={() => { handleMenuClose(); setInfoDialogOpen(true); }}>
                <ListItemIcon sx={{ color: "primary.main" }}>
                  <InfoOutlinedIcon fontSize="small" />
                </ListItemIcon>
                <Typography variant="body2">View Info</Typography>
              </MenuItem>
              <Divider />
              <MenuItem onClick={handleAdminDelete} sx={{ color: "error.main" }}>
                <ListItemIcon sx={{ color: "error.main" }}>
                  <DeleteOutlineIcon fontSize="small" />
                </ListItemIcon>
                <Typography variant="body2">Delete</Typography>
              </MenuItem>
            </Menu>
            <AdminImageInfoDialog
              open={infoDialogOpen}
              onClose={() => setInfoDialogOpen(false)}
              imageId={image?._id}
            />
          </>
        )}
      </Box>
    </Box>
  );
}
