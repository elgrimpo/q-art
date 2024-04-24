'use client'
// Libraries imports
import React from "react";
import { Box, CardMedia, Skeleton } from "@mui/material";
import { useStore } from "@/store";

//App imports

/* -------------------------------------------------------------------------- */
/*                               COMPONENT START                              */
/* -------------------------------------------------------------------------- */

export default function ImageFill(props) {
  /* ---------------------------- DECLARE VARIABLES --------------------------- */
  const isMobile = false;
  // const { handleClose } = props;
  const { image } = props;
  const { processingImages } = useStore();

  const isImageProcessing = processingImages.includes(image?._id)
  /* -------------------------------- FUNCTIONS ------------------------------- */

  /* -------------------------------------------------------------------------- */
  /*                              COMPONENT RENDER                              */
  /* -------------------------------------------------------------------------- */

  return (
    <Box // Image Background fill
      sx={{
        width: "100%",
        backgroundColor: "#70E195",
        display: "flex",
        justifyContent: "center",
        padding: { xs: "0rem", md: "2rem", lg: "2rem" },
        flex: { xs: "2", lg: "3" },
      }}
    >
      {!image?.watermarked_image_url || isImageProcessing ? (
        <Skeleton
          variant="rounded"
          animation="wave"
          sx={{
            borderRadius: { md: "12px" },
            objectFit: "contain",
            maxWidth: "100%",
            maxHeight: "100%",
            width: "auto",
            height: "auto",
            aspectRatio: "1/1",
            minWidth: {xs: "360px", sm: "600px", md: "400px"},
          }}
        />
      ) : (
        <CardMedia
          component="img"
          image={image?.watermarked_image_url}
          sx={{
            borderRadius: { md: "12px" },
            objectFit: "contain",
            maxWidth: "100%",
            maxHeight: "100%",
            width: "100%",
            height: "auto",
            aspectRatio: "1/1",
            pointerEvents: "none",
          }}
        />
      )}
    </Box>
  );
}
