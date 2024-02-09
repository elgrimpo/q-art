// Libraries imports
import React from "react";
import {
  Box,
  CardMedia,
  Skeleton,
} from "@mui/material";


//App imports

/* -------------------------------------------------------------------------- */
/*                               COMPONENT START                              */
/* -------------------------------------------------------------------------- */

export default function ImageFill( props ) {
  /* ---------------------------- DECLARE VARIABLES --------------------------- */
  // TODO: Put in
  const isMobile = false;
  // const { handleClose } = props;
  const { image } = props;
  /* -------------------------------- FUNCTIONS ------------------------------- */

  /* -------------------------------------------------------------------------- */
  /*                              COMPONENT RENDER                              */
  /* -------------------------------------------------------------------------- */

  return (
      <Box // Image Background fill
        sx={{
          height: "100%",
          width: "100%",
          backgroundColor: "#70E195",
          display: "flex",
          justifyContent: "center",
          padding: { xs: "0rem", md: "0rem", lg: "2rem" },
          flex: { xs: "2", lg: "3" },
        }}
      >
        {!image?.image_url ? (
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
            }}
          />
        ) : (
          <CardMedia
            component="img"
            image={image?.image_url}
            sx={{
              borderRadius: { md: "12px" },
              objectFit: "contain",
              maxWidth: "100%",
              maxHeight: "100%",
              width: "auto",
              height: "auto",
              aspectRatio: "1/1",
              pointerEvents: "none",
            }}
          />
        )}
      </Box>
  );
}
