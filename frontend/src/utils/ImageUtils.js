//Libraries imports
import axios from "axios";

// App imports
import { ActionTypes } from "../context/reducers";
import { useImages, useImagesDispatch } from "../context/AppProvider";
import { useUtils } from "./utils";

export const useImageUtils = () => {
  /* ---------------------------- DECLARE VARIABLES --------------------------- */

  const {
    userImages,
    communityImages,
    userImagesPage,
    communityImagesPage,
    user,
  } = useImages();
  const dispatch = useImagesDispatch();
  const { openAlert } = useUtils();

  /* -------------------------------------------------------------------------- */
  /*                               GET MORE IMAGES                              */
  /* -------------------------------------------------------------------------- */

  const getMoreImages = (imageType, params) => {
    /* ----------------- Check if userImages vs community images ---------------- */
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
    const page =
      imageType === "userImages" ? userImagesPage : communityImagesPage;
    const images = imageType === "userImages" ? userImages : communityImages;

    /* -------------------------------- API Call -------------------------------- */

    // Set state to "loading images"
    dispatch({ type: loadingActionType, payload: true });

    // API Call
    axios
      .get(`${process.env.REACT_APP_BACKEND_URL}/images/get`, {
        params: params,
      })
      .then((res) => {
        /* ------------------------- No images are returned ------------------------- */
        if (res.data.length === 0) {
          // Set state to NOT loading
          dispatch({
            type: loadingActionType,
            payload: false,
          });

          // Set page to -1
          // (will prevent from GetMoreImages to be retriggered)
          dispatch({
            type: pageActionType,
            payload: -1,
          });

          // No images at the initial Query:
          if (params.page == 1) {
            // Set userImages / communityImage to empty
            dispatch({
              type: imagesActionType,
              payload: [],
            });
          }
        } else {
          /* --------------------------- Images are returned -------------------------- */

          dispatch({
            type: imagesActionType,
            payload:
              params.page === 1 ? [...res.data] : [...images, ...res.data], // Remove loaded data for initial (re)Query
          });
          dispatch({
            type: loadingActionType,
            payload: false,
          });
          dispatch({
            type: pageActionType,
            payload: params.page === 1 ? 1 : page + 1, // Handle initial query
          });
        }
      })

      /* ----------------------------- Error handling ----------------------------- */
      .catch((err) => {
        // Set state to NOT loading
        dispatch({
          type: loadingActionType,
          payload: false,
        });

        // Set page to -1
        // (will prevent from GetMoreImages to be retriggered)
        dispatch({
          type: pageActionType,
          payload: -1,
        });

        // Open Snackbar
        openAlert("error", "Images could not be loaded");
        console.log(err);
      });
  };

  /* -------------------------------------------------------------------------- */
  /*                               DOWNLOAD IMAGE                               */
  /* -------------------------------------------------------------------------- */

  const downloadImage = (item) => {
    const link = document.createElement("a");
    link.href = item.image_url;
    link.download = "QR-art.png";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  /* -------------------------------------------------------------------------- */
  /*                                DELETE IMAGE                                */
  /* -------------------------------------------------------------------------- */

  const deleteImage = (id, index) => {
    axios
      .delete(`${process.env.REACT_APP_BACKEND_URL}/images/delete/${id}`)
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

        // Open Snackbar
        openAlert("success", "Image Deleted");
      })

      /* ----------------------------- Error handling ----------------------------- */
      .catch((err) => {
        openAlert("error", "Image Could Not Be Deleted");
        console.log(err);
      });
  };

  /* -------------------------------------------------------------------------- */
  /*                                UPSCALE IMAGE                               */
  /* -------------------------------------------------------------------------- */

  const upscaleImage = (id, setUpscaling) => {
    // Set the state loading
    setUpscaling(true);

    /* -------------------------------- API Call -------------------------------- */
    axios
      .get(`${process.env.REACT_APP_BACKEND_URL}/upscale/${id}`, {
        params: { user_id: user._id },
        withCredentials: true,
      })
      .then((response) => {
        // Find updated image in userImages and replace with new image
        const updatedImage = response.data;
        const updatedImages = userImages.map((img) =>
          img._id === id ? updatedImage : img
        );

        // Update userImages in reducer
        dispatch({
          type: ActionTypes.SET_USER_IMAGES,
          payload: updatedImages,
        });

        // Open Snackbar
        openAlert("success", "Image Upscaled");
      })

      /* ----------------------------- Error Handling ----------------------------- */
      .catch((error) => {
        console.error("Error upscaling image:", error);

        // Open Snackbar
        openAlert("error", "Image could not be upscaled");
      })
      .finally(() => {
        // Set the state to NOT loading
        setUpscaling(false);
      });
  };

  /* ---------------------------- FUNCTION RETURNS ---------------------------- */
  return {
    getMoreImages,
    downloadImage,
    deleteImage,
    upscaleImage,
  };
};
