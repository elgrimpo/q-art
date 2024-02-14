"use client";

// Libraries imports
import React, { useEffect, useState } from "react";
import { Box, Dialog, Button, Stack } from "@mui/material";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ReplayTwoToneIcon from "@mui/icons-material/ReplayTwoTone";
import EditTwoToneIcon from "@mui/icons-material/EditTwoTone";

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
      open={true}
      maxWidth="xl"
      fullscreen="true"
      onClose={handleClose}
      PaperProps={{ sx: { height: "100%" } }}
      sx={{ width: "100%", height: "100%" }}
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
          height: "100%",
        }}
      >
        {/* ------------ Image ------------- */}

        <ImageFill image={image} />

        {/* -------------------- Sidebar ------------------- */}

        <Box
          sx={{
            flex: "1",
            // height: "100%",
            minWidth: "230px",
            overflow: { md: "scroll" },
          }}
        >
          <ImageSidebar
            image={image}
            user={user}
            customDeleteAction={customDeleteAction}
          />
          <Stack spacing={2} sx={{ mb: "3rem", padding: "0rem 3rem" }}>
            <Button
              variant="outlined"
              size="medium"
              color="secondary"
              sx={{ maxWidth: "100%", zIndex: 900 }}
              aria-label="share"
              onClick={handleClose}
              startIcon={<EditTwoToneIcon />}
            >
              Modify
            </Button>

            <Button
              variant="contained"
              size="medium"
              color="secondary"
              sx={{ width: "100%", zIndex: 900 }}
              aria-label="share"
              onClick={handleReset}
              startIcon={<ReplayTwoToneIcon />}
            >
              New Image
            </Button>
          </Stack>
        </Box>
      </Box>
    </Dialog>
  );
}
