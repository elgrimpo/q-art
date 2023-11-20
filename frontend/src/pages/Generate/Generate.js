// Libraries imports
import React, { useEffect, useState } from "react";
import {
  Fab,
  CardMedia,
  Button,
  CircularProgress,
  TextField,
  Box,
  Stack,
  Typography,
  ToggleButtonGroup,
  ToggleButton,
  Slider,
  IconButton,
  Tooltip,
  InputAdornment,
} from "@mui/material";
import CasinoTwoToneIcon from "@mui/icons-material/CasinoTwoTone";
import DownloadTwoToneIcon from "@mui/icons-material/DownloadTwoTone";
import DeleteForeverTwoToneIcon from "@mui/icons-material/DeleteForeverTwoTone";
import DiamondTwoToneIcon from "@mui/icons-material/DiamondTwoTone";
import useMediaQuery from "@mui/material/useMediaQuery";
import theme from "../../styles/mui-theme";

// App imports
import { useImages } from "../../context/AppProvider";
import SdModelsModal from "./SdModelsModal";
import { useImageUtils } from "../../utils/ImageUtils";
import { useGenerateUtils } from "../../utils/GenerateUtils";
import { useUtils } from "../../utils/utils";

/* -------------------------------------------------------------------------- */
/*                               COMPONENT START                              */
/* -------------------------------------------------------------------------- */

