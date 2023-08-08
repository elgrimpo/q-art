import {
  Fab,
  CardMedia,
  CircularProgress,
  TextField,
  Box,
  Stack,
  Typography,
  IconButton,
  ToggleButtonGroup,
  ToggleButton,
  Slider,
} from "@mui/material";
import "./App.css";
import axios from "axios";
import { useState } from "react";
import ShareTwoToneIcon from "@mui/icons-material/ShareTwoTone";
import FacebookTwoToneIcon from "@mui/icons-material/FacebookTwoTone";
import CreateTwoToneIcon from "@mui/icons-material/CreateTwoTone";
import AutoFixHighTwoToneIcon from "@mui/icons-material/AutoFixHighTwoTone";
import dayjs from "dayjs";
import base64ToBlob from "b64-to-blob";
import { placeholder_image_str } from "./placeholder_image";
import { useImages, useImagesDispatch } from "./AppProvider";
import { ActionTypes } from "./reducers";

function Generate() {
  const dispatch = useImagesDispatch();
  const {
    generatedImage,
    loadingGeneratedImage,
    generateFormValues,
  } = useImages();

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
      .get(`http://localhost:8000/generate/`, {
        params: generateFormValues,
        withCredentials: true,
      })
      .then((res) => {
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

  // Toogle Group (Image Quality)
  const [alignment, setAlignment] = useState("medium");
  const handleChange = (event, newAlignment) => {
    setAlignment(newAlignment);
    handleInputChange(event);
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

  return (
    <div className="generate-page">
      {/*------ Generate Image Form ------*/}

      <Box className="sidebar">
        <Stack useFlexGap spacing={2}>
          <Typography variant="h5">Generate QR Art</Typography>
          <TextField
            id="website"
            label="Website"
            name="website"
            value={generateFormValues.website}
            onChange={handleInputChange}
            variant="outlined"
          />
          <TextField
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
            value={alignment}
            exclusive
            onChange={handleChange}
            aria-label="image-quality"
            fullWidth="true"
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
            defaultValue={0.0}
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
        <Fab
          variant="extended"
          size="medium"
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
            sx={{ borderRadius: "12px" }}
          />
        )}

        <Fab
          variant="extended"
          size="medium"
          color="secondary"
          sx={{ margin: "24px" }}
          aria-label="share"
          onClick={() => downloadImage(generatedImage)}
        >
          Download Image
        </Fab>
      </div>

      {/*------ Metadata ------*/}
      <Box className="sidebar">
        <Typography variant="h5" sx={{ margin: "1rem" }} align="center">
          My QR Code
        </Typography>
        <Typography variant="subtitle2" align="center">
          Date created
        </Typography>
        <Typography variant="body" align="center" sx={{ mb: "1rem" }}>
          {generatedImage.created_at != "-"
            ? dayjs(generatedImage.created_at).format("MMMM D, YYYY")
            : "-"}
        </Typography>
        <Typography variant="subtitle2" align="center">
          QR Content
        </Typography>
        <Typography variant="body" align="center" sx={{ mb: "1rem" }}>
          {generatedImage.content}
        </Typography>
        <Typography variant="subtitle2" align="center">
          Prompt
        </Typography>
        <Typography variant="body" align="center" sx={{ mb: "1rem" }}>
          {generatedImage.prompt}
        </Typography>
        <Typography variant="subtitle2" align="center">
          Seed
        </Typography>
        <Typography variant="body" align="center" sx={{ mb: "1rem" }}>
          {generatedImage.seed}
        </Typography>

        {/*------ Additional Actions ------*/}
        <Stack
          direction="row"
          justifyContent="center"
          alignItems="center"
          spacing={3}
        >
          <IconButton>
            <ShareTwoToneIcon />
          </IconButton>
          <IconButton>
            <FacebookTwoToneIcon />
          </IconButton>
          <IconButton>
            <CreateTwoToneIcon />
          </IconButton>
        </Stack>
      </Box>
    </div>
  );
}

export default Generate;
