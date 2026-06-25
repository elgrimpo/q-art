"use client";

import React from "react";
import { Box, Button, IconButton } from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CloseIcon from "@mui/icons-material/Close";
import { useRouter } from "next/navigation";

import LikeButton from "@/_components/actions/LikeButton";
import ShareButton from "@/_components/actions/ShareButton";
import DeleteButton from "@/_components/actions/DeleteButton";

export default function ImageTopBar({ image, user, customDeleteAction, customLikeAction, onBack, sx, backVariant = "text" }) {
  const router = useRouter();
  const isOwner = user?._id === image?.user_id;
  const isAdmin = !!user?.is_admin;
  const isGuestUser = !user?._id || user?.is_guest;

  const handleBack = onBack ?? (() => router.back());

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
            backgroundColor: "#333333",
            color: "primary.main",
            "&:hover": { backgroundColor: "#333333" },
          }}
        >
          <CloseIcon />
        </IconButton>
      ) : (
        <Button
          onClick={handleBack}
          startIcon={<ArrowBackIcon sx={{ color: "primary.main" }} />}
          sx={{
            color: "#b8b8b8",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            fontSize: "12px",
            fontWeight: 700,
            "&:hover": { color: "#ededed", bgcolor: "transparent" },
          }}
        >
          Back
        </Button>
      )}

      <Box sx={{ display: "flex", gap: 1.25 }}>
        {!isGuestUser && <LikeButton image={image} user={user} customLikeAction={customLikeAction} />}
        <ShareButton image={image} index={1} />
        {(isOwner || isAdmin) && (
          <DeleteButton image={image} customDeleteAction={customDeleteAction} />
        )}
      </Box>
    </Box>
  );
}
