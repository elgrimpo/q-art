"use client";

// Libraries imports
import React, { useEffect, useState } from "react";
import { Box, Dialog, Button, Stack } from "@mui/material";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ReplayTwoToneIcon from "@mui/icons-material/ReplayTwoTone";
import EditTwoToneIcon from "@mui/icons-material/EditTwoTone";
import useMediaQuery from "@mui/material/useMediaQuery";
import theme from "@/_styles/theme";

//App imports
import { getImageById } from "@/_utils/ImagesUtils";
import StyledIconButton from "@/_components/StyledIconButton";
import ImageFill from "@/app/images/[imageId]/ImageFill";
import ImageSidebar from "@/app/images/[imageId]/ImageSidebar";
import { useStore } from "@/store";

/* -------------------------------------------------------------------------- */
/*                               COMPONENT START                              */
/* -------------------------------------------------------------------------- */

export default function ImagePage({ params }) {
  /* ---------------------------- DECLARE VARIABLES --------------------------- */
  const { imageId } = params;
  const [image, setImage] = useState(null);
  const { user, resetGenerateFormValues } = useStore();

  const router = useRouter();
  const isFullScreen = useMediaQuery(theme.breakpoints.down("md"));

  /* -------------------------------- FUNCTIONS ------------------------------- */

  useEffect(() => {
    const getImage = async () => {
      const image = await getImageById(imageId);
      setImage(image);
    };
    getImage();
  }, [imageId]);

  const handleClose = () => {
    router.back();
  };

  const handleReset = () => {
    resetGenerateFormValues();
    router.back();
  };

  const customDeleteAction = () => {
    router.back();
  };
  /* -------------------------------------------------------------------------- */
  /*                              COMPONENT RENDER                              */
  /* -------------------------------------------------------------------------- */

  return (
    <Dialog
    fullScreen={isFullScreen}
    open={open}
    onClose={handleClose}
    sx={{
      margin: "auto",
      ...(isFullScreen && {
      "& .MuiDialog-paper": { 
        maxHeight: "100%",
        width: "100%" 
      }}),
      "& .MuiDialog-paper": {maxWidth: "1400px" },
    }}
    >
      {/* ------------------------ NAVIGATION BUTTON ----------------------- */}

      {/* CLOSE */}
      <Box
        sx={{
          margin: { sx: "0rem", lg: "1rem" },
          position: "fixed",
          top: { xs: "0.5rem" },
          right: { xs: "0.5rem" },
          zIndex: "2000",
        }}
      >
        <Link href="/generate">
          <StyledIconButton
            variant="contained"
            color="secondary"
            type="close"
            handleClick={handleClose}
          />
        </Link>
      </Box>

      {/* ----------------------------- DIALOG CONTENT ----------------------------- */}
      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", md: "row" },
          overflowY: { xs: "scroll", md: "hidden" },
          width: "100%"
        }}
      >
        {/* ------------ Image ------------- */}

        <ImageFill image={image} />

        {/* -------------------- Sidebar ------------------- */}


          <ImageSidebar
            image={image}
            user={user}
            customDeleteAction={customDeleteAction}
          />

      </Box>
    </Dialog>
  );
}
