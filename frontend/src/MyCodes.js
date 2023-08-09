import {
  Grid,
  Paper,
  Backdrop,
  IconButton,
  List,
  ListItemText,
} from "@mui/material";
import "./App.css";
import axios from "axios";
import { useState, useEffect, useRef } from "react";
import ChevronRightTwoToneIcon from "@mui/icons-material/KeyboardArrowRightTwoTone";
import ChevronLeftTwoToneIcon from "@mui/icons-material/ChevronLeftTwoTone";
import { ActionTypes } from "./reducers";
import { useImages, useImagesDispatch } from "./AppProvider";
import ImageCard from "./ImagesCard";

function MyCodes() {
  const dispatch = useImagesDispatch();
  const { userImages, loadingUserImages, userImagesPage } = useImages();

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
      {/*------ Images List ------*/}
      <Grid
        container
        direction="row"
        justifyContent="center"
        alignItems="stretch"
        columns={8}
        spacing={3}
        sx={{ mb: "1.5rem" }}
      >
        {userImages &&
          userImages.map((item, index) => (
            <ImageCard
              item={item}
              index={index}
              variant="image"
              onClick={() => handleModalOpen(index)}
            />
          ))}
      </Grid>

      {/* Trigger for loading more images */}
      {!loadingUserImages && userImagesPage >= 0 && (
        <div ref={loadMoreRef}></div>
      )}

      {/*------ Placeholder Cards ------*/}
      <Grid
        container
        direction="row"
        justifyContent="center"
        alignItems="stretch"
        columns={8}
        spacing={3}
      >
        {loadingUserImages > 0 &&
          Array.from({ length: 12 }, (_, index) => index).map((_, index) => (
            <ImageCard item={_} variant="skeleton" index={index} />
          ))}
      </Grid>

      {/*----------------- Modal: Image Details----------------*/}
      {userImages && (
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
            <List sx={{ height: "100%", padding: "2rem" }}>
              <ListItemText
                primary="Date created"
                secondary={userImages[selectedImageIndex]?.created_at}
              />
              <ListItemText
                primary="QR Content"
                secondary={userImages[selectedImageIndex]?.content}
              />
              <ListItemText
                primary="Prompt"
                secondary={userImages[selectedImageIndex]?.prompt}
              />
              <ListItemText
                primary="Seed"
                secondary={userImages[selectedImageIndex]?.seed}
              />
            </List>
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
        </Backdrop>
      )}
    </div>
  );
}

export default MyCodes;
