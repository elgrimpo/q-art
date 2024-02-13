import { create } from "zustand"

export const useStore = create((set) => ({
    user: {},
    alert: {
      open: false,
      severity: 'info',
      message: '',
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
    setGenerateFormValues: (values) =>
    set((state) => ({
      ...state,
      generateFormValues: values,
    })),
    resetGenerateFormValues: () => set((state) => ({
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
          severity: 'info',
          message: '',
        },
      })),
  }));