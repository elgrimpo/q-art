import { placeholder_image_str } from "../assets/placeholder_image";

export const ActionTypes = {
  SET_USER: "SET_USER",
  SET_USER_IMAGES: "SET_USER_IMAGES",
  SET_LOADING_USER_IMAGES: "SET_LOADING_USER_IMAGES",
  SET_USER_IMAGES_PAGE: "SET_USER_IMAGES_PAGE",
  SET_GENERATED_IMAGE: "SET_GENERATED_IMAGE",
  SET_LOADING_GENERATED_IMAGE: "SET_LOADING_GENERATED_IMAGE",
  SET_GENERATE_FORM_VALUES: "SET_GENERATE_FORM_VALUES",
  SET_LOADING_SD_MODELS: "SET_LOADING_SD_MODELS",
  SET_SD_MODELS: "SET_SD_MODELS"
};

export const initialState = {
  // User
  user: {},
  // My Codes
  userImages: [],
  loadingUserImages: false,
  userImagesPage: 0,
  //Generate
  generatedImage: {
    created_at: "-",
    content: "-",
    prompt: "-",
    image_url: "https://qrartimages.s3.us-west-1.amazonaws.com/sampleimg.png",
    seed: "-",
  },
  loadingGeneratedImage: false,
  generateFormValues: {
    website: "",
    prompt: "",
    image_quality: "medium",
    qr_weight: 0.0,
    negative_prompt: "",
    seed: -1,
    sd_model: "dreamshaper_6BakedVae_54299.safetensors"
  },
  // Models
  loadingSdModels: false,
  sd_models: [],
};

export const imagesReducer = (state, action) => {
  switch (action.type) {

    // User
    case ActionTypes.SET_LOGGED_IN:
      return { ...state, isLoggedIn: action.payload };
    case ActionTypes.SET_USER:
      return { ...state, user: action.payload };

    // My Codes Actions
    case ActionTypes.SET_USER_IMAGES:
      return { ...state, userImages: action.payload };
    case ActionTypes.SET_LOADING_USER_IMAGES:
      return { ...state, loadingUserImages: action.payload };
    case ActionTypes.SET_USER_IMAGES_PAGE:
      return { ...state, userImagesPage: action.payload };

    // Generate Image Actions
    case ActionTypes.SET_GENERATED_IMAGE:
      return { ...state, generatedImage: action.payload };
    case ActionTypes.SET_LOADING_GENERATED_IMAGE:
      return { ...state, loadingGeneratedImage: action.payload };
    case ActionTypes.SET_GENERATE_FORM_VALUES:
      return { ...state, generateFormValues: action.payload };

      // Models Actions
    case ActionTypes.SET_LOADING_SD_MODELS:
      return {...state, loadingSdModels: action.payload};
    case ActionTypes.SET_SD_MODELS:
      return {...state, sd_models: action.payload};
  
    default:
      return state;
  }
};
