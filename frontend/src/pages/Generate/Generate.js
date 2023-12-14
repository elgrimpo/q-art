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
import ReplayTwoToneIcon from '@mui/icons-material/ReplayTwoTone';
import theme from "../../styles/mui-theme";
import dayjs from 'dayjs';


// App imports
import { useImages } from "../../context/AppProvider";
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

  // Navigate
  const navigate = useNavigate();

  // Utils functions
  const { generateImage } = useGenerateUtils();

  // Screen size
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  // Switch between Form and Image view for mobile screen
  const [formSubmitted, setFormSubmitted] = useState(true);

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
                }}
              ></CardMedia>
            )}

            {/* MOBILE: BACK TO FORM BUTTON */}

          </Box>
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
            overflowX: "hidden"

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
            {generatedImage?.width === 512 && generatedImage.user_id === user._id && (
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
                primary="Date created"
                secondary={dayjs(generatedImage?.created_at).format('MMMM D, YYYY')}
                align={isMobile ? "center" : "left"}
              />
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
                primary="Negative prompt"
                secondary={generatedImage?.negative_prompt}
                align={isMobile ? "center" : "left"}
              />
              <ListItemText
                primary="Seed"
                secondary={generatedImage?.seed}
                align={isMobile ? "center" : "left"}
              />
              <ListItemText
                primary="Image Quality"
                secondary={`${generatedImage?.image_quality} (${generatedImage?.steps} sampling steps)`}
                align={isMobile ? "center" : "left"}
              />
              <ListItemText
                primary="Image Dimensions"
                secondary={`${generatedImage?.width} x ${generatedImage?.height} px`}
                align={isMobile ? "center" : "left"}
              />
              <ListItemText
                primary="QR Code Weight"
                secondary={generatedImage?.qr_weight}
                align={isMobile ? "center" : "left"}
              />
              <ListItemText
                primary="Stable Diffusion Model"
                secondary={generatedImage?.sd_model}
                align={isMobile ? "center" : "left"}
              />
              <ListItemText
                primary="Image Id"
                secondary={generatedImage?._id}
                align={isMobile ? "center" : "left"}
              />
            </List>

            {!loadingGeneratedImage && (
              <Button
                variant="contained"
                size="medium"
                color="secondary"
                sx={{ mb: "3rem", width:"100%", zIndex: 900 }}
                aria-label="share"
                onClick={() => handleFormUnsubmit()}
                startIcon={<ReplayTwoToneIcon/>}
              >
                Make another one
              </Button>
            )}
          </div>
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
