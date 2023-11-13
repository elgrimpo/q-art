//Libraries imports
import axios from "axios";

// App imports
import { ActionTypes } from "../context/reducers";
import { useImages, useImagesDispatch } from "../context/AppProvider";

export const useGenerateUtils = () => {
  const { user, generateFormValues } =
    useImages();
  const dispatch = useImagesDispatch();

  const generateImage = async (generateFormValues) => {
    dispatch({
      type: ActionTypes.SET_LOADING_GENERATED_IMAGE,
      payload: true,
    });
    axios
      .get(`http://localhost:8000/generate/?user_id=${user._id}`, {
        params: generateFormValues,
        withCredentials: true,
      })
      .then((res) => {
        // Update Generated Image state
        dispatch({
          type: ActionTypes.SET_GENERATED_IMAGE,
          payload: res.data,
        });
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
      })
      .catch((err) => {
        dispatch({
          type: ActionTypes.SET_LOADING_GENERATED_IMAGE,
          payload: false,
        });
        console.log(err);
      });
  };

  const copyGenerateFormValues = (item) => {
    const copyValues = {
      website: item.content,
      prompt: item.prompt,
      image_quality: item.image_quality,
      qr_weight: item.qr_weight,
      negative_prompt: item.negative_prompt,
      seed: item.seed,
      sd_model: item.sd_model,
    };
    dispatch({
      type: ActionTypes.SET_GENERATE_FORM_VALUES,
      payload: copyValues,
    });
    dispatch({
      type: ActionTypes.SET_GENERATED_IMAGE,
      payload: item,
    });
  };
  
  const selectSdModel = (sd_model) => {
    dispatch({
      type: ActionTypes.SET_GENERATE_FORM_VALUES,
      payload: {
        ...generateFormValues,
        sd_model: sd_model,
      },
    });
  };

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

  return {
    generateImage, 
    copyGenerateFormValues,
    selectSdModel,
    handleInputChange

  };
};
