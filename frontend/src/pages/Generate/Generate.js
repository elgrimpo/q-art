// Libraries imports
import React, { useState } from "react";
import {
  CardMedia,
  CircularProgress,
  Box,
  Typography,
  ListItemText,
  Stack,
  List,
  Button,
} from "@mui/material";
import useMediaQuery from "@mui/material/useMediaQuery";
import ReplayTwoToneIcon from "@mui/icons-material/ReplayTwoTone";
import theme from "../../styles/mui-theme";
import EditTwoToneIcon from "@mui/icons-material/EditTwoTone";

// App imports
import { useImages, useImagesDispatch } from "../../context/AppProvider";
import { ActionTypes } from "../../context/reducers";

import GenerateForm from "./GenerateForm";
import SimpleDialog from "../../components/SimpleDialog";
import { useGenerateUtils } from "../../utils/GenerateUtils";
import { useNavigate } from "react-router-dom";
import StyledIconButton from "../../components/StyledIconButton";

/* -------------------------------------------------------------------------- */
/*                               COMPONENT START                              */
/* -------------------------------------------------------------------------- */

function Generate() {
  /* ---------------------------- DECLARE VARIABLES --------------------------- */

  // Context variables
  const { generatedImage, generateFormValues, loadingGeneratedImage, user } =
    useImages();
  const dispatch = useImagesDispatch();

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

  const handleDialogClose = () => {
    setDialogOpen(false);
  };

  // Modify image
  const handleImageEdit = () => {
    setFormSubmitted(false);
  };

  //Create new image (reset Form Values)
  const handleNewImage = () => {
    dispatch({
      type: ActionTypes.SET_GENERATE_FORM_VALUES,
      payload: {
        website: "",
        prompt: "",
        style_id: 1,
        style_title: "Default",
        style_prompt: "",
        qr_weight: 0.0,
        negative_prompt: "",
        seed: -1,
        sd_model: "cyberrealistic_v40_151857.safetensors",
      },
    });

    setFormSubmitted(false);
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
      {!formSubmitted ? (
        <GenerateForm
          handleGenerate={handleGenerate}
          setFormSubmitted={setFormSubmitted}
        />
      ) : (
        <></>
      )}

      {/* -------------------------------- QR IMAGE -------------------------------- */}
      {formSubmitted ? ( // Mobile: Only shows when Form has been submitted
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
                  pointerEvents: "none",
                }}
              ></CardMedia>
            )}

            {/* MOBILE: BACK TO FORM BUTTON */}
          </Box>

          {!loadingGeneratedImage && (
            <Box
              sx={{
                flex: "2",
                height: "100%",
                padding: "3rem",
                minWidth: "230px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                overflowY: { md: "scroll" },
                overflowX: "hidden",
              }}
            >
              {/* ------------------------------ ICON BUTTONS ------------------------------ */}
              <Stack
                direction="row"
                justifyContent={{ xs: "center", md: "left" }}
                alignItems="center"
                spacing={3}
                sx={{ mb: "1rem" }}
              >
                {/* DOWNLOAD */}
                <StyledIconButton
                  variant="contained"
                  color="secondary"
                  type="download"
                  // handleClick={() => downloadImage(generatedImage)}
                />

                {/* UPSCALE */}
                {generatedImage?.width === 512 &&
                  generatedImage.user_id === user._id && (
                    <StyledIconButton
                      variant="contained"
                      color="secondary"
                      type="upscale"
                      // handleClick={() => upscaleImage(generatedImage._id, upscaling, setUpscaling)}
                    />
                  )}

                {/* DELETE */}
                {generatedImage?.user_id === user._id && (
                  <StyledIconButton
                    variant="contained"
                    color="secondary"
                    type="delete"
                    //handleClick={() => deleteImage(generatedImage._id, index)}
                  />
                )}
              </Stack>

              {/* -------------------------------- METADATA -------------------------------- */}
              <div style={{ maxHeight: "100%" }}>
                <Typography variant="h5" align={isMobile ? "center" : "left"}>
                  Image Details
                </Typography>
                <List>
                  <ListItemText
                    primary="QR Content"
                    secondary={generatedImage?.content}
                    align={isMobile ? "center" : "left"}
                  />
                  <ListItemText
                    primary="Prompt"
                    secondary={generatedImage?.prompt}
                    align={isMobile ? "center" : "left"}
                  />
                  <ListItemText
                    primary="Style"
                    secondary={generatedImage?.style_title}
                    align={isMobile ? "center" : "left"}
                  />
                  <ListItemText
                    primary="Seed"
                    secondary={generatedImage?.seed}
                    align={isMobile ? "center" : "left"}
                  />
                  <ListItemText
                    primary="QR Code Weight"
                    secondary={generatedImage?.qr_weight}
                    align={isMobile ? "center" : "left"}
                  />
                </List>

                <Stack spacing={2} sx={{ mb: "3rem" }}>
                  <Button
                    variant="outlined"
                    size="medium"
                    color="secondary"
                    sx={{ width: "100%", zIndex: 900 }}
                    aria-label="share"
                    onClick={() => handleImageEdit()}
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
                    onClick={() => handleNewImage()}
                    startIcon={<ReplayTwoToneIcon />}
                  >
                    New Image
                  </Button>
                </Stack>
              </div>
            </Box>
          )}
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
