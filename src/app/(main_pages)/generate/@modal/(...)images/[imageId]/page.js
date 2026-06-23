"use client";

import React, { useEffect, useState } from "react";
import { Box, Dialog } from "@mui/material";
import { useRouter } from "next/navigation";
import useMediaQuery from "@mui/material/useMediaQuery";
import theme from "@/_styles/theme";

import { getImageById } from "@/_utils/ImagesUtils";
import ImageDetailContent from "@/app/images/[imageId]/ImageDetailContent";
import { useStore } from "@/store";

export default function ImagePage({ params }) {
  const { imageId } = params;
  const [image, setImage] = useState(null);
  const { user } = useStore();
  const router = useRouter();
  const isFullScreen = useMediaQuery(theme.breakpoints.down("md"));

  useEffect(() => {
    const getImage = async () => {
      const img = await getImageById(imageId);
      setImage(img);
    };
    getImage();
  }, [imageId]);

  const handleClose = () => router.back();
  const customDeleteAction = () => router.back();

  return (
    <Dialog
      open
      onClose={handleClose}
      fullScreen={isFullScreen}
      slotProps={{
        backdrop: {
          sx: {
            backgroundColor: "rgba(255, 255, 255, 0.3)",
            backdropFilter: "blur(4px)",
          },
        },
      }}
      PaperProps={{
        sx: {
          bgcolor: "#161616",
          backgroundImage: "none",
          // The app-wide `.MuiDialog-paper { max-width: 80%; max-height: 80% }`
          // rule (globals.css) otherwise caps width AND breaks fullscreen — the
          // `&.MuiDialog-paper` selector outranks it for this dialog only.
          ...(isFullScreen
            ? { "&.MuiDialog-paper": { maxWidth: "100%", maxHeight: "100%" } }
            : {
                width: "90vw",
                height: "auto",
                borderRadius: "16px",
                "&.MuiDialog-paper": {
                  maxWidth: "1600px",
                  maxHeight: "calc(100vh - 40px)",
                },
              }),
        },
      }}
    >
      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          px: { xs: 2, md: 3 },
          pt: { xs: 0, md: 3 },
          pb: 3,
        }}
      >
        <ImageDetailContent
          image={image}
          user={user}
          onBack={handleClose}
          customDeleteAction={customDeleteAction}
          fitHeight
        />
      </Box>
    </Dialog>
  );
}
