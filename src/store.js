import { create } from "zustand";

export const useStore = create((set) => ({
  user: {},
  alert: {
    open: false,
    severity: "info",
    message: "",
  },
  generateFormValues: {
    website: "",
    prompt: "",
    style_id: 1,
    style_title: "Default",
    style_prompt: "",
    qr_weight: 0.0,
    negative_prompt: "",
    seed: -1,
    sd_model: "cyberrealistic_v40_151857.safetensors",
  },
  generatingImage: false,
  processingImages: [],


  // Function to add an image to the processing images array
  addImageProcessing: (imageId) =>
    set((state) => ({
      processingImages: [...state.processingImages, imageId],
    })),

  // Function to remove an image from the processing images array
  removeImageProcessing: (imageId) =>
    set((state) => ({
      processingImages: state.processingImages.filter((id) => id !== imageId),
    })),
  setGenerateFormValues: (values) =>
    set((state) => ({
      ...state,
      generateFormValues: values,
    })),
  resetGenerateFormValues: () =>
    set((state) => ({
      ...state,
      generateFormValues: {
        website: "",
        prompt: "",
        style_id: 1,
        style_title: "Default",
        style_prompt: "",
        qr_weight: 0.0,
        negative_prompt: "",
        seed: -1,
        sd_model: "cyberrealistic_v40_151857.safetensors",
      },
    })),
    setGeneratingImage: (bool) =>
    set((state) => ({
      ...state,
      generatingImage: bool
    })),
  openAlert: (severity, message) =>
    set((state) => ({
      ...state,
      alert: {
        open: true,
        severity: severity,
        message: message,
      },
    })),
  closeAlert: () =>
    set((state) => ({
      ...state,
      alert: {
        open: false,
        severity: "info",
        message: "",
      },
    })),
}));