function Generate() {
  /* ---------------------------- DECLARE VARIABLES --------------------------- */

  // Context variables
  const {
    generatedImage,
    loadingGeneratedImage,
    generateFormValues,
    sd_models,
    user,
  } = useImages();

  // Utils functions
  const { calculateCredits } = useUtils();
  const { downloadImage } = useImageUtils();
  const { generateImage, selectSdModel, handleInputChange } =
    useGenerateUtils();

  // Submit Button state
  const [submitDisabled, setSubmitDisabled] = useState(true);

  // Modules Modal
  const [modalOpen, setModalOpen] = useState(false);

  // Screen size
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  // Switch between Form and Image view for mobile screen
  const [formSubmitted, setFormSubmitted] = useState(false);

  // Track user credits
  const [price, setPrice] = useState(
    calculateCredits("imageQuality", generateFormValues.image_quality)
  );

  // Slider for (QR Code Weight)
  const qrWeight = [
    {
      value: -3,
      label: "Low",
    },
    {
      value: 3,
      label: "High",
    },
  ];

  /* -------------------------------- FUNCTIONS ------------------------------- */

  // SD Model selection in Modal window
  const handleModelSelection = (sd_model) => {
    selectSdModel(sd_model);
    setModalOpen(false);
  };

  // Initiate QR Code Art generation
  const handleGenerate = () => {
    generateImage(generateFormValues);
    setFormSubmitted(true);
  };

  // Switch to Form view for mobile view
  const handleFormUnsubmit = () => {
    setFormSubmitted(false);
  };

  // Set display text for slider
  function sliderText(value) {
    return `${value}`;
  }

  // Open Modules Modal
  const handleModalOpen = () => {
    setModalOpen(true);
  };

  // Open Modules Modal
  const handleModalClose = () => {
    setModalOpen(false);
  };

  //Keep track of Form Values
  useEffect(() => {
    const newPrice = calculateCredits(
      "imageQuality",
      generateFormValues.image_quality
    );
    if (newPrice !== price) {
      setPrice(newPrice);
    }
    if (generateFormValues.website && generateFormValues.prompt) {
      setSubmitDisabled(false);
    } else {
      setSubmitDisabled(true);
    }
  }, [generateFormValues]);

  /* -------------------------------------------------------------------------- */
  /*                              COMPONENT RENDER                              */
  /* -------------------------------------------------------------------------- */

  return (
    <div className="generate-page">
      {/* ------------------------------ GENERATE FORM ----------------------------- */}
      {/* TODO: MOVE FORM TO SEPARATE COMPONENT */}
      {!isMobile || (isMobile && !formSubmitted) ? (
        <Box className="sidebar">
          <Box className="formfield">
            <Stack useFlexGap spacing={2}>
              <Typography variant="h5" align={isMobile ? "center" : "left"} sx={{mt:"1rem"}}>
                Generate QR Art
              </Typography>

              {/* WEBSITE */}
              <TextField
                required
                id="website"
                label="Website"
                name="website"
                value={generateFormValues.website}
                onChange={handleInputChange}
                variant="outlined"
              />

              {/* PROMPT */}
              <TextField
                required
                id="prompt"
                label="Prompt"
                name="prompt"
                value={generateFormValues.prompt}
                onChange={handleInputChange}
                variant="outlined"
                multiline
                rows={4}
              />

              {/* NEGATIVE PROMPT */}
              <TextField
                id="negative_prompt"
                label="Negative Prompt"
                name="negative_prompt"
                value={generateFormValues.negative_prompt}
                onChange={handleInputChange}
                variant="outlined"
                multiline
                rows={4}
              />

              {/* SEED */}
              <TextField
                id="seed"
                label="Seed"
                name="seed"
                value={generateFormValues.seed}
                onChange={handleInputChange}
                variant="outlined"
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <Tooltip title="Set to Random">
                        <IconButton
                          name="seed"
                          value={-1}
                          onClick={() =>
                            handleInputChange({
                              target: {
                                name: "seed",
                                value: -1,
                              },
                            })
                          }
                        >
                          <CasinoTwoToneIcon />
                        </IconButton>
                      </Tooltip>
                    </InputAdornment>
                  ),
                }}
              />

              {/* IMAGE QUALITY */}
              <Typography variant="subtitle2" align="center">
                Image Quality
              </Typography>
              <ToggleButtonGroup
                color="secondary"
                value={generateFormValues.image_quality}
                exclusive
                onChange={handleInputChange}
                aria-label="image-quality"
                fullWidth={true}
                name="image_quality"
              >
                <ToggleButton name="image_quality" value="low">
                  Low
                </ToggleButton>
                <ToggleButton name="image_quality" value="medium">
                  Medium
                </ToggleButton>
                <ToggleButton name="image_quality" value="high">
                  High
                </ToggleButton>
              </ToggleButtonGroup>

              {/* QR CODE WEIGHT */}
              <Typography variant="subtitle2" align="center">
                QR Code Weight
              </Typography>
              <Slider
                aria-label="QR Code Weight"
                defaultValue={generateFormValues.qr_weight}
                getAriaValueText={sliderText}
                step={0.1}
                valueLabelDisplay="auto"
                marks={qrWeight}
                min={-3.0}
                max={3.0}
                track={false}
                color="secondary"
                name="qr_weight"
                onChange={handleInputChange}
                sx={{ width: "90%", margin: "auto" }}
              />

              {/* ------------------------- SD MODELS MODAL ------------------------- */}
              <Typography variant="subtitle2" align="center">
                Stable Diffusion Model
              </Typography>
              <Button
                variant="outlined"
                color="secondary"
                onClick={handleModalOpen}
              >
                {
                  sd_models?.find(
                    (model) => model.sd_name === generateFormValues.sd_model
                  )?.name
                }
              </Button>
              
              {/* --------------------------------- SUBMIT --------------------------------- */}
              <Button
                variant="contained"
                color="primary"
                disabled={submitDisabled || loadingGeneratedImage}
                aria-label="generate"
                onClick={(e) => handleGenerate()}
                sx={{mb:"1rem"}}
              >
                <Typography variant="body1" component="div">
                  Generate QR Code ( {price}
                  <IconButton size="small">
                    <DiamondTwoToneIcon />
                  </IconButton>
                  )
                </Typography>
              </Button>
            </Stack>

            <SdModelsModal
              open={modalOpen}
              handleClose={handleModalClose}
              handleModelSelection={handleModelSelection}
            />
          </Box>
        </Box>
      ) : (
        <></>
      )}

      {/* -------------------------------- QR IMAGE -------------------------------- */}
      {!isMobile || (isMobile && formSubmitted) ? ( // Mobile: Only shows when Form has been submitted
        <div className="image-container">
          <div className="image-card" elevation={0}>
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
                  borderRadius: { md: "12px" },
                  maxHeight: {
                    xs: "calc(100% - 200px)",
                    md: "calc(100% - 90px)",
                  },
                  objectFit: "contain",
                }}
              />
            )}

            {/* ACTION BUTTONS */}
            <Stack
              direction="row"
              justifyContent="center"
              alignItems="center"
              spacing={3}
              sx={{ mt: "1rem" }}
            >
              <Tooltip title="Download image">
                <IconButton onClick={() => downloadImage(generatedImage)}>
                  <DownloadTwoToneIcon />
                </IconButton>
              </Tooltip>

              <Tooltip title="Delete image">
                {/* TODO: Delete only user Images */}
                <IconButton>
                  <DeleteForeverTwoToneIcon />
                </IconButton>
              </Tooltip>

              {generatedImage.width === 512 && (
                // TODO: Upscale only user Images
                <Tooltip title="Upscale resolution to 1024 x 1024">
                  <IconButton>
                    <DiamondTwoToneIcon />
                  </IconButton>
                </Tooltip>
              )}
            </Stack>

            {/* MOBILE: BACK TO FORM BUTTON */}
            {isMobile && !loadingGeneratedImage && (
              <Fab
                variant="extended"
                size="medium"
                color="secondary"
                sx={{ margin: "24px" }}
                aria-label="share"
                onClick={() => handleFormUnsubmit()}
              >
                Make another one
              </Fab>
            )}
          </div>
        </div>
      ) : (
        <></>
      )}
    </div>
  );
}

export default Generate;
