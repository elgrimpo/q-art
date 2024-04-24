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
  Fab,
} from "@mui/material";
import CasinoTwoToneIcon from "@mui/icons-material/CasinoTwoTone";
import DiamondTwoToneIcon from "@mui/icons-material/DiamondTwoTone";
import QrCode2TwoToneIcon from "@mui/icons-material/QrCode2TwoTone";
import PhotoTwoToneIcon from "@mui/icons-material/PhotoTwoTone";
import Masonry, { ResponsiveMasonry } from "react-responsive-masonry";
import useMediaQuery from "@mui/material/useMediaQuery";
import theme from "@/_styles/theme";

// App imports
import GenerateModal from "./GenerateModal";
import promptRandomizer from "@/_utils/PromptGenerator";
import { styles } from "@/_utils/ImageStyles";
import StylesCard from "./StylesCard";
import { useStore } from "@/store";
import { calculateCredits } from "@/_utils/utils";
/* -------------------------------------------------------------------------- */
/*                               COMPONENT START                              */
/* -------------------------------------------------------------------------- */

function GenerateForm(props) {
  /* ---------------------------- DECLARE VARIABLES --------------------------- */

  const { handleGenerate } = props;
  const { generateFormValues, setGenerateFormValues } = useStore();

  // Screen size
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

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
  // Handle input change
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setGenerateFormValues({ ...generateFormValues, [name]: value });
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
    setGenerateFormValues({
      ...generateFormValues,
      style_id: item.id,
      style_prompt: item.prompt,
      style_title: item.title,
      sd_model: item.sd_model,
    });
    if (item.title === "Custom Style") {
      handleSdModalOpen("prompt_keywords");
    }
  };

  /* -------------------------------------------------------------------------- */
  /*                              COMPONENT RENDER                              */
  /* -------------------------------------------------------------------------- */

  return (
    <Box>
      <Stack useFlexGap spacing={1}>
        {/* <Typography variant="h3" align="center" sx={{ mt: "1rem" }}>
          Generate QR Art
        </Typography> */}

        {/* --------------------------------- WEBSITE -------------------------------- */}
        <Box className="form-section" sx={{ marginTop: "0rem" }}>
          <Typography className="form-title" variant="h5" align="center">
            Website URL
          </Typography>
          <TextField
            className="form-field"
            required
            id="website"
            label="Website"
            name="website"
            value={generateFormValues.website}
            onChange={handleInputChange}
            variant="outlined"
          />
        </Box>

        {/* --------------------------------- PROMPT --------------------------------- */}
        <Box className="form-section">
          <Typography className="form-title" variant="h5" align="center">
            Image Description
          </Typography>
          <TextField
            className="form-field"
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
                    padding: "0.9rem 0rem",
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
        </Box>

        {/* ----------------------------- QR CODE WEIGHT ----------------------------- */}
        <Stack
          direction={{ xs: "column", md: "row" }}
          useFlexGap
          alignItems="stretch"
          spacing={{ xs: 1, md: 2 }}
        >
          <Box className="form-section" sx={{ width: "100%" }}>
            <Typography className="form-title" variant="h5" align="center">
              QR Code Weight
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
                value={generateFormValues.qr_weight}
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

          <Box className="form-section" sx={{ width: "100%" }}>
            {/* ---------------------------------- SEED ---------------------------------- */}
            <Typography className="form-title" variant="h5" align="center">
              Seed
            </Typography>

            <TextField
              className="form-field"
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
        <Box className="form-section" sx={{ padding: "1rem 0rem 4rem 0rem" }}>
          <Typography className="form-title" variant="h5" align="center">
            Art Style
          </Typography>
          <ResponsiveMasonry
            style={{
              width: "100%",
              // backgroundColor: "#A5FFC3",
              padding: isMobile ? "0.5rem" : "1rem",
              overflow: "visible",
            }}
            columnsCountBreakPoints={{ 350: 2, 750: 3, 1200: 4 }}
          >
            <Masonry
              gutter={isMobile ? "0.5rem" : "1rem"}
              style={{ overflow: "visible" }}
            >
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
        </Box>
      </Stack>

      <GenerateModal
        open={modalOpen}
        handleClose={handleModalClose}
        variant={modalVariant}
        customStyle={customStyle}
        setCustomStyle={setCustomStyle}
      />

      {/* --------------------------------- SUBMIT --------------------------------- */}
      <Button
        variant="contained"
        color="secondary"
        size="large"
        disabled={submitDisabled}
        aria-label="generate"
        onClick={(e) => handleGenerate()}
        sx={{
          position: "fixed",

          bottom: "20px",
          width: "80%",
          margin: "auto",
          left: "10%",
        }}
      >
        <Typography
          variant="body1"
          component="div"
          sx={{
            display: "flex",
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          Generate QR Code ( {price}
          <DiamondTwoToneIcon
            fontSize="small"
            color="primary"
            sx={{ mr: "4px" }}
          />{" "}
          )
        </Typography>
      </Button>
    </Box>
  );
}

export default GenerateForm;
