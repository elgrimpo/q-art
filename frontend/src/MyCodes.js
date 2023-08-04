import { Card, CardMedia, CircularProgress, Box, Grid, Stack, IconButton } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import ShareTwoToneIcon from "@mui/icons-material/ShareTwoTone";
import "./App.css";
import axios from "axios";
import { useState, useEffect } from "react";
import base64ToBlob from 'b64-to-blob';
import DownloadTwoToneIcon from '@mui/icons-material/DownloadTwoTone';
import DeleteForeverTwoToneIcon from '@mui/icons-material/DeleteForeverTwoTone';

function MyCodes() {
  const [images, setImages] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const theme = useTheme();
  const primaryColor = theme.palette.primary.main;
  const secondaryColor = theme.palette.secondary.main;

  const getImages = () => {
    setIsLoading(true);
    axios
      .get(`http://localhost:8000/images/get/`)
      .then((res) => {
        setImages(res.data);
        setIsLoading(false);
      })
      .catch((err) => {
        setIsLoading(false);
        console.log(err);
      });
  };

  useEffect(() => {
    getImages();
    console.log(images)
  }, []);

  const downloadImage = (image) => {
    const blob = base64ToBlob(image);
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "my_qr_art.png";
    link.click();
  };

  const deleteImage = (id) => {
    axios
      .delete(`http://localhost:8000/images/delete/${id}`)
      .then(() => {
        getImages();
      })
      .catch((err) => {
        console.log(err);
      });
  };

  return (
    <Grid
      container
      direction="row"
      justifyContent="center"
      alignItems="stretch"
      columns={8}
      spacing={3}
    >
      {/*------ Images ------*/}

      {isLoading ? (
        <Box className="loading-box">
          <CircularProgress color="secondary" />
        </Box>
      ) : (
        images.map((item) => (
          <Grid item md={2}>
            <Card
              elevation={0}
              sx={{
                padding: "1.2rem",
                backgroundColor: primaryColor,
                borderRadius: "5px",
              }}
              color="primary"
            >
              <CardMedia
                key={item._id}
                component="img"
                image={`data:image/png;base64,${item.image_str}`}
                sx={{ borderRadius: "5px" }}
              />
              
              <Stack
          direction="row"
          justifyContent="center"
          alignItems="center"
          spacing={3}
          sx={{mt: '1rem'}}
        >
          <IconButton onClick={()=>downloadImage(item.image_str)}>
            <DownloadTwoToneIcon />
          </IconButton>
          <IconButton>
            <ShareTwoToneIcon />
          </IconButton>
          <IconButton onClick={()=>deleteImage(item._id)}>
            <DeleteForeverTwoToneIcon />
          </IconButton>
        </Stack>
            </Card>
          </Grid>
        ))
      )}
    </Grid>
  );
}

export default MyCodes;
