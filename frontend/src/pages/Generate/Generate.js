// Libraries imports
import React, { useState } from "react";
import {
  Fab,
  CardMedia,
  CircularProgress,
  Box,
  Typography,
} from "@mui/material";
import useMediaQuery from "@mui/material/useMediaQuery";
import theme from "../../styles/mui-theme";

// App imports
import { useImages } from "../../context/AppProvider";
import GenerateForm from "./GenerateForm";

/* -------------------------------------------------------------------------- */
/*                               COMPONENT START                              */
/* -------------------------------------------------------------------------- */

function Generate() {
  /* ---------------------------- DECLARE VARIABLES --------------------------- */

  // Context variables
  const {
    generatedImage,
    loadingGeneratedImage,
  } = useImages();


  // Screen size
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  // Switch between Form and Image view for mobile screen
  const [formSubmitted, setFormSubmitted] = useState(false);


  /* -------------------------------- FUNCTIONS ------------------------------- */

  // Switch to Form view for mobile view
  const handleFormUnsubmit = () => {
    setFormSubmitted(false);
  };

  /* -------------------------------------------------------------------------- */
  /*                              COMPONENT RENDER                              */
  /* -------------------------------------------------------------------------- */

  return (
    <div className="generate-page">
      {/* ------------------------------ GENERATE FORM ----------------------------- */}
      {/* TODO: MOVE FORM TO SEPARATE COMPONENT */}
      {!isMobile || (isMobile && !formSubmitted) ? (
        <GenerateForm setFormSubmitted={setFormSubmitted} />
      ) : (
        <></>
      )}

      {/* -------------------------------- QR IMAGE -------------------------------- */}
      {!isMobile || (isMobile && formSubmitted) ? ( // Mobile: Only shows when Form has been submitted
        <Box className="image-container">
          <Box className="image-card">
            {isMobile && (
              <Typography
                variant="h5"
                align="center"
                sx={{ mb: "1rem", mt: "1rem" }}
              >
                Your QR Art
              </Typography>
            )}

            {/* LOADING PLACEHOLDER */}
            {loadingGeneratedImage ? (
              <Box className="loading-box">
                <CircularProgress color="secondary" />
              </Box>
            ) : (
              // IMAGE
              <CardMedia
                component="img"
                image={generatedImage.image_url}
                sx={{
                  borderRadius: { sm: "12px" },
                  objectFit: "contain",
                  maxWidth: "100%",
                  maxHeight: "100%",
                  width: "auto",
                  height: "auto",
                  aspectRatio: "1/1",
                }}
              ></CardMedia>
            )}

            {/* MOBILE: BACK TO FORM BUTTON */}
            {isMobile && !loadingGeneratedImage && (
              <Fab
                variant="extended"
                size="medium"
                color="secondary"
                sx={{ margin: "24px", zIndex: 900 }}
                aria-label="share"
                onClick={() => handleFormUnsubmit()}
              >
                Make another one
              </Fab>
            )}
          </Box>
        </Box>
      ) : (
        <></>
      )}
    </div>
  );
}

export default Generate;
