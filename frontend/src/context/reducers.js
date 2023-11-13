export const ActionTypes = {
  // User
  SET_USER: "SET_USER",

  // Generate
  SET_GENERATED_IMAGE: "SET_GENERATED_IMAGE",
  SET_LOADING_GENERATED_IMAGE: "SET_LOADING_GENERATED_IMAGE",
  SET_GENERATE_FORM_VALUES: "SET_GENERATE_FORM_VALUES",

  // User Images
  SET_USER_IMAGES: "SET_USER_IMAGES",
  SET_LOADING_USER_IMAGES: "SET_LOADING_USER_IMAGES",
  SET_USER_IMAGES_PAGE: "SET_USER_IMAGES_PAGE",

  // Community Images
  SET_COMMUNITY_IMAGES: "SET_COMMUNITY_IMAGES",
  SET_LOADING_COMMUNITY_IMAGES: "SET_LOADING_COMMUNITY_IMAGES",
  SET_COMMUNITY_IMAGES_PAGE: "SET_COMMUNITY_IMAGES_PAGE",

  // Models
  SET_LOADING_SD_MODELS: "SET_LOADING_SD_MODELS",
  SET_SD_MODELS: "SET_SD_MODELS", 

  // Alert
  OPEN_ALERT: "OPEN_ALERT",
  CLOSE_ALERT: "CLOSE_ALERT",
  
};

export const initialState = {
  // User
  user: {},

  // Generate
  generatedImage: {
    created_at: "-",
    content: "-",
    prompt: "-",
    image_url: "https://qrartimages.s3.us-west-1.amazonaws.com/654f3d47bef0549f910f70ca.png",
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

  // User Images
  userImages: [],
  loadingUserImages: false,
  userImagesPage: 0,

  // Community Images
  communityImages: [],
  loadingCommunityImages: false,
  communityImagesPage: 0,

  // Models
  loadingSdModels: false,
  sd_models: [],

  // Alert
  alertOpen: false,
  alertSeverity: "",
  alertMessage: ""   

};

export const imagesReducer = (state, action) => {
  switch (action.type) {

    // User
    case ActionTypes.SET_LOGGED_IN:
      return { ...state, isLoggedIn: action.payload };
    case ActionTypes.SET_USER:
      return { ...state, user: action.payload };

    // Generate 
    case ActionTypes.SET_GENERATED_IMAGE:
      return { ...state, generatedImage: action.payload };
    case ActionTypes.SET_LOADING_GENERATED_IMAGE:
      return { ...state, loadingGeneratedImage: action.payload };
    case ActionTypes.SET_GENERATE_FORM_VALUES:
      return { ...state, generateFormValues: action.payload };

    // User Images
    case ActionTypes.SET_USER_IMAGES:
      return { ...state, userImages: action.payload };
    case ActionTypes.SET_LOADING_USER_IMAGES:
      return { ...state, loadingUserImages: action.payload };
    case ActionTypes.SET_USER_IMAGES_PAGE:
      return { ...state, userImagesPage: action.payload };

    // Community Images
    case ActionTypes.SET_COMMUNITY_IMAGES:
      return { ...state, communityImages: action.payload };
    case ActionTypes.SET_LOADING_COMMUNITY_IMAGES:
      return { ...state, loadingCommunityImages: action.payload };
    case ActionTypes.SET_COMMUNITY_IMAGES_PAGE:
      return { ...state, communityImagesPage: action.payload };

      // Models 
    case ActionTypes.SET_LOADING_SD_MODELS:
      return {...state, loadingSdModels: action.payload};
    case ActionTypes.SET_SD_MODELS:
      return {...state, sd_models: action.payload};

      // Alert
      case ActionTypes.OPEN_ALERT:
        return {...state, alertOpen: true, alertSeverity: action.payload.severity, alertMessage: action.payload.message};
      case ActionTypes.CLOSE_ALERT:
        return {...state, alertOpen: false, alertSeverity: "", alertMessage: ""};
  
    default:
      return state;
  }
};
