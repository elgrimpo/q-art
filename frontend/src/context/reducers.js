import { placeholder_image_str } from "../assets/placeholder_image";

export const ActionTypes = {
  SET_USER_IMAGES: "SET_USER_IMAGES",
  SET_LOADING_USER_IMAGES: "SET_LOADING_USER_IMAGES",
  SET_USER_IMAGES_PAGE: "SET_USER_IMAGES_PAGE",
  SET_GENERATED_IMAGE: "SET_GENERATED_IMAGE",
  SET_LOADING_GENERATED_IMAGE: "SET_LOADING_GENERATED_IMAGE",
  SET_GENERATE_FORM_VALUES: "SET_GENERATE_FORM_VALUES",
};

export const initialState = {
  // My Codes
  userImages: [],
  loadingUserImages: false,
  userImagesPage: 0,
  //Generate
  generatedImage: {
    created_at: "-",
    content: "-",
    prompt: "-",
    image_str: placeholder_image_str,
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
  },
};

export const imagesReducer = (state, action) => {
  switch (action.type) {
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
    default:
      return state;
  }
};
