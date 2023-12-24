//Libraries imports
import axios from "axios";

// App imports
import { ActionTypes } from "../context/reducers";
import { useImages, useImagesDispatch } from "../context/AppProvider";
import { useUtils } from "./utils";

export const useGenerateUtils = () => {
  /* ---------------------------- DECLARE VARIABLES --------------------------- */
  const { user, generateFormValues } = useImages();
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
        .get(
          `${process.env.REACT_APP_BACKEND_URL}/api/generate/?user_id=${user._id}`,
          {
            params: generateFormValues,
            withCredentials: true,
          }
        )
        .then((res) => {
          // Update Generated Image in reducer
          dispatch({
            type: ActionTypes.SET_GENERATED_IMAGE,
            payload: res.data,
          });

          dispatch({
            type: ActionTypes.SET_GENERATE_FORM_VALUES,
            payload: {... generateFormValues,
            seed: res.data.seed},
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
  /* -------------------------------------------------------------------------- */
  /*                              COPY FORM VALUES                              */
  /* -------------------------------------------------------------------------- */

  const copyGenerateFormValues = (item) => {
    // Declare form values
    const copyValues = {
      website: item.content,
      prompt: item.prompt,
      image_quality: item.image_quality,
      qr_weight: item.qr_weight,
      negative_prompt: item.negative_prompt,
      seed: item.seed,
      style_id: item.id,
      style_prompt: item.style_prompt,
      style_title: item.style_title,
      sd_model: item.sd_model,
    };
    // Update Form values in reducer
    dispatch({
      type: ActionTypes.SET_GENERATE_FORM_VALUES,
      payload: copyValues,
    });

    // Show Images to be copied in Generate Page
    dispatch({
      type: ActionTypes.SET_GENERATED_IMAGE,
      payload: item,
    });
  };

  /* -------------------------------------------------------------------------- */
  /*                                GET SD MODELS                               */
  /* -------------------------------------------------------------------------- */

  const getSdModels = async () => {
    // Set State to Loading
    dispatch({
      type: ActionTypes.SET_LOADING_SD_MODELS,
      payload: true,
    });

    /* -------------------------------- API Call -------------------------------- */
    await axios
      .get(`${process.env.REACT_APP_BACKEND_URL}/api/models/get`)
      .then((res) => {
        // Update sd_models in reducer
        dispatch({
          type: ActionTypes.SET_SD_MODELS,
          payload: res.data,
        });

        // Set state to NOT loading
        dispatch({
          type: ActionTypes.SET_LOADING_SD_MODELS,
          payload: false,
        });
      })

      /* ----------------------------- Error handling ----------------------------- */
      .catch((err) => {
        // Set state to not loading
        dispatch({
          type: ActionTypes.SET_LOADING_SD_MODELS,
          payload: false,
        });

        // Open Snackbar
        openAlert("error", "Stable Diffusion Models could not be loaded");

        console.log(err);
      });
  };

  /* -------------------------------------------------------------------------- */
  /*                               SELECT SD MODEL                              */
  /* -------------------------------------------------------------------------- */

  const selectSdModel = (sd_model) => {
    // Update generateFormValues.sd_model with new selection
    dispatch({
      type: ActionTypes.SET_GENERATE_FORM_VALUES,
      payload: {
        ...generateFormValues,
        sd_model: sd_model,
      },
    });
  };

  /* -------------------------------------------------------------------------- */
  /*                          HANDLE FORM INPUT CHANGE                          */
  /* -------------------------------------------------------------------------- */

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    dispatch({
      type: ActionTypes.SET_GENERATE_FORM_VALUES,
      payload: {
        ...generateFormValues,
        [name]: value,
      },
    });
  };

  /* ---------------------------- RETURN FUNCTIONS ---------------------------- */
  return {
    generateImage,
    copyGenerateFormValues,
    selectSdModel,
    handleInputChange,
    getSdModels,
  };
};
