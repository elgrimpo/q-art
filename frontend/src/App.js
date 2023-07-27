import { Button, Card, CardMedia, TextField, Box, Stack } from "@mui/material";
import "./App.css";
import axios from "axios";
import { useState } from "react";
import placeholderImage from './placeholder_image.png';


function App() {
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
      .get(`http://localhost:8000/generate/`, {params : formValues})
      .then((res) => {
        const data = res.data;
        setImage(`data:image/png;base64,${res.data}`);
      })
      .catch((err) => {
        console.log(err);
      });
  };
  return (
    <div className="app">
      <header className="header">QR Code Generator</header>
      <div className="body">
        <Box className="sidebar">
          <Stack spacing={2}>
          <TextField
            id="website"
            label="Website"
            name="website"
            value= {formValues.website}
            onChange={handleInputChange}
            variant="outlined"
          />
          <TextField
            id="prompt"
            label="Prompt"
            name="prompt"
            value= {formValues.prompt}
            onChange={handleInputChange}
            variant="outlined"
          />
          <Button variant="contained" onClick={(e) => generate(formValues)}>
            Generate Image
          </Button>
          </Stack>
        </Box>
        <div className="image-container">
          <Card>
            <CardMedia
              component="img"
              image={image}
            />
          </Card>
        </div>
      </div>
    </div>
  );
}

export default App;
