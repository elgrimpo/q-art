// Libraries imports
import { Grid } from "@mui/material";
import axios from "axios";
import { useState, useEffect, useRef } from "react";

// App imports
import { ActionTypes } from "../../context/reducers";
import { useImages, useImagesDispatch } from "../../context/AppProvider";
import ImageCard from "./ImagesCard";
import ImageModal from "./ImageModal";

function ImageGallery(props) {
  const dispatch = useImagesDispatch();
  const {
    userImages,
    loadingUserImages,
    userImagesPage,
    user,
    communityImages,
    loadingCommunityImages,
    communityImagesPage,
  } = useImages();

  const { setTabValue, imageType } = props;

  const page = imageType === "userImages" ? userImagesPage : communityImagesPage;
  const images = imageType === "userImages" ? userImages : communityImages;
  const loading = imageType === "userImages" ? loadingUserImages : loadingCommunityImages;

  const getMoreImages = (imageType, params) => {
    const loadingActionType =
      imageType === "userImages"
        ? ActionTypes.SET_LOADING_USER_IMAGES
        : ActionTypes.SET_LOADING_COMMUNITY_IMAGES;
    const imagesActionType =
      imageType === "userImages"
        ? ActionTypes.SET_USER_IMAGES
        : ActionTypes.SET_COMMUNITY_IMAGES;
    const pageActionType =
      imageType === "userImages"
        ? ActionTypes.SET_USER_IMAGES_PAGE
        : ActionTypes.SET_COMMUNITY_IMAGES_PAGE;

    dispatch({ type: loadingActionType, payload: true });

    axios
      .get(`http://localhost:8000/images/get`, {
        params: params,
      })
      .then((res) => {
        if (res.data.length === 0) {
          dispatch({
            type: loadingActionType,
            payload: false,
          });
          dispatch({
            type: pageActionType,
            payload: -1,
          });
        } else {
          dispatch({
            type: imagesActionType,
            payload: [...images, ...res.data],
          });

          dispatch({
            type: loadingActionType,
            payload: false,
          });
          dispatch({
            type: pageActionType,
            payload: page + 1,
          });
        }
      })
      .catch((err) => {
        dispatch({
          type: loadingActionType,
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

          const params = {
            page: page + 1,
            user_id: imageType === "userImages" ? user._id : null,
            exclude_user_id: imageType === "userImages" ? null : user._id,
            //sort_by: (Optional[str] = "created_at"),
            //sort_order: (Optional[str] = "desc"),
            //images_per_page: (int = 12),
          };

          getMoreImages(imageType, params);
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
  }, [images, loading]);

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
      prevIndex > 0 ? prevIndex - 1 : images.length - 1
    );
  };

  const showNextImage = () => {
    setSelectedImageIndex((prevIndex) =>
      prevIndex < images.length - 1 ? prevIndex + 1 : 0
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
        {images &&
          images.map((item, index) => (
            <ImageCard
              item={item}
              index={index}
              variant="image"
              onClick={() => handleModalOpen(index)}
              setTabValue={setTabValue}
            />
          ))}
      </Grid>

      {/* Trigger for loading more images */}
      {!loading && page >= 0 && (
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
        {loading > 0 &&
          Array.from({ length: 12 }, (_, index) => index).map((_, index) => (
            <ImageCard
              item={_}
              variant="skeleton"
              index={index}
              setTabValue={setTabValue}
            />
          ))}
      </Grid>

      {/*----------------- Modal: Image Details----------------*/}
      {images != [] && (
        <ImageModal
          open={open}
          index={selectedImageIndex}
          handleClose={handleModalClose}
          handlePrevious={showPreviousImage}
          handleNext={showNextImage}
        />
      )}
    </div>
  );
}

export default ImageGallery;
