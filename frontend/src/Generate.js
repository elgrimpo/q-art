import {
  Fab,
  Button,
  Card,
  CardHeader,
  CardMedia,
  TextField,
  Box,
  Stack,
  CardActionArea,
  Typography,
  Paper,
  IconButton,
} from "@mui/material";
import "./App.css";
import axios from "axios";
import { useState } from "react";
import placeholderImage from "./placeholder_image.png";
import ShareTwoToneIcon from "@mui/icons-material/ShareTwoTone";
import FacebookTwoToneIcon from "@mui/icons-material/FacebookTwoTone";
import CreateTwoToneIcon from "@mui/icons-material/CreateTwoTone";
import AutoFixHighTwoToneIcon from "@mui/icons-material/AutoFixHighTwoTone";

function Generate() {
  const [image, setImage] = useState(placeholderImage);
  const [prompt, updatePrompt] = useState();
  const [formValues, setFormValues] = useState({
    website: "",
    prompt: "",
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormValues({
      ...formValues,
      [name]: value,
    });
  };

  const generate = async (formValues) => {
    axios
      .get(`http://localhost:8000/generate/`, {
        params: formValues,
        withCredentials: true,
      })
      .then((res) => {
        const data = res.data;
        setImage(`data:image/png;base64,${res.data}`);
      })
      .catch((err) => {
        console.log(err);
      });
  };
  return (
    <div className="generate-page">
      {/*------ Generate Image Form ------*/}

      <Box className="sidebar">
        <Stack spacing={2}>
          <Typography variant="h5">Generate QR Art</Typography>
          <TextField
            id="website"
            label="Website"
            name="website"
            value={formValues.website}
            onChange={handleInputChange}
            variant="outlined"
          />
          <TextField
            id="prompt"
            label="Prompt"
            name="prompt"
            value={formValues.prompt}
            onChange={handleInputChange}
            variant="outlined"
            multiline
            rows={4}
          />
          <Fab
            variant="extended"
            size="medium"
            color="primary"
            aria-label="add"
          >
            <AutoFixHighTwoToneIcon sx={{ mr: 1 }} />
            Generate
          </Fab>
        </Stack>
      </Box>

      {/*------ QR Image ------*/}
        <div className="image-container"
          elevation={0}
        >
          <CardMedia
            component="img"
            image={image}
            sx={{ borderRadius: "12px" }}
          />

          <Fab
            variant="extended"
            size="medium"
            color="secondary"
            sx={{ margin: "24px" }}
            aria-label="share"
          >
            Download Image
          </Fab>
        </div>


      {/*------ Metadata ------*/}
      <Box className="sidebar">
        {/*TODO: map from an object*/}
        <Typography variant="h5" sx={{ margin: "1rem" }} align="center">
          My QR Code
        </Typography>
        <Typography variant="subtitle2" align="center">
          Date created
        </Typography>
        <Typography variant="body" align="center" sx={{ mb: "1rem" }}>
          October 12 2023
        </Typography>
        <Typography variant="subtitle2" align="center">
          QR Content
        </Typography>
        <Typography variant="body" align="center" sx={{ mb: "1rem" }}>
          christophbiedermann.com
        </Typography>
        <Typography variant="subtitle2" align="center">
          Prompts used
        </Typography>
        <Typography variant="body" align="center" sx={{ mb: "1rem" }}>
          Switzerland, mountains, nature, blue sky, castle, medieval
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
