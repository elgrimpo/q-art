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
import AutoFixHighTwoToneIcon from "@mui/icons-material/AutoFixHighTwoTone";
import CasinoTwoToneIcon from "@mui/icons-material/CasinoTwoTone";

// App imports
import { useImages } from "../../context/AppProvider";
import SdModelsModal from "./SdModelsModal";
import { useImageUtils } from "../../utils/ImageUtils";
import { useGenerateUtils } from "../../utils/GenerateUtils";

function Generate() {
  const { generatedImage, loadingGeneratedImage, generateFormValues } =
    useImages();
  const [submitDisabled, setSubmitDisabled] = useState(true);
  const { downloadImage } = useImageUtils();
  const { generateImage, selectSdModel, handleInputChange } =
    useGenerateUtils();
  // Modules Modal
  const [open, setOpen] = useState(false);

  const handleModelSelection = (sd_model) => {
    selectSdModel(sd_model);
    setOpen(false);
  };

  // Slider (QR Code Weight)
  const marks = [
    {
      value: -3,
      label: "Low",
    },
    {
      value: 3,
      label: "High",
    },
  ];

  function valuetext(value) {
    return `${value}`;
  }

  const handleClickOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  //Submit
  useEffect(() => {
    if (generateFormValues.website && generateFormValues.prompt) {
      setSubmitDisabled(false);
    } else {
      setSubmitDisabled(true);
    }
  }, [generateFormValues]);

  return (
    <div className="generate-page">
      {/*------ Generate Image Form ------*/}
      <Box className="sidebar">
        <Box className="formfield">
          <Stack useFlexGap spacing={2}>
            <Typography variant="h5">Generate QR Art</Typography>
            <TextField
              required
              id="website"
              label="Website"
              name="website"
              value={generateFormValues.website}
              onChange={handleInputChange}
              variant="outlined"
            />
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
            <Typography variant="subtitle2" align="center">
              QR Code Weight
            </Typography>
            <Slider
              aria-label="QR Code Weight"
              defaultValue={generateFormValues.qr_weight}
              getAriaValueText={valuetext}
              step={0.1}
              valueLabelDisplay="auto"
              marks={marks}
              min={-3.0}
              max={3.0}
              track={false}
              color="secondary"
              name="qr_weight"
              onChange={handleInputChange}
            />
            <Typography variant="subtitle2" align="center">
              Stable Diffusion Model
            </Typography>
            <Button
              variant="contained"
              color="secondary"
              onClick={handleClickOpen}
            >
              {generateFormValues.sd_model}
            </Button>
          </Stack>
        </Box>
        <Fab
          variant="extended"
          disabled={submitDisabled || loadingGeneratedImage}
          size="large"
          color="primary"
          aria-label="generate"
          onClick={(e) => generateImage(generateFormValues)}
        >
          <AutoFixHighTwoToneIcon sx={{ mr: 1 }} />
          Generate
        </Fab>
      </Box>

      {/*------ QR Image ------*/}
      <div className="image-container" elevation={0}>
        {loadingGeneratedImage ? (
          <Box className="loading-box">
            <CircularProgress color="secondary" />
          </Box>
        ) : (
          <CardMedia
            component="img"
            image={generatedImage.image_url}
            sx={{
              borderRadius: "12px",
              maxHeight: "calc(100% - 90px)",
              objectFit: "contain",
            }}
          />
        )}

        <Fab
          variant="extended"
          size="medium"
          disabled={loadingGeneratedImage}
          color="secondary"
          sx={{ margin: "24px" }}
          aria-label="share"
          onClick={() => downloadImage(generatedImage)}
        >
          Download Image
        </Fab>
      </div>

      <SdModelsModal
        open={open}
        handleClose={handleClose}
        handleModelSelection={handleModelSelection}
      />
    </div>
  );
}

export default Generate;
