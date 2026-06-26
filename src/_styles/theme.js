'use client';
import { createTheme } from "@mui/material/styles";
import { palette } from "./palette";

const theme = createTheme({
  palette: {
    mode: "dark",
    primary: {
      main: palette.primary.main,
      light: palette.primary.light,
      dark: palette.primary.dark,
      contrastText: palette.primary.contrastText,
    },
    secondary: {
      main: palette.secondary.main,
      light: palette.secondary.light,
      dark: palette.secondary.dark,
      contrastText: palette.secondary.contrastText,
    },
    background: {
      default: palette.background.default,
      paper: palette.background.paper,
      elevated: palette.background.elevated,
      well: palette.background.well,
    },
    text: {
      primary: palette.text.primary,
      secondary: palette.text.secondary,
      muted: palette.text.muted,
      disabled: palette.text.disabled,
    },
    divider: palette.divider,
  },
  typography: {
    fontWeightMedium: 700,
    fontWeightBold: 900,
    h1: {
      fontFamily: "Roboto Serif",
      fontWeight: 900,
      fontStyle: "italic",
    },
    h2: {
      fontFamily: "Roboto Serif",
      fontWeight: 500,
      fontStyle: "italic",
    },
    h3: {
      fontFamily: "Roboto Serif",
      fontWeight: 900,
      fontStyle: "italic",
    },
    h5: {
      fontFamily: "Roboto Serif",
      fontWeight: 900,
      fontStyle: "italic",
      // Unlike h1-h3 (always given an explicit color="primary" prop at the
      // call site), h5 is used for plain section titles throughout the app
      // (form titles, "Scannability", "Filters", etc.) without an explicit
      // color — defaulting it here keeps it from falling back to browser
      // black instead of the theme's light text.
      color: palette.text.primary,
    },
    h6: {
      // fontFamily: "Roboto Serif",
      fontWeight: 300,
      // fontStyle: "italic",
      color: palette.text.secondary,
    },
    // Supporting/secondary copy. Matches the body2 color repeated inline
    // throughout IteratePanel.js/ImageSidebar.js — defaulting it here means
    // new body2 text doesn't need its own color override.
    body2: {
      color: palette.text.secondary,
    },
    // Small uppercase section labels (e.g. "Links to", "Style",
    // "Scannability" on the image detail page).
    overline: {
      fontSize: "0.6875rem",
      letterSpacing: "0.08em",
      color: palette.text.muted,
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: "24px",
        },
        outlined: {
          color: palette.primary.main,
          borderColor: palette.primary.main,
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        outlinedPrimary: {
          "&.MuiChip-colorPrimary": {
            color: palette.primary.main,
            borderColor: palette.primary.main,
          },
        },
      },
    },
    MuiBottomNavigationAction: {
      styleOverrides: {
        root: {
          "&.Mui-selected": {
            color: palette.primary.main,
          },
        },
      },
    },

    // class="MuiButtonBase-root MuiButton-root MuiButton-outlined MuiButton-outlinedPrimary MuiButton-sizeMedium MuiButton-outlinedSizeMedium MuiButton-root MuiButton-outlined MuiButton-outlinedPrimary MuiButton-sizeMedium MuiButton-outlinedSizeMedium css-uhfczg-MuiButtonBase-root-MuiButton-root"
    MuiMenuItem: {
      styleOverrides: {
        root: {
          "&.Mui-selected": {
            backgroundColor: palette.background.elevated,
          },
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          fontFamily: "Roboto Serif",
          fontWeight: 500,
          fontStyle: "italic",
          fontSize: "1.2rem",
          margin: "0.5rem 1rem",
          padding: "0px",
          color: palette.text.primary,
          "&.Mui-selected": {
            fontFamily: "Roboto Serif",
            fontWeight: 900,
            fontStyle: "italic",
            color: palette.primary.light,
          },
        },
      },
    },
    MuiTabs: {
      styleOverrides: {
        indicator: {
          backgroundColor: "rgba(0, 0, 0, 0);",
        },
      },
    },
    MuiTabPanel: {
      styleOverrides: {
        root: {
          padding: "0px",
        },
      },
    },
    // Centralized text field styling — matches the DARK_FIELD_SX pattern used
    // throughout IteratePanel.js: an unfilled, bordered outline (no input
    // background fill) so individual components no longer need to redefine
    // border/text/label colors themselves.
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: "8px",
          color: palette.text.primary,
          "& .MuiOutlinedInput-notchedOutline": {
            borderColor: palette.divider,
          },
          "&:hover .MuiOutlinedInput-notchedOutline": {
            borderColor: "#4E4E4E",
          },
          "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
            borderColor: palette.primary.main,
          },
          "&.Mui-disabled .MuiOutlinedInput-notchedOutline": {
            borderColor: palette.background.elevated,
          },
        },
        input: {
          "&.Mui-disabled": {
            color: palette.text.disabled,
            WebkitTextFillColor: palette.text.disabled,
          },
        },
      },
    },
    MuiInputLabel: {
      styleOverrides: {
        root: {
          color: palette.text.muted,
          "&.Mui-focused": {
            color: palette.primary.main,
          },
          "&.Mui-disabled": {
            color: palette.text.disabled,
          },
        },
      },
    },
    // Dark surface card default, matching the bordered-panel look used for
    // grid tiles and detail-page panels (ImagesCard / IteratePanel rows).
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundColor: palette.background.paper,
          border: `1px solid ${palette.divider}`,
          borderRadius: "16px",
        },
      },
    },
  },
});

export default theme;
