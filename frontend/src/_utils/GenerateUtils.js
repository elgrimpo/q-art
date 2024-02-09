"use client";
//Libraries imports
import axios from "axios";

// App imports
import { ActionTypes } from "@/_context/reducers";
import { useImagesDispatch } from "@/_context/AppProvider";
import { useUtils } from "./utils";
import { useStore } from "@/store";

export const useGenerateUtils = () => {
  /* ---------------------------- DECLARE VARIABLES --------------------------- */
  const { user } = useStore.getState();
  const dispatch = useImagesDispatch();
  const { openAlert } = useUtils();

  /* -------------------------------------------------------------------------- */
  /*                               GENERATE IMAGE                               */
  /* -------------------------------------------------------------------------- */

  const generateImage = (generateFormValues) => {
    return new Promise((resolve, reject) => {
      // Set state to loading
      dispatch({
        type: ActionTypes.SET_LOADING_GENERATED_IMAGE,
        payload: true,
      });

      /* -------------------------------- API Call -------------------------------- */
      axios
        .get(`http://localhost:8000/api/generate/?user_id=${user._id}`, {
          params: generateFormValues,
          withCredentials: true,
        })
        .then((res) => {
          // Update Generated Image in reducer
          dispatch({
            type: ActionTypes.SET_GENERATED_IMAGE,
            payload: res.data,
          });

          dispatch({
            type: ActionTypes.SET_GENERATE_FORM_VALUES,
            payload: { ...generateFormValues, seed: res.data.seed },
          });

          // Set state to NOT loading
          dispatch({
            type: ActionTypes.SET_LOADING_GENERATED_IMAGE,
            payload: false,
          });

          // Reset My Codes Images and Page
          dispatch({
            type: ActionTypes.SET_USER_IMAGES_PAGE,
            payload: 0,
          });

          dispatch({
            type: ActionTypes.SET_USER_IMAGES,
            payload: [],
          });

          // Open Snackbar
          openAlert("success", "Image Generated");

          resolve(res.data);
        })

        /* ----------------------------- Error Handling ----------------------------- */

        .catch((err) => {
          // Set state to NOT loading
          dispatch({
            type: ActionTypes.SET_LOADING_GENERATED_IMAGE,
            payload: false,
          });

          // Insufficient Resources

          if (
            err.response &&
            err.response.status === 403 &&
            err.response.data.detail === "Insufficient credits"
          ) {
            reject({ success: false, detail: "InsufficientCredits" });
          } else {
            openAlert(
              "error",
              `Image Generation Failed: ${err.response.data.detail}`
            );
            console.error(err);
            reject(err);
          }
        });
    });
  };

  /* ---------------------------- RETURN FUNCTIONS ---------------------------- */
  return {
    generateImage,
  };
};
