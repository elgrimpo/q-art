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
      heroBody: palette.text.heroBody,
      cardDescription: palette.text.cardDescription,
    },
    divider: palette.divider,
  },
  typography: {
    // "Everything else" per design/fontstyling.md — all UI, buttons, labels,
    // cards, metadata, navigation. Loaded via next/font/google in layout.js
    // and exposed as --font-inter; falls back to the generic family if the
    // variable isn't available (e.g. components rendered outside <body>).
    fontFamily: "var(--font-inter), Inter, sans-serif",
    fontWeightMedium: 700,
    fontWeightBold: 900,
    // Display serif, used sparingly for marketing headlines only (H1/H2).
    // Loaded via next/font/google in layout.js as --font-instrument-serif.
    h1: {
      fontFamily: "var(--font-instrument-serif), serif",
      fontWeight: 400,
      fontSize: "4.5rem",
      lineHeight: 1.05,
      letterSpacing: "-0.04em",
      // Same gap as h3/h4/h5 below: with no explicit color, this rendered
      // browser-default black on dark pages unless a parent happened to set
      // an inherited color (which is exactly why some pages were patched
      // with a manual color:"#ccc" wrapper instead of relying on the theme).
      color: palette.text.primary,
    },
    h2: {
      fontFamily: "var(--font-instrument-serif), serif",
      fontWeight: 400,
      fontSize: "3.5rem",
      lineHeight: 1.1,
      letterSpacing: "-0.03em",
      color: palette.text.primary,
    },
    // h3-h6 stay in Inter (the base fontFamily already covers this) — only
    // weight/size/line-height change per the spec's scale.
    h3: {
      fontWeight: 700,
      fontSize: "2.25rem",
      lineHeight: 1.2,
      letterSpacing: "-0.5px",
      // h4 below has the same gap: no explicit color at its only call site,
      // and no previous theme default, so it was rendering browser-default
      // black exactly like the h5 bug fixed earlier.
      color: palette.text.primary,
    },
    h4: {
      fontWeight: 700,
      fontSize: "1.75rem",
      lineHeight: 1.25,
      color: palette.text.primary,
    },
    h5: {
      fontWeight: 600,
      fontSize: "1.375rem",
      lineHeight: 1.3,
      // Plain section titles throughout the app (form titles, "Scannability",
      // "Filters", etc.) are rendered without an explicit color — defaulting
      // it here keeps them from falling back to browser black.
      color: palette.text.primary,
    },
    h6: {
      fontWeight: 600,
      fontSize: "1.125rem",
      lineHeight: 1.35,
      color: palette.text.secondary,
    },
    body1: {
      fontWeight: 400,
      fontSize: "1rem",
      lineHeight: 1.65,
    },
    // Supporting/secondary copy. Matches the body2 color repeated inline
    // throughout IteratePanel.js/ImageSidebar.js — defaulting it here means
    // new body2 text doesn't need its own color override.
    body2: {
      fontWeight: 400,
      fontSize: "0.875rem",
      lineHeight: 1.6,
      color: palette.text.secondary,
    },
    // "Body Large" per design/fontstyling.md — hero descriptions only.
    // Mapped onto subtitle1 since MUI's default typography scale doesn't
    // have a third body tier.
    subtitle1: {
      fontWeight: 400,
      fontSize: "1.125rem",
      lineHeight: "30px",
      color: palette.text.heroBody,
    },
    button: {
      fontSize: "1rem",
      fontWeight: 600,
      letterSpacing: 0,
      textTransform: "none",
    },
    // Small uppercase section labels (e.g. "Links to", "Style",
    // "Scannability" on the image detail page) — matches the spec's
    // "Caption" tag-label style. Distinct from MUI's `caption` variant,
    // which the app already uses for normal-case small print
    // (ScannabilityBadge, helper text) and shouldn't get uppercase/tracking.
    overline: {
      fontSize: "0.75rem",
      fontWeight: 500,
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
        // "Secondary" per design/fontstyling.md Buttons spec (15px/500→600
        // for the heavier look in the reference screenshot): outlined green
        // pill, green text.
        outlined: {
          color: palette.primary.main,
          borderColor: palette.primary.main,
          fontSize: "0.9375rem",
          fontWeight: 600,
        },
        // "Primary": solid green fill, bold near-black text — matches the
        // reference screenshot's Generate button.
        containedPrimary: {
          color: "#111111",
          fontWeight: 700,
        },
        // Scoped to size="large" (the marketing/form CTAs) rather than the
        // root, so small icon-only contained buttons elsewhere (close,
        // delete, like) aren't forced to this height.
        sizeLarge: {
          minHeight: "56px",
          borderRadius: "28px",
        },
      },
    },
    // Filter chips (FilterPanelMobile) — design/fontstyling.md "Filter Chips"
    // spec: Inter 14px/500, selected = solid green/dark text, unselected =
    // a faint white wash rather than an outlined green pill.
    MuiChip: {
      styleOverrides: {
        root: {
          fontSize: "0.875rem",
          fontWeight: 500,
        },
        filledPrimary: {
          "&.MuiChip-colorPrimary": {
            backgroundColor: palette.primary.main,
            color: "#111111",
          },
        },
        outlinedPrimary: {
          "&.MuiChip-colorPrimary": {
            backgroundColor: "rgba(255, 255, 255, 0.06)",
            borderColor: "transparent",
            color: palette.text.secondary,
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
    // Top nav tabs — per design/fontstyling.md "Navbar" spec: Inter 15px/600,
    // letter-spaced uppercase, dim inactive / primary-green active.
    MuiTab: {
      styleOverrides: {
        root: {
          fontWeight: 600,
          fontSize: "0.9375rem",
          letterSpacing: "0.03em",
          textTransform: "uppercase",
          margin: "0.5rem 1rem",
          padding: "0px",
          color: "rgba(255, 255, 255, 0.55)",
          "&.Mui-selected": {
            fontWeight: 600,
            color: palette.primary.main,
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
          // A flat surface color (elevated) read as almost indistinguishable
          // from the form panel behind it. A white-wash overlay plus a
          // visibly lighter border gives the field actual definition
          // regardless of what's underneath.
          backgroundColor: "rgba(255, 255, 255, 0.08)",
          "& .MuiOutlinedInput-notchedOutline": {
            borderColor: "rgba(255, 255, 255, 0.18)",
          },
          "&:hover .MuiOutlinedInput-notchedOutline": {
            borderColor: "rgba(255, 255, 255, 0.32)",
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
