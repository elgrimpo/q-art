import { create } from "zustand"

export const useStore = create((set) => ({
    user: {},
    alert: {
      open: false,
      severity: 'info',
      message: '',
    },
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