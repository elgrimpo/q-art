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
import DiamondTwoToneIcon from "@mui/icons-material/DiamondTwoTone";
import useMediaQuery from "@mui/material/useMediaQuery";
import theme from "../../styles/mui-theme";
import AutoFixHighTwoToneIcon from "@mui/icons-material/AutoFixHighTwoTone";

// App imports
import { useImages } from "../../context/AppProvider";
import GenerateModal from "./GenerateModal";
import { useGenerateUtils } from "../../utils/GenerateUtils";
import { useUtils } from "../../utils/utils";
import promptRandomizer from "../../utils/PromptGenerator";
/* -------------------------------------------------------------------------- */
/*                               COMPONENT START                              */
/* -------------------------------------------------------------------------- */

function GenerateForm(props) {
  /* ---------------------------- DECLARE VARIABLES --------------------------- */

  const { formSubmitted, setFormSubmitted } = props;
  // Context variables
  const {
    generatedImage,
    loadingGeneratedImage,
    generateFormValues,
    sd_models,
  } = useImages();

  // Utils functions
  const { calculateCredits } = useUtils();
  const { generateImage, selectSdModel, handleInputChange } =
    useGenerateUtils();

  // Submit Button state
  const [submitDisabled, setSubmitDisabled] = useState(true);

  // Modules Modal (Prompt keywords, Negative Prompt, SD Models)
  const [modalOpen, setModalOpen] = useState(false);
  const [modalVariant, setModalVariant] = useState("sd_model");

  // Screen size
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

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

  // Open Modal
  const handleSdModalOpen = (variant) => {
    setModalVariant(variant);
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
  }, [generateFormValues, calculateCredits, price]);

  /* -------------------------------------------------------------------------- */
  /*                              COMPONENT RENDER                              */
  /* -------------------------------------------------------------------------- */

  return (
    <Box className="sidebar">
      <Stack useFlexGap spacing={2}>
        <Typography
          variant="h5"
          align={isMobile ? "center" : "left"}
          sx={{ mt: "1rem" }}
        >
          Generate QR Art
        </Typography>

        {/* --------------------------------- WEBSITE -------------------------------- */}
        <TextField
          required
          id="website"
          label="Website"
          name="website"
          value={generateFormValues.website}
          onChange={handleInputChange}
          variant="outlined"
        />

        {/* --------------------------------- PROMPT --------------------------------- */}
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
          InputProps={{
            endAdornment: (
              <InputAdornment
                position="end"
                sx={{
                  alignItems: "center",
                  alignSelf: "flex-start",
                  padding: "1.8rem 0rem",
                }}
              >
                <Box sx={{ display: "flex", flexDirection: "column" }}>
                  {/*---- GET KEYWORDS ----*/}
                  <Tooltip title="Select keywords from templates">
                    <IconButton
                      name="prompt_keywords"
                      onClick={() => handleSdModalOpen("prompt_keywords")}
                    >
                      <AutoFixHighTwoToneIcon />
                    </IconButton>
                  </Tooltip>

                  {/* --- RANDOM PROMPT ---- */}
                  <Tooltip title="Generate random prompt">
                    <IconButton
                      name="prompt_random"
                      onClick={() =>
                        handleInputChange({
                          target: {
                            name: "prompt",
                            value: promptRandomizer(),
                          },
                        })
                      }
                    >
                      <CasinoTwoToneIcon />
                    </IconButton>
                  </Tooltip>
                </Box>
              </InputAdornment>
            ),
          }}
        />

        {/* ----------------------------- NEGATIVE PROMPT ---------------------------- */}
        <TextField
          id="negative_prompt"
          label="Negative Prompt"
          name="negative_prompt"
          value={generateFormValues.negative_prompt}
          onChange={handleInputChange}
          variant="outlined"
          multiline
          rows={4}
          InputProps={{
            endAdornment: (
              // --- Get Keywords from template --- //
              <InputAdornment
                position="end"
                sx={{
                  alignItems: "center",
                  alignSelf: "flex-start",
                  padding: "0.5rem 0rem",
                }}
              >
                <Tooltip title="Select keywords from templates">
                  <IconButton
                    name="prompt"
                    value={-1}
                    onClick={() => handleSdModalOpen("negative_prompt")}
                  >
                    <AutoFixHighTwoToneIcon />
                  </IconButton>
                </Tooltip>
              </InputAdornment>
            ),
          }}
        />

        {/* ---------------------------------- SEED ---------------------------------- */}
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

        {/* ------------------------------ IMAGE QUALITY ----------------------------- */}
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

        {/* ----------------------------- QR CODE WEIGHT ----------------------------- */}
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

        {/* ------------------------- MODAL SCREEN------------------------- */}
        <Typography variant="subtitle2" align="center">
          Stable Diffusion Model
        </Typography>
        <Button
          variant="outlined"
          color="secondary"
          onClick={() => handleSdModalOpen("sd_model")}
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
          sx={{ mb: "1rem" }}
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

      <GenerateModal
        open={modalOpen}
        handleClose={handleModalClose}
        handleModelSelection={handleModelSelection}
        variant={modalVariant}
      />
    </Box>
  );
}

export default GenerateForm;
