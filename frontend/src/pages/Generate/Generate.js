// Libraries imports
import React, { useEffect, useState } from 'react';
import axios from "axios";
import dayjs from "dayjs";
import base64ToBlob from "b64-to-blob";
import {
  Fab,
  CardMedia,
  CircularProgress,
  TextField,
  Box,
  Stack,
  Typography,
  ToggleButtonGroup,
  ToggleButton,
  Slider,
  List,
  ListItemText,
} from "@mui/material";
import AutoFixHighTwoToneIcon from "@mui/icons-material/AutoFixHighTwoTone";

// App imports
import { useImages, useImagesDispatch } from "../../context/AppProvider";
import { ActionTypes } from "../../context/reducers";

function Generate() {
  const dispatch = useImagesDispatch();
  const { generatedImage, loadingGeneratedImage, generateFormValues, user } =
    useImages();
  const [submitDisabled, setSubmitDisabled] = useState(true);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    dispatch({
      type: ActionTypes.SET_GENERATE_FORM_VALUES,
      payload: {
        ...generateFormValues,
        [name]: value,
      },
    });
  };

  const generate = async (generateFormValues) => {
    dispatch({
      type: ActionTypes.SET_LOADING_GENERATED_IMAGE,
      payload: true,
    });
    axios
      .get(`http://localhost:8000/generate/?user_id=${user._id}`, {
        params: generateFormValues,
        withCredentials: true,
      })
      .then((res) => {
        // Update Generated Image state
        dispatch({
          type: ActionTypes.SET_GENERATED_IMAGE,
          payload: res.data,
        });
        dispatch({
          type: ActionTypes.SET_LOADING_GENERATED_IMAGE,
          payload: false,
        });

        // Reset My Codes Images and Page
        dispatch({
          type: ActionTypes.SET_USER_IMAGES_PAGE,
          payload: 0,
        });
        dispatch({
          type: ActionTypes.SET_USER_IMAGES,
          payload: [],
        });
      })
      .catch((err) => {
        dispatch({
          type: ActionTypes.SET_LOADING_GENERATED_IMAGE,
          payload: false,
        });
        console.log(err);
      });
  };

  const downloadImage = (generatedImage) => {
    const blob = base64ToBlob(generatedImage.image_str);
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "my_qr_art.png";
    link.click();
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

  //Submit 
  useEffect(() => {
    if(generateFormValues.website && generateFormValues.prompt) {
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
            sx={{ mb: "3rem" }}
            name="qr_weight"
            onChange={handleInputChange}
          />
        </Stack>
      </Box>
      <Fab
          variant="extended"
          disabled={submitDisabled || loadingGeneratedImage}
          size="large"
          color="primary"
          aria-label="generate"
          onClick={(e) => generate(generateFormValues)}
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
            image={`data:image/png;base64,${generatedImage.image_str}`}
            sx={{ borderRadius: "12px",maxHeight: "calc(100% - 90px)", objectFit: "contain"}}
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


    </div>
  );
}

export default Generate;
