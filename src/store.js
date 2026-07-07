import { create } from "zustand";
import { RANDOM_STYLE_ID } from "./_utils/ImageStyles";

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
    style_id: RANDOM_STYLE_ID,
    style_title: "Random",
    qr_weight: 0.0,
    negative_prompt: "",
    seed: -1,
  },
  generatingImage: false,
  iterateSession: null,

  setIterateSession: (session) => set({ iterateSession: session }),
  clearIterateSession: () => set({ iterateSession: null }),

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
        style_id: RANDOM_STYLE_ID,
        style_title: "Random",
        qr_weight: 0.0,
        negative_prompt: "",
        seed: -1,
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
