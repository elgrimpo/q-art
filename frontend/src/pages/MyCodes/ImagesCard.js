//Libraries imports
import axios from "axios";
import { useTheme } from "@mui/material/styles";
import React, { useState } from "react";
import {
  Card,
  CardMedia,
  Grid,
  Stack,
  IconButton,
  Tooltip,
} from "@mui/material";
import DownloadTwoToneIcon from "@mui/icons-material/DownloadTwoTone";
import DeleteForeverTwoToneIcon from "@mui/icons-material/DeleteForeverTwoTone";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import DiamondTwoToneIcon from "@mui/icons-material/DiamondTwoTone";

// App imports
import { ActionTypes } from "../../context/reducers";
import { useImages, useImagesDispatch } from "../../context/AppProvider";
import SkeletonCard from "./SkeletonCard.js";
import {downloadImage, deleteImage, upscaleImage} from "../../utils/ImageUtils.js";


function ImageCard(props) {
  const { variant, item, index, onClick, setTabValue } = props;
  const { userImages } = useImages();

  const dispatch = useImagesDispatch();

  const theme = useTheme();
  const primaryColor = theme.palette.primary.main;

  // -------- Actions ----------

  const handleCopy = (item) => {
    const copyValues = {
      website: item.content,
      prompt: item.prompt,
      image_quality: item.image_quality,
      qr_weight: item.qr_weight,
      negative_prompt: item.negative_prompt,
      seed: item.seed,
      sd_model: item.sd_model,
    };
    dispatch({
      type: ActionTypes.SET_GENERATE_FORM_VALUES,
      payload: copyValues,
    });
    dispatch({
      type: ActionTypes.SET_GENERATED_IMAGE,
      payload: item,
    });
    setTabValue("1");
  };

  // Upscaling
  const [upscaling, setUpscaling] = useState(false);

  // const upscaleImage = (id) => {
  //   // Set the state to indicate that upscaling is in progress
  //   setUpscaling(true);

  //   // Make the API request to trigger upscaling
  //   axios
  //     .get(`http://localhost:8000/upscale/${id}`)
  //     .then((response) => {
  //       // Upscaling is complete, update the image in your UI
  //       const updatedImage = response.data; // Replace with the actual response format

  //       // Update the UserImages state
  //       const updatedImages = userImages.map((img) =>
  //         img._id === id ? updatedImage : img
  //       );

  //       dispatch({
  //         type: ActionTypes.SET_USER_IMAGES,
  //         payload: updatedImages,
  //       });
  //     })
  //     .catch((error) => {
  //       console.error("Error upscaling image:", error);
  //     })
  //     .finally(() => {
  //       // Set the state to indicate that upscaling is complete
  //       setUpscaling(false);
  //     });
  // };

  return (
    <Grid item md={2} key={index}>
      {" "}
      <Card
        elevation={0}
        key={index}
        sx={{
          padding: "1.2rem",
          backgroundColor: primaryColor,
          borderRadius: "5px",
        }}
        color="primary"
      >
        {variant == "skeleton" || upscaling ? (
          <SkeletonCard index={index} />
        ) : (
          <div>
            <CardMedia
              component="img"
              image={item?.image_url}
              sx={{ borderRadius: "5px" }}
              onClick={onClick}
              key={index}
            />

            <Stack
              direction="row"
              justifyContent="center"
              alignItems="center"
              spacing={3}
              sx={{ mt: "1rem" }}
              key={index + "_6"}
            >
              <Tooltip title="Download image">
                <IconButton
                  onClick={() => downloadImage(item)}
                  key={index + "_1"}
                >
                  <DownloadTwoToneIcon key={index} />
                </IconButton>
              </Tooltip>

              <Tooltip title="Copy data to generate similar image">
                <IconButton key={index + "_2"} onClick={() => handleCopy(item)}>
                  <ContentCopyIcon index={index} />
                </IconButton>
              </Tooltip>

              <Tooltip title="Delete image">
                <IconButton
                  onClick={() => deleteImage(item._id, index, userImages, dispatch)}
                  key={index + "_3"}
                >
                  <DeleteForeverTwoToneIcon key={index} />
                </IconButton>
              </Tooltip>

              {item.width == 512 && (
                <Tooltip title="Upscale resolution to 1024 x 1024">
                  <IconButton
                    onClick={() => upscaleImage(item._id, userImages, setUpscaling, dispatch)}
                    key={index + "_4"}
                  >
                    <DiamondTwoToneIcon key={index} />
                  </IconButton>
                </Tooltip>
              )}
            </Stack>
          </div>
        )}
      </Card>
    </Grid>
  );
}

export default ImageCard;
