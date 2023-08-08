import {
  Card,
  CardMedia,
  CircularProgress,
  Box,
  Grid,
  Typography,
  Paper,
  Backdrop,
  Stack,
  IconButton,
  Skeleton,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import ShareTwoToneIcon from "@mui/icons-material/ShareTwoTone";
import "./App.css";
import axios from "axios";
import { useState, useEffect, useRef } from "react";
import base64ToBlob from "b64-to-blob";
import DownloadTwoToneIcon from "@mui/icons-material/DownloadTwoTone";
import DeleteForeverTwoToneIcon from "@mui/icons-material/DeleteForeverTwoTone";
import ChevronRightTwoToneIcon from "@mui/icons-material/KeyboardArrowRightTwoTone";
import ChevronLeftTwoToneIcon from "@mui/icons-material/ChevronLeftTwoTone";
import dayjs from "dayjs";
import { ActionTypes } from "./reducers";
import {
  useImages, useImagesDispatch
} from "./AppProvider";

function MyCodes() {
  const dispatch = useImagesDispatch();
  const { userImages, loadingUserImages, userImagesPage } = useImages();

  const theme = useTheme();
  const primaryColor = theme.palette.primary.main;
  const secondaryColor = theme.palette.secondary.main;

  // ----- Get Images ------ //
  const getMoreImages = () => {
    dispatch({ type: ActionTypes.SET_LOADING_USER_IMAGES, payload: true });
    axios
      .get(`http://localhost:8000/images/get/?page=${userImagesPage + 1}`, {
        params: {
          allowDiskUse: true, // Add allowDiskUse option here
        },
      })
      .then((res) => {
        if (res.data.length === 0) {
          dispatch({
            type: ActionTypes.SET_LOADING_USER_IMAGES,
            payload: false,
          });
          dispatch({ type: ActionTypes.SET_USER_IMAGES_PAGE, payload: -1 });
        } else {
          dispatch({
            type: ActionTypes.SET_USER_IMAGES,
            payload: [...userImages, ...res.data],
          });
          dispatch({
            type: ActionTypes.SET_LOADING_USER_IMAGES,
            payload: false,
          });
          dispatch({
            type: ActionTypes.SET_USER_IMAGES_PAGE,
            payload: userImagesPage + 1,
          });

        }
      })
      .catch((err) => {
        dispatch({
          type: ActionTypes.SET_LOADING_USER_IMAGES,
          payload: false,
        });
        console.log(err);
      });
  };
  // --------- Infinite scroll -----------
  const loadMoreRef = useRef(null);

  

  useEffect(() => {
    const options = {
      root: null,
      rootMargin: "5px",
      threshold: 1, // Adjust this threshold value as needed
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          getMoreImages();
        }
      });
    }, options);

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => {
      if (loadMoreRef.current) {
        observer.unobserve(loadMoreRef.current);
      }
    };
  }, [loadingUserImages, userImages]);

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
        const index = userImages.findIndex(image => image._id === id);

  if(index > -1) {
    // Remove image from array
    const updatedImages = [
      ...userImages.slice(0, index), 
      ...userImages.slice(index + 1)
    ];

    // Dispatch SET_USER_IMAGES action
    dispatch({
      type: ActionTypes.SET_USER_IMAGES,
      payload: updatedImages
    });
  }
      })
      .catch((err) => {
        console.log(err);
      });
  };

  // --------- Modal ----------
  const [selectedImageIndex, setSelectedImageIndex] = useState(null);
  const [open, setOpen] = useState(false);

  const handleModalClose = (event) => {
    if (event.target === event.currentTarget) {
      setOpen(false);
      setSelectedImageIndex(null);
    }
  };
  const handleModalOpen = (imageIndex) => {
    setSelectedImageIndex(imageIndex);
    setOpen(true);
  };

  const showPreviousImage = () => {
    setSelectedImageIndex((prevIndex) =>
      prevIndex > 0 ? prevIndex - 1 : userImages.length - 1
    );
  };

  const showNextImage = () => {
    setSelectedImageIndex((prevIndex) =>
      prevIndex < userImages.length - 1 ? prevIndex + 1 : 0
    );
  };

  return (
    <div>
      <Grid
        container
        direction="row"
        justifyContent="center"
        alignItems="stretch"
        columns={8}
        spacing={3}
        sx={{ mb: "1.5rem" }}
      >
        {/*------ Images List ------*/}

        <>
          {userImages &&
            userImages.map((item, index) => (
              <Grid item md={2} key={index}>
                {" "}
                {/* Add key prop */}
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
                  <CardMedia
                    component="img"
                    image={`data:image/png;base64,${item?.image_str}`}
                    sx={{ borderRadius: "5px" }}
                    onClick={() => handleModalOpen(index)}
                  />

                  <Stack
                    direction="row"
                    justifyContent="center"
                    alignItems="center"
                    spacing={3}
                    sx={{ mt: "1rem" }}
                  >
                    <IconButton onClick={() => downloadImage(item.image_str)}>
                      <DownloadTwoToneIcon />
                    </IconButton>
                    <IconButton>
                      <ShareTwoToneIcon />
                    </IconButton>
                    <IconButton onClick={() => deleteImage(item._id)}>
                      <DeleteForeverTwoToneIcon />
                    </IconButton>
                  </Stack>
                </Card>
              </Grid>
            ))}
        </>
      </Grid>

      {/* Trigger for loading more images */}
      {!loadingUserImages && userImagesPage >= 0 && (
        <div ref={loadMoreRef}></div>
      )}
      <Grid
        container
        direction="row"
        justifyContent="center"
        alignItems="stretch"
        columns={8}
        spacing={3}
      >
        <>
          {loadingUserImages > 0 &&
            Array.from({ length: 12 }, (_, index) => index).map((_, index) => (
              <Grid item md={2} key={`skeleton-${index}`}>
                <Card
                  elevation={0}
                  sx={{
                    padding: "1.2rem",
                    backgroundColor: primaryColor,
                    borderRadius: "5px",
                  }}
                  color="primary"
                >
                  <Skeleton
                    variant="rounded"
                    width="100%"
                    height="0px"
                    animation="wave"
                    sx={{
                      aspectRatio: "1/1",
                      paddingTop: "100%", // Set the height to be the same as the width
                    }}
                  />

                  <Stack
                    direction="row"
                    justifyContent="center"
                    alignItems="center"
                    spacing={3}
                    sx={{ mt: "1rem" }}
                  >
                    <Skeleton variant="circular" width={30} height={30} />

                    <Skeleton variant="circular" width={30} height={30} />

                    <Skeleton variant="circular" width={30} height={30} />
                  </Stack>
                </Card>
              </Grid>
            ))}
        </>
      </Grid>

      {/*----------------- Modal: Image Details----------------*/}
      {userImages &&
      <Backdrop
        sx={{ color: "#fff", zIndex: (theme) => theme.zIndex.drawer + 1 }}
        open={open}
        onClick={handleModalClose}
      >
        <IconButton
          sx={{
            borderRadius: "20px",
            backgroundColor: "#70E195",
            margin: "1rem",
          }}
          onClick={showPreviousImage}
        >
          <ChevronLeftTwoToneIcon />
        </IconButton>
        <Paper
          elevation={10}
          sx={{
            width: "80%",
            height: "80%",
            backgroundColor: "#ffffff",
            display: "flex",
            flexDirection: "row",
            borderRadius: "16px",
          }}
        >
          <div
            style={{
              height: "100%",
              aspectRatio: "1/1",
              backgroundColor: "#70E195",
              display: "flex",
              borderRadius: "16px 0px 0px 16px",
            }}
          >
            <img
              src={`data:image/png;base64,${userImages[selectedImageIndex]?.image_str}`}
              style={{
                height: "90%",
                objectFit: "contain",
                margin: "auto",
                borderRadius: "16px",
              }}
            />
          </div>
          <Stack
            sx={{ height: "100%", padding: "2rem" }}
            justifyContent="center"
            alignItems="flex-start"
          >
            <Typography variant="subtitle2">Date created</Typography>
            <Typography variant="body" sx={{ mb: "1rem" }}>
              {userImages[selectedImageIndex]?.created_at != "-"
                ? dayjs(userImages[selectedImageIndex]?.created_at).format(
                    "MMMM D, YYYY"
                  )
                : "-"}
            </Typography>
            <Typography variant="subtitle2">QR Content</Typography>
            <Typography variant="body" sx={{ mb: "1rem" }}>
              {userImages[selectedImageIndex]?.content}
            </Typography>
            <Typography variant="subtitle2">Prompt</Typography>
            <Typography variant="body" sx={{ mb: "1rem" }}>
              {userImages[selectedImageIndex]?.prompt}
            </Typography>
            <Typography variant="subtitle2">Seed</Typography>
            <Typography variant="body" sx={{ mb: "1rem" }}>
              {userImages[selectedImageIndex]?.seed}
            </Typography>
          </Stack>
        </Paper>
        <IconButton
          sx={{
            borderRadius: "20px",
            backgroundColor: "#70E195",
            margin: "1rem",
          }}
          onClick={showNextImage}
        >
          <ChevronRightTwoToneIcon />
        </IconButton>
      </Backdrop>}
    </div>
  );
}

export default MyCodes;
