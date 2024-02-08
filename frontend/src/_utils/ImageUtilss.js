//Libraries imports
import axios from "axios";

// App imports
import { ActionTypes } from "@/_context/reducers";
import { useImages, useImagesDispatch } from "@/_context/AppProvider";
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
  /*                                DELETE IMAGE                                */
  /* -------------------------------------------------------------------------- */

  const deleteImage = (id, index) => {
    axios
      .delete(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/images/delete/${id}`)
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
  /*                               DOWNLOAD IMAGE                               */
  /* -------------------------------------------------------------------------- */
  const downloadImage = (item) => {
    const link = document.createElement("a");
    link.href = item.image_url;
    link.download = "QR-art.png";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => {
      openAlert("success", "Image downloaded");
    }, 1000);
  };

  /* -------------------------------------------------------------------------- */
  /*                            UPSCALE AND DOWNLOAD                            */
  /* -------------------------------------------------------------------------- */

  const upscaleDownload = (image, resolution, upscaling, setUpscaling) => {
    openAlert("info", "Image is being prepared for download");

    setUpscaling([...upscaling, image._id]);
    /* -------------------------------- API Call -------------------------------- */
    axios
      .get(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/upscale/${image._id}`, {
        params: { user_id: user._id, resolution: resolution },
        withCredentials: true,
      })
      .then((response) => {
        // Download upscaled image
        const updatedImage = response.data;
        downloadImage(updatedImage);

        // Find updated image in userImages and replace with new image
        const updatedImages = userImages.map((img) =>
          img._id === image._id ? updatedImage : img
        );

        // Update userImages in reducer
        dispatch({
          type: ActionTypes.SET_USER_IMAGES,
          payload: updatedImages,
        });
      })

      /* ----------------------------- Error Handling ----------------------------- */
      .catch((error) => {
        console.error("Error downloading image:", error);

        // Open Snackbar
        openAlert("error", "Image could not be downloaded");
      })
      .finally(() => {
        // Set the state to NOT loading
        setUpscaling(upscaling.filter((imageId) => imageId !== image._id));
      });
  };

  /* -------------------------------------------------------------------------- */
  /*                                 LIKE IMAGE                                 */
  /* -------------------------------------------------------------------------- */

  const likeImage = async (image, userId, imageType) => {
    // Check if userImages vs community images
    const imagesActionType =
      imageType === "userImages"
        ? ActionTypes.SET_USER_IMAGES
        : ActionTypes.SET_COMMUNITY_IMAGES;
    const images = imageType === "userImages" ? userImages : communityImages;

    /* -------------------------------- API CALL -------------------------------- */
    axios.put(
      `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/images/like/${image._id}`,
      null,
      {
        params: { user_id: userId },
      }
    );

    /* -------------------------- UPDATE LIKES ARRAY -------------------------- */

    // Check if user_id appears in image's "Likes" array
    const isLiked = image.likes?.includes(userId) ? true : false;

    try {
      let updatedLikes = [...(image.likes || [])];

      if (isLiked) {
        // Remove userId from likes
        updatedLikes = updatedLikes.filter((id) => id !== userId);
      } else {
        // Add userId to likes
        updatedLikes.push(userId);
      }

      /* ------------------------- UPDATE IMAGE IN REDUCER ------------------------ */
      const updatedImage = { ...image, likes: updatedLikes };

      // Find the index of the image in the current array
      const index = images.findIndex((img) => img._id === image._id);

      // Create a new array with the updated image at the same position
      const updatedImages = [...images];
      updatedImages[index] = updatedImage;

      // Update reducer
      dispatch({
        type: imagesActionType,
        payload: updatedImages,
      });

      /* ----------------------------- ERROR HANDLING ----------------------------- */
    } catch (error) {
      console.error("Error toggling like:", error);
    }
  };

  /* ---------------------------- FUNCTION RETURNS ---------------------------- */
  return {
    downloadImage,
    deleteImage,
    upscaleDownload,
    likeImage,
  };
};
