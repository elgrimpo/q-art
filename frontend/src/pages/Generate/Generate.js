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
import SimpleDialog from "../../components/SimpleDialog";
import { useGenerateUtils } from "../../utils/GenerateUtils";
import { useNavigate } from "react-router-dom";

/* -------------------------------------------------------------------------- */
/*                               COMPONENT START                              */
/* -------------------------------------------------------------------------- */

function Generate() {
  /* ---------------------------- DECLARE VARIABLES --------------------------- */

  // Context variables
  const { generatedImage, generateFormValues, loadingGeneratedImage, user } =
    useImages();

  // Navigate
  const navigate = useNavigate();
  
  // Utils functions
  const { generateImage } = useGenerateUtils();

  // Screen size
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  // Switch between Form and Image view for mobile screen
  const [formSubmitted, setFormSubmitted] = useState(false);

  // Dialog Content
  const [dialogContent, setDialogContent] = useState({});
  const [dialogOpen, setDialogOpen] = useState(false);

  /* -------------------------------- FUNCTIONS ------------------------------- */

  // Login
  const handleLogin = async () => {
    window.open(
      `${process.env.REACT_APP_BACKEND_URL}/api/login/google`,
      "_self"
    );
  };

  // Switch to Form view for mobile view
  const handleFormUnsubmit = () => {
    setFormSubmitted(false);
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
  };

  const handleGenerate = async () => {
    if (!user._id) {
      setDialogContent({
        title: "Not logged in",
        description: "Please log in to generate a QC Code image.",
        primaryActionText: "Log In",
        primaryAction: handleLogin,
        secondaryActionText: "Close",
        secondaryAction: handleDialogClose,
      });
      setDialogOpen(true);
    } else {
      try {
        setFormSubmitted(true);
        const result = await generateImage(generateFormValues);
        
      } catch (error) {

        if (error.detail === "InsufficientCredits") {
          setDialogContent({
            title: "Insufficient Credits",
            description:
              "You don't have enough credits to generate this image. Please go to your account to purchase additional credits.",
            primaryActionText: "Add Credits",
            primaryAction: () => navigate("/account"),
            secondaryActionText: "Close",
            secondaryAction: handleDialogClose,
          });
          setDialogOpen(true);
        }
        console.error("Error occurred:", error);
      }
    }
  };
  /* -------------------------------------------------------------------------- */
  /*                              COMPONENT RENDER                              */
  /* -------------------------------------------------------------------------- */

  return (
    <div className="generate-page">
      {/* ------------------------------ GENERATE FORM ----------------------------- */}
      {!isMobile || (isMobile && !formSubmitted) ? (
        <GenerateForm
          handleGenerate={handleGenerate}
          setFormSubmitted={setFormSubmitted}
        />
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

      {/* --------------------------------- DIALOG --------------------------------- */}

      {/* USER NOT LOGGED IN */}
      <SimpleDialog
        title={dialogContent.title}
        description={dialogContent.description}
        primaryActionText={dialogContent.primaryActionText}
        primaryAction={dialogContent.primaryAction}
        secondaryActionText={dialogContent.secondaryActionText}
        secondaryAction={dialogContent.secondaryAction}
        dialogOpen={dialogOpen}
        handleClose={handleDialogClose}
      />
    </div>
  );
}

export default Generate;
