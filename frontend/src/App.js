import { Button, Card, CardMedia, TextField, Box, Stack } from "@mui/material";
import "./App.css";
import axios from "axios";
import { useState } from "react";

function App() {
  const [image, setImage] = useState();
  const [prompt, updatePrompt] = useState();

  const generate = async (prompt) => {
    axios
      .get(`http://localhost:8000/generate/?prompt=${prompt}`)
      .then((res) => {
        const data = res.data;
        setImage(res.data);
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
            id="prompt"
            label="Prompt"
            onChange={(e) => updatePrompt(e.target.value)}
            variant="outlined"
          />
          <Button variant="contained" onClick={(e) => generate(prompt)}>
            Generate Image
          </Button>
          </Stack>
        </Box>
        <div className="image-container">
          <Card>
            <CardMedia
              component="img"
              image={`data:image/png;base64,${image}`}
            />
          </Card>
        </div>
      </div>
    </div>
  );
}

export default App;
