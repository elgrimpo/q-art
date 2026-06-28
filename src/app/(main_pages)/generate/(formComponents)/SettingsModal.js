"use client";
// Libraries imports
import React from "react";
import {

  TextField,
  Box,
  Dialog,
  Stack,
  Typography,
  Slider,
  IconButton,
  Tooltip,
  InputAdornment,
  Grow
} from "@mui/material";
import CasinoTwoToneIcon from "@mui/icons-material/CasinoTwoTone";
import QrCode2TwoToneIcon from "@mui/icons-material/QrCode2TwoTone";
import PhotoTwoToneIcon from "@mui/icons-material/PhotoTwoTone";
import useMediaQuery from "@mui/material/useMediaQuery";
import theme from "@/_styles/theme";



// App imports
import "../../../globals.css";
import { QR_SLIDER_MIN, QR_SLIDER_MAX } from '@/_utils/qrWeight';
import { useStore } from "@/store";
import StyledIconButton from "@/_components/StyledIconButton";
/* -------------------------------------------------------------------------- */
/*                               COMPONENT START                              */
/* -------------------------------------------------------------------------- */

function SettingsModal(props) {
  /* ---------------------------- DECLARE VARIABLES --------------------------- */
  const { open, handleInputChange, handleClose } = props;
  // Context variables
  const { generateFormValues } = useStore();

  // Slider for (QR Code Weight). Presented on a -3..+3 scale (Weak -> Strong).
  // The backend only accepts qr_weight in [0, 1], so this value is translated
  // via sliderToQrWeight() before the request is sent (see _utils/qrWeight.js).
  const qrWeight = [{ value: QR_SLIDER_MIN }, { value: QR_SLIDER_MAX }];

    // Screen size
    const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  /* -------------------------------- FUNCTIONS ------------------------------- */

  // Set display text for slider
  function sliderText(value) {
    return `${value}`;
  }

  /* -------------------------------------------------------------------------- */
  /*                              COMPONENT RENDER                              */
  /* -------------------------------------------------------------------------- */

  return (

    <Dialog
      fullScreen={isMobile}
      TransitionComponent={Grow}
      open={open}
      onClose={handleClose}
      
      sx={{
        ...(isMobile && {
          "& .MuiDialog-paper": {
            maxHeight: "100%",
            maxWidth: "100%",
          },
        }),

      }}
    >
        <Box
        sx={{ padding: "1rem", backgroundColor: "background.paper", height: "100%" }}
      >
         <Box
        sx={{
          margin: { sx: "0rem", lg: "1rem" },
          position: "absolute",
          top: { xs: "0.5rem" },
          right: { xs: "0.5rem" },
          zIndex: "1",
        }}
      >
        <StyledIconButton
          variant="contained"
          color="secondary"
          type="close"
          handleClick={handleClose}
        />
      </Box>
        <Typography
          className="form-title"
          variant="h3"
          color="primary"
          align="center"
          sx={{ margin: "0.5rem" }}
        >
          Advanced Settings
        </Typography>
    <Stack useFlexGap alignItems="stretch" spacing={{ xs: 1, md: 2 }}>
      {/* ----------------------------- QR CODE WEIGHT ----------------------------- */}

      <Box className="form-section" sx={{ width: "100%" }}>
        <Typography className="form-title" variant="h5" align="center">
          QR Code Weight
        </Typography>

        {/* LEFT ICON */}
        <Stack flexDirection="row">
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              margin: "0rem 1rem",
            }}
          >
            <IconButton sx={{ padding: "0" }} size="large">
              <PhotoTwoToneIcon />
            </IconButton>
            <Typography variant="subtitle2" align="center">
              Weak
            </Typography>
          </Box>

          {/* SLIDER */}
          <Slider
            aria-label="QR Code Weight"
            value={generateFormValues.qr_weight}
            getAriaValueText={sliderText}
            step={0.1}
            valueLabelDisplay="auto"
            marks={qrWeight}
            min={QR_SLIDER_MIN}
            max={QR_SLIDER_MAX}
            track={false}
            color="secondary"
            name="qr_weight"
            onChange={handleInputChange}
            sx={{ width: "95%", margin: "auto" }}
          />

          {/* RIGHT ICON */}
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              margin: "0rem 1rem",
            }}
          >
            <IconButton size="large" sx={{ padding: "0" }}>
              <QrCode2TwoToneIcon />
            </IconButton>
            <Typography variant="subtitle2" align="center">
              Strong
            </Typography>
          </Box>
        </Stack>

        <Typography
          className="helpertext"
          color="text.secondary"
          variant="caption"
          align="left"
          sx={{ pl: 2, pt: 1 }}
        >
          A stronger QR Weight will make the QR Code easier to scan. A weaker
          weight will emphasize the image more.
        </Typography>
      </Box>

      <Box className="form-section" sx={{ width: "100%" }}>
        {/* ---------------------------------- SEED ---------------------------------- */}
        <Typography className="form-title" variant="h5" align="center">
          Seed
        </Typography>

        <TextField
          className="form-field"
          id="seed"
          label="Seed"
          name="seed"
          value={generateFormValues.seed}
          onChange={handleInputChange}
          variant="outlined"
          fullWidth
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <Tooltip title="Set to Random">
                  <IconButton
                    name="seed"
                    value={-1}
                    onClick={() =>
                      handleInputChange({
                        target: {
                          name: "seed",
                          value: -1,
                        },
                      })
                    }
                  >
                    <CasinoTwoToneIcon />
                  </IconButton>
                </Tooltip>
              </InputAdornment>
            ),
          }}
        />
        <Typography className="helpertext" color="text.secondary">
          You can use a seed from an existing image to generate similar images.
          Otherwise, leave it as -1
        </Typography>
      </Box>
    </Stack>
    </Box>
    </Dialog>
  );
}

export default SettingsModal;
