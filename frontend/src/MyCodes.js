import { CardMedia, CircularProgress, Box, Grid } from "@mui/material";
import "./App.css";
import axios from "axios";
import { useState, useEffect } from "react";

function MyCodes() {
  const [images, setImages] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

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
  }, []);

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
            <CardMedia
              key={item._id}
              component="img"
              image={`data:image/png;base64,${item.image_str}`}
            />
          </Grid>
        ))
      )}
    </Grid>
  );
}

export default MyCodes;
