//Libraries imports
import axios from "axios";
import base64ToBlob from "b64-to-blob";
import { useTheme } from "@mui/material/styles";
import {
  Card,
  CardMedia,
  Grid,
  Typography,
  Paper,
  Backdrop,
  Stack,
  IconButton,
  Skeleton,
} from "@mui/material";
import DownloadTwoToneIcon from "@mui/icons-material/DownloadTwoTone";
import DeleteForeverTwoToneIcon from "@mui/icons-material/DeleteForeverTwoTone";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";

// App imports
import { ActionTypes } from "../../context/reducers";
import { useImages, useImagesDispatch } from "../../context/AppProvider";


function ImageCard(props) {
  const { variant, item, index, onClick } = props;
  const { userImages } = useImages();

  const dispatch = useImagesDispatch();

  const theme = useTheme();
  const primaryColor = theme.palette.primary.main;

  // -------- Actions ----------
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
        if (index > -1) {
          // Remove image from array
          const updatedImages = [
            ...userImages.slice(0, index),
            ...userImages.slice(index + 1),
          ];

          // Update UserImages state
          dispatch({
            type: ActionTypes.SET_USER_IMAGES,
            payload: updatedImages,
          });
        }
      })
      .catch((err) => {
        console.log(err);
      });
  };

  const handleCopy = (item) => {
    const copyValues = {
      website: item.content,
      prompt: item.prompt,
      image_quality: item.image_quality,
      qr_weight: item.qr_weight,
      negative_prompt: item.negative_prompt,
      seed: item.seed,
    };
    dispatch({
      type: ActionTypes.SET_GENERATE_FORM_VALUES,
      payload: copyValues,
    });
    dispatch({
      type: ActionTypes.SET_GENERATED_IMAGE,
      payload: item,
    });
  };

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
        {variant == "skeleton" ? (
          <Skeleton
            variant="rounded"
            width="100%"
            height="0px"
            animation="wave"
            sx={{
              aspectRatio: "1/1",
              paddingTop: "100%", // Set the height to be the same as the width
            }}
            key={index + "_1"}
          />
        ) : (
          <CardMedia
            component="img"
            image={`data:image/png;base64,${item?.image_str}`}
            sx={{ borderRadius: "5px" }}
            onClick={onClick}
            key={index}
          />
        )}

        {variant == "skeleton" ? (
          <Stack
            direction="row"
            justifyContent="center"
            alignItems="center"
            spacing={3}
            sx={{ mt: "1rem" }}
            key={index + "_2"}
          >
            <Skeleton
              variant="circular"
              width={30}
              height={30}
              key={index + "_3"}
            />
            <Skeleton
              variant="circular"
              width={30}
              height={30}
              key={index + "_4"}
            />
            <Skeleton
              variant="circular"
              width={30}
              height={30}
              key={index + "_5"}
            />
          </Stack>
        ) : (
          <Stack
            direction="row"
            justifyContent="center"
            alignItems="center"
            spacing={3}
            sx={{ mt: "1rem" }}
            key={index + "_6"}
          >
            <IconButton
              onClick={() => downloadImage(item.image_str)}
              key={index + "_1"}
            >
              <DownloadTwoToneIcon key={index} />
            </IconButton>
            <IconButton key={index + "_2"} onClick={() => handleCopy(item)}>
              <ContentCopyIcon index={index} />
            </IconButton>
            <IconButton
              onClick={() => deleteImage(item._id)}
              key={index + "_3"}
            >
              <DeleteForeverTwoToneIcon key={index} />
            </IconButton>
          </Stack>
        )}
      </Card>
    </Grid>
  );
}

export default ImageCard;
