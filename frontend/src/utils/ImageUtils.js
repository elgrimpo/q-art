//Libraries imports
import axios from "axios";

// App imports
import { ActionTypes } from "../context/reducers";

export const getMoreImages = (imageType, params, page, images, dispatch) => {
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

export const downloadImage = (item) => {
  const link = document.createElement("a");
  link.href = item.image_url;
  link.download = "QR-art.png";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const deleteImage = (id, index, userImages, dispatch) => {
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

export const upscaleImage = (id, userImages, setUpscaling, dispatch) => {
  // Set the state to indicate that upscaling is in progress
  setUpscaling(true);

  // Make the API request to trigger upscaling
  axios
    .get(`http://localhost:8000/upscale/${id}`)
    .then((response) => {
      // Upscaling is complete, update the image in your UI
      const updatedImage = response.data; // Replace with the actual response format

      // Update the UserImages state
      const updatedImages = userImages.map((img) =>
        img._id === id ? updatedImage : img
      );

      dispatch({
        type: ActionTypes.SET_USER_IMAGES,
        payload: updatedImages,
      });
    })
    .catch((error) => {
      console.error("Error upscaling image:", error);
    })
    .finally(() => {
      // Set the state to indicate that upscaling is complete
      setUpscaling(false);
    });
};