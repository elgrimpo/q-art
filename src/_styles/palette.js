// Single source of truth for color tokens. theme.js builds the MUI theme from
// this file — components should reach colors through theme.palette (or this
// file directly for non-MUI contexts), not hardcode hex values.

// Values below are pulled from the most consistently-styled, recently-built
// part of the app — the images page (ImageSidebar/IteratePanel) and the
// images grid (mycodes/ImagesCard) — and treated as the canonical reference.
// New/changed UI should reuse these tokens rather than introducing new hex
// values.
export const palette = {
  primary: {
    main: "#70E195",
    light: "#A5FFC3",
    dark: "#00ac4f",
    contrastText: "#0B1F14",
  },
  secondary: {
    main: "#333333",
    light: "#8b8b8b",
    dark: "#000000",
    contrastText: "#FFFFFF",
  },
  background: {
    // App shell background.
    default: "#161616",
    // Cards / panels that sit on top of the shell (e.g. the images grid tile,
    // the Generate box).
    paper: "#232323",
    // Hover/icon-chip surface, one step lighter than paper.
    elevated: "#2A2A2A",
    // Recessed "well" surface for nested panels (IteratePanel rows, prompt
    // boxes). Inputs themselves are unfilled — see MuiOutlinedInput overrides.
    well: "#0E0E0E",
  },
  text: {
    primary: "#F0F0F0",
    // Body copy / supporting text.
    secondary: "#B8B8B8",
    // Small overline labels and input labels (dimmer than secondary).
    muted: "#7D7D7D",
    disabled: "#6B6B6B",
  },
  divider: "#2E2E2E",
};
