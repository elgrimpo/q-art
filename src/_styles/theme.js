'use client';
import { createTheme } from "@mui/material/styles";

const palette = {
  primary: {
    main: "#70E195",
    light: "#A5FFC3",
    dark: "#00ac4f",
  },
  secondary: {
    main: "#333333",
    light: "#8b8b8b",
    dark: "#000000",
  },
};

const theme = createTheme({
  palette: {
    primary: {
      main: palette.primary.main,
      light: palette.primary.light,
      dark: palette.primary.dark,
    },
    secondary: {
      main: palette.secondary.main,
      light: palette.secondary.light,
      dark: palette.secondary.dark,
    },
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
    },
    h6: {
      // fontFamily: "Roboto Serif",
      fontWeight: 300,
      // fontStyle: "italic",
      color: palette.secondary.main
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: "24px",
        },
        outlined: {
          color: palette.primary.dark,
          borderColor: palette.primary.dark,
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        outlinedPrimary: {
          "&.MuiChip-colorPrimary": {
            color: palette.primary.dark,
            borderColor: palette.primary.dark,
          },
        },
      },
    },
    MuiBottomNavigationAction: {
      styleOverrides: {
        root: {
          "&.Mui-selected": {
            color: palette.primary.dark,
          },
        },
      },
    },

    // class="MuiButtonBase-root MuiButton-root MuiButton-outlined MuiButton-outlinedPrimary MuiButton-sizeMedium MuiButton-outlinedSizeMedium MuiButton-root MuiButton-outlined MuiButton-outlinedPrimary MuiButton-sizeMedium MuiButton-outlinedSizeMedium css-uhfczg-MuiButtonBase-root-MuiButton-root"
    MuiMenuItem: {
      styleOverrides: {
        root: {
          "&.Mui-selected": {
            backgroundColor: palette.primary.light,
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
          color: "white",
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
  },
});

export default theme;
