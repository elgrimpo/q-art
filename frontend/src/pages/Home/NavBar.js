// Libraries imports
import React, {useState} from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Tab,
  Tabs,
  Box,
  IconButton,
  ButtonBase,
  Typography,
} from "@mui/material";
import ImageTwoToneIcon from "@mui/icons-material/ImageTwoTone";
import Diversity1TwoToneIcon from "@mui/icons-material/Diversity1TwoTone";
import { useEffect } from "react";
import useMediaQuery from "@mui/material/useMediaQuery";
import theme from "../../styles/mui-theme";
import QrCodeTwoToneIcon from "@mui/icons-material/QrCodeTwoTone";

/* -------------------------------------------------------------------------- */
/*                               COMPONENT START                              */
/* -------------------------------------------------------------------------- */

function BottomNavBar() {
  /* ---------------------------- DECLARE VARIABLE ---------------------------- */

  // Screen size
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  // URL Path
  const location = useLocation();

  // Current Tab
  const [tabValue, setTabValue] = useState("/generate/");

  /* -------------------------------- FUNCTIONS ------------------------------- */

  // Change selected Tab based on URL path
  useEffect(() => {
    const { pathname } = location;

    setTabValue(pathname);
  }, [location]);

  const getColor = (value) => {
    if (value === tabValue) {
      return theme.palette.primary.main;
    } else {
      return theme.palette.secondary.light;
    }
  };

  /* -------------------------------------------------------------------------- */
  /*                              COMPONENT RENDER                              */
  /* -------------------------------------------------------------------------- */
  return (
    /* --------------------------- MOBILE NAVIGATION --------------------------- */
    <div>
      {isMobile && (
        <Box
          sx={{
            backgroundColor: "#262626",
            width: "100%",
            height: "60px",
            borderRadius: "8px 8px 0px 0px",
            position: "fixed",
            bottom: 0,
            left: 0,
            display: "flex",
            zIndex: 1000,
          }}
        >
          {/* MY CODES */}
          <ButtonBase
            component={Link}
            label="My codes"
            value="/mycodes"
            to="/mycodes/"
            sx={{
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
              width: "33%",
              height: "100%",
              color: getColor("/mycodes/"),
            }}
          >
            <IconButton
              aria-label="close"
              size="small"
              value="/mycodes"
              sx={{ m: 0, padding: "0px", color: getColor("/mycodes/") }}
            >
              <ImageTwoToneIcon />
            </IconButton>
            <Typography variant="body2" sx={{ mt: 0 }}>
              My Codes
            </Typography>
          </ButtonBase>

          {/* GENERATE */}
          <ButtonBase
            sx={{
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
              width: "33%",
              height: "100%",
              color: getColor("/generate/"),
            }}
            component={Link}
            label="Generate"
            value="/generate"
            to="/generate/"
          >
            <Box
              sx={{
                width: "60px",
                height: "60px",
                borderRadius: "100%",
                position: "absolute",
                bottom: "28px",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                // boxShadow: "0px 20px 20px 0px rgba(0, 0, 0, 0.25)",
                border: "#262626 6px solid",
                backgroundColor: getColor("/generate/"),
              }}
            >
              <IconButton
                aria-label="close"
                color="secondary"
                size="small"
                sx={{ m: 0, padding: "0px" }}
              >
                <QrCodeTwoToneIcon sx={{ height: "32px", width: "32px" }} />
              </IconButton>
            </Box>
            <Typography variant="body2" sx={{ mt: 3 }}>
              Generate
            </Typography>
          </ButtonBase>

          {/* EXPLORE */}
          <ButtonBase
            sx={{
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
              width: "33%",
              height: "100%",
              color: getColor("/explore/"),
            }}
            component={Link}
            label="Explore"
            value="/explore"
            to="/explore/"
          >
            <IconButton
              aria-label="close"
              color="primary"
              size="small"
              sx={{ m: 0, padding: "0px", color: getColor("/explore/") }}
            >
              <Diversity1TwoToneIcon />
            </IconButton>
            <Typography variant="body2" sx={{ mt: 0 }}>
              Explore
            </Typography>
          </ButtonBase>
        </Box>
      )}

      {/* --------------------------- DESKTOP NAVIGATION --------------------------- */}
      <Tabs
        value={tabValue}
        sx={{ display: { xs: "none", md: "flex" }, zIndex: 1000, position: "absolute", top: "3px", right: "50%", transform: "translate(50%, 0%)"}}
        centered
      >
        <Tab
          component={Link}
          label="Generate"
          value="/generate/"
          to="/generate/"
        />
        <Tab component={Link} label="My codes" value="/mycodes/" to="/mycodes/" />
        <Tab component={Link} label="Explore" value="/explore/" to="/explore/" />
      </Tabs>
    </div>
  );
}

export default BottomNavBar;
