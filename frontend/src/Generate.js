import {
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
import ShareTwoToneIcon from '@mui/icons-material/ShareTwoTone';
import FacebookTwoToneIcon from '@mui/icons-material/FacebookTwoTone';
import CreateTwoToneIcon from '@mui/icons-material/CreateTwoTone';

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
      .get(`http://localhost:8000/generate/`, 
      { 
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
    <div className="body">
      {/*------ Generate Image Form ------*/}

      <Box className="sidebar">
        <Stack spacing={2}>
          <Typography variant="h5">Generate new QR code</Typography>
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
          />
          {/* TODO: remove styling */}
          <Button variant="contained" onClick={(e) => generate(formValues)} sx={{backgroundColor: '#70E195', fontColor: '000000'}}>
            Generate Image
          </Button>
        </Stack>
      </Box>

      {/*------ QR Image ------*/}
      <div className="image-container">
        <Paper
          elevation={5}
          sx={{
            height: "100%",
            width: "100%",
            backgroundColor: "#70E195",
            borderRadius: "16px",
          }}
        >
          <Typography variant="h5" sx={{ margin: "1rem" }} align="center">
            My QR Code
          </Typography>
          <CardMedia component="img" image={image} />
          <CardActionArea
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {" "}
            {/* TODO: remove styling */}
            <Button variant="contained" sx={{ margin: "24px", backgroundColor: '#000000' }}>
              Download Image
            </Button>
          </CardActionArea>
        </Paper>
      </div>

      {/*------ Metadata ------*/}
      <Box className="sidebar">
        {/*TODO: map from an object*/}
        <Typography variant="h6" sx={{ margin: "1rem" }} align="center">
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
        <Stack direction="row"
  justifyContent="center"
  alignItems="center"
  spacing={3}>

            <IconButton>
<ShareTwoToneIcon/>
            </IconButton>
            <IconButton>
<FacebookTwoToneIcon/>
            </IconButton>
            <IconButton>
<CreateTwoToneIcon/>
            </IconButton>
        </Stack>
      </Box>
    </div>
  );
}

export default Generate;
