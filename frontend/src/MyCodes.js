import {
  Grid,
} from "@mui/material";
import "./App.css";
import axios from "axios";
import { useState, useEffect, useRef } from "react";
import { ActionTypes } from "./reducers";
import { useImages, useImagesDispatch } from "./AppProvider";
import ImageCard from "./ImagesCard";
import ImageModal from "./ImageModal";

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
          dispatch({ 
            type: ActionTypes.SET_USER_IMAGES_PAGE, 
            payload: -1 });
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
      {userImages != [] && 
        <ImageModal
          open={open}
          index={selectedImageIndex}
          handleClose={handleModalClose}
          handlePrevious={showPreviousImage}
          handleNext={showNextImage}
        />
      }
    </div>
  );
}

export default MyCodes;
