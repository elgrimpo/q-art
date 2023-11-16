//Libraries imports
import axios from "axios";

// App imports
import { ActionTypes } from "../context/reducers";
import { useImages, useImagesDispatch } from "../context/AppProvider";
import { useUtils } from "./utils";




export const useImageUtils = () => {
  const { userImages, communityImages, userImagesPage, communityImagesPage, user } =
    useImages();
  const dispatch = useImagesDispatch();
  const {openAlert} = useUtils();

  // ---------- Get More Images ---------- //
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
    const page =
      imageType === "userImages" ? userImagesPage : communityImagesPage;
    const images = imageType === "userImages" ? userImages : communityImages;

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
          if (params.page == 1) {
            dispatch({
              type: imagesActionType,
              payload: []
            })
          }
        } else {
          dispatch({
            type: imagesActionType,
            payload: params.page === 1 ? [...res.data] : [...images, ...res.data],
          });
          dispatch({
            type: loadingActionType,
            payload: false,
          });
          dispatch({
            type: pageActionType,
            payload: params.page === 1 ? 1 : page + 1,
          });
        }
      })
      .catch((err) => {
        dispatch({
          type: loadingActionType,
          payload: false,
        });
        dispatch({
          type: pageActionType,
          payload: -1,
        });
        openAlert('error', 'Images could not be loaded')

        console.log(err);
      });
  };

  // ---------- Download Image ---------- //
  const downloadImage = (item) => {
    const link = document.createElement("a");
    link.href = item.image_url;
    link.download = "QR-art.png";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

    // ---------- Delete Image ---------- //
  const deleteImage = (id, index) => {
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
        openAlert('success', 'Image Deleted')
      })
      .catch((err) => {
        openAlert('error', 'Image Could Not Be Deleted')
        console.log(err);
      });
  };

  // ---------- Upscale Image ---------- //
  const upscaleImage = (id, setUpscaling) => {
    // Set the state to indicate that upscaling is in progress
    setUpscaling(true);

    // Make the API request to trigger upscaling
    axios
      .get(`http://localhost:8000/upscale/${id}`, {
        params: {user_id: user._id},
      })
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
        openAlert('success', 'Image Upscaled')
      })
      .catch((error) => {
        console.error("Error upscaling image:", error);
        openAlert('error', 'Image could not be upscaled')
      })
     .finally(() => {
        //Set the state to indicate that upscaling is complete
        setUpscaling(false);
     });
  };

  return {
    getMoreImages,
    downloadImage,
    deleteImage,
    upscaleImage,
  };
};
