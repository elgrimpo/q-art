import {
  Fab,
  CardMedia,
  CircularProgress,
  TextField,
  Box,
  Stack,
  Typography,
  IconButton,
} from "@mui/material";
import "./App.css";
import axios from "axios";
import { useState } from "react";
import ShareTwoToneIcon from "@mui/icons-material/ShareTwoTone";
import FacebookTwoToneIcon from "@mui/icons-material/FacebookTwoTone";
import CreateTwoToneIcon from "@mui/icons-material/CreateTwoTone";
import AutoFixHighTwoToneIcon from "@mui/icons-material/AutoFixHighTwoTone";
import dayjs from "dayjs";
import base64ToBlob from 'b64-to-blob';
import { placeholder_image_str } from "./placeholder_image";

function Generate() {

  const [image, setImage] = useState({
    created_at: "-",
    content: "-",
    prompt: "-",
    image_str: placeholder_image_str
  });
  const [isLoading, setIsLoading] = useState(false);
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
    setIsLoading(true);
    axios
      .get(`http://localhost:8000/generate/`, {
        params: formValues,
        withCredentials: true,
      })
      .then((res) => {
        setImage(res.data);
        setIsLoading(false);
      })
      .catch((err) => {
        setIsLoading(false);
        console.log(err);
      });
  };

  const downloadImage = (image) => {
    const blob = base64ToBlob(image.image_str);
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "my_qr_art.png";
    link.click();
  };
  console.log(placeholder_image_str)


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
            aria-label="generate"
            onClick={(e) => generate(formValues)}
          >
            <AutoFixHighTwoToneIcon sx={{ mr: 1 }} />
            Generate
          </Fab>
        </Stack>
      </Box>

      {/*------ QR Image ------*/}
      <div className="image-container" elevation={0}>
        {isLoading ? (
          <Box className="loading-box">
            <CircularProgress color="secondary" />
          </Box>
        ) : (
          <CardMedia
            component="img"
            image={`data:image/png;base64,${image.image_str}`}
            sx={{ borderRadius: "12px" }}
          />
        )}

        <Fab
          variant="extended"
          size="medium"
          color="secondary"
          sx={{ margin: "24px" }}
          aria-label="share"
          onClick={() => downloadImage(image)}
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
          {image.created_at != "-" ? dayjs(image.created_at).format("MMMM D, YYYY") : "-"}
        </Typography>
        <Typography variant="subtitle2" align="center">
          QR Content
        </Typography>
        <Typography variant="body" align="center" sx={{ mb: "1rem" }}>
          {image.content}
        </Typography>
        <Typography variant="subtitle2" align="center">
          Prompts used
        </Typography>
        <Typography variant="body" align="center" sx={{ mb: "1rem" }}>
          {image.prompt}
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
