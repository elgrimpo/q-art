"use client";
// Libraries imports
import React, { useEffect, useState } from "react";
import {
  Button,
  TextField,
  Box,
  Stack,
  Typography,
  Slider,
  IconButton,
  Tooltip,
  InputAdornment,
} from "@mui/material";
import CasinoTwoToneIcon from "@mui/icons-material/CasinoTwoTone";
import DiamondTwoToneIcon from "@mui/icons-material/DiamondTwoTone";
import QrCode2TwoToneIcon from "@mui/icons-material/QrCode2TwoTone";
import PhotoTwoToneIcon from "@mui/icons-material/PhotoTwoTone";
import Masonry, { ResponsiveMasonry } from "react-responsive-masonry";

// App imports
import { useImages, useImagesDispatch } from "../../_context/AppProvider";
import { ActionTypes } from "../../_context/reducers";
import GenerateModal from "./GenerateModal";
import { useGenerateUtils } from "../../_utils/GenerateUtils";
import { useUtils } from "../../_utils/utils";
import promptRandomizer from "../../_utils/PromptGenerator";
import { styles } from "../../_utils/ImageStyles";
import StylesCard from "./StylesCard";
/* -------------------------------------------------------------------------- */
/*                               COMPONENT START                              */
/* -------------------------------------------------------------------------- */

function GenerateForm(props) {
  /* ---------------------------- DECLARE VARIABLES --------------------------- */

  const { handleGenerate } = props;
  // Context variables
  const { loadingGeneratedImage, generateFormValues } = useImages();
  const dispatch = useImagesDispatch();

  // Utils functions
  const { calculateCredits } = useUtils();
  const { handleInputChange } = useGenerateUtils();

  // Submit Button state
  const [submitDisabled, setSubmitDisabled] = useState(true);

  // Modules Modal (Prompt keywords, Negative Prompt, SD Models)
  const [modalOpen, setModalOpen] = useState(false);

  const [modalVariant, setModalVariant] = useState("prompt_keywords");

  // Track user credits
  const [price, setPrice] = useState(calculateCredits({ generate: 1 }));

  // Slider for (QR Code Weight)
  const qrWeight = [{ value: -3 }, { value: 3 }];

  // Custom Style
  const [customStyle, setCustomStyle] = useState({
    id: 0,
    title: "Custom Style",
    prompt: "",
    image_url:
      "https://qrartimages.s3.us-west-1.amazonaws.com/customStyleTile.png",
    keywords: [],
    sd_model: "colorful_v31_62333.safetensors",
  });

  /* -------------------------------- FUNCTIONS ------------------------------- */

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
    if (generateFormValues.website && generateFormValues.prompt) {
      setSubmitDisabled(false);
    } else {
      setSubmitDisabled(true);
    }
  }, [generateFormValues]);

  // set Custom Style in case values are copied from another picture
  useEffect(() => {
    if (generateFormValues.style_title === "Custom Style") {
      setCustomStyle({
        ...customStyle,
        prompt: generateFormValues.style_prompt,
        keywords: generateFormValues.style_prompt.split(", "),
      });
    }
  }, [generateFormValues.style_title]);

  // Select Style
  const handleStyleClick = (item) => {
    dispatch({
      type: ActionTypes.SET_GENERATE_FORM_VALUES,
      payload: {
        ...generateFormValues,
        style_id: item.id,
        style_prompt: item.prompt,
        style_title: item.title,
        sd_model: item.sd_model,
      },
    });
    if (item.title === "Custom Style") {
      handleSdModalOpen("prompt_keywords");
    }
  };

  /* -------------------------------------------------------------------------- */
  /*                              COMPONENT RENDER                              */
  /* -------------------------------------------------------------------------- */

  return (
    <Box className="sidebar">
      <Stack useFlexGap flexWrap="wrap" spacing={1}>
        <Typography variant="h5" align="center" sx={{ mt: "1rem" }}>
          Generate QR Art
        </Typography>

        {/* --------------------------------- WEBSITE -------------------------------- */}
        <Typography variant="h6" align="center">
          Enter your website URL
        </Typography>
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
        <Typography variant="h6" align="center" sx={{ mt: "1rem" }}>
          What do you want to see in your QR Code?
        </Typography>
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

        {/* ----------------------------- QR CODE WEIGHT ----------------------------- */}
        <Stack
          direction={{ xs: "column", md: "row" }}
          useFlexGap
          alignItems="stretch"
          spacing={4}
        >
          <Box sx={{ width: "100%" }}>
            <Typography variant="h6" align="center" sx={{ mt: "1rem" }}>
              How strong should the QR Code be?
            </Typography>

            {/* LEFT ICON */}
            <Stack flexDirection="row">
              <Box
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                  margin: "0rem 1rem",
                }}
              >
                <IconButton sx={{ padding: "0" }} size="large">
                  <PhotoTwoToneIcon />
                </IconButton>
                <Typography variant="subtitle2" align="center">
                  Weak
                </Typography>
              </Box>

              {/* SLIDER */}
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
                sx={{ width: "95%", margin: "auto" }}
              />

              {/* RIGHT ICON */}
              <Box
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                  margin: "0rem 1rem",
                }}
              >
                <IconButton size="large" sx={{ padding: "0" }}>
                  <QrCode2TwoToneIcon />
                </IconButton>
                <Typography variant="subtitle2" align="center">
                  Strong
                </Typography>
              </Box>
            </Stack>
          </Box>

          <Box sx={{ width: "100%" }}>
            {/* ---------------------------------- SEED ---------------------------------- */}
            <Typography variant="h6" align="center" sx={{ mt: "1rem" }}>
              Do you want to use a seed?
            </Typography>

            <TextField
              id="seed"
              label="Seed"
              name="seed"
              value={generateFormValues.seed}
              onChange={handleInputChange}
              variant="outlined"
              fullWidth
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
          </Box>
        </Stack>

        {/* --------------------------------- Styles --------------------------------- */}

        <Typography variant="h6" align="center" sx={{ mt: "1rem" }}>
          Select a Style for your QR Code
        </Typography>
        <ResponsiveMasonry
          style={{ width: "100%" }}
          columnsCountBreakPoints={{ 350: 1, 750: 2, 1200: 3 }}
        >
          <Masonry gutter="1rem">
            <StylesCard
              item={customStyle}
              index={0}
              handleClick={handleStyleClick}
            />
            {styles.map((item, index) => (
              <StylesCard
                item={item}
                index={index}
                key={index}
                handleClick={handleStyleClick}
              />
            ))}
          </Masonry>
        </ResponsiveMasonry>

        {/* --------------------------------- SUBMIT --------------------------------- */}
        <Button
          variant="contained"
          color="secondary"
          disabled={submitDisabled || loadingGeneratedImage}
          aria-label="generate"
          onClick={(e) => handleGenerate()}
          sx={{ mb: "2rem", position: "sticky", bottom: "0rem" }}
        >
          {/* TODO: Find workaround for HTML Nesting issue */}
          Generate QR Code
          {/* <Typography variant="body1" component="div">
            Generate QR Code ( {price}
            <IconButton size="small" color="primary">
              <DiamondTwoToneIcon />
            </IconButton>
            )
          </Typography> */}
        </Button>
      </Stack>

      <GenerateModal
        open={modalOpen}
        handleClose={handleModalClose}
        variant={modalVariant}
        customStyle={customStyle}
        setCustomStyle={setCustomStyle}
      />
    </Box>
  );
}

export default GenerateForm;
