"use client";
// Libraries imports
import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

// import { Link, useLocation } from "react-router-dom";
import {
  Tab,
  Stack,
  Box,
  IconButton,
  ButtonBase,
  Typography,
} from "@mui/material";
import ImageTwoToneIcon from "@mui/icons-material/ImageTwoTone";
import Diversity1TwoToneIcon from "@mui/icons-material/Diversity1TwoTone";
import HomeTwoToneIcon from '@mui/icons-material/HomeTwoTone';
import { useEffect } from "react";
import useMediaQuery from "@mui/material/useMediaQuery";
import theme from "@/_styles/theme";
import AutoFixHighTwoToneIcon from "@mui/icons-material/AutoFixHighTwoTone";
import "../globals.css";

// App imports
import { useStore } from "@/store";

/* -------------------------------------------------------------------------- */
/*                               COMPONENT START                              */
/* -------------------------------------------------------------------------- */

function Tabs() {
  /* ---------------------------- DECLARE VARIABLE ---------------------------- */
  const { user } = useStore();

  // Screen size
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  // URL Path
  const pathname = usePathname();
  const [tabValue, setTabValue] = useState(1);

  // Change selected Tab based on URL path
  useEffect(() => {
    setTabValue(pathname);
  }, [pathname]);

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

          {/* HOME */}
          {!user?._id && (
          <Link href="/" passHref legacyBehavior>
            <ButtonBase
              sx={{
                flexDirection: "column",
                justifyContent: "center",
                alignItems: "center",
                width: user?._id ? "33%" : "50%",
                height: "100%",
                color: getColor("/"),
              }}
              label="Home"
              value="/"
            >
              <IconButton
                aria-label="close"
                color="primary"
                size="small"
                sx={{ m: 0, padding: "0px", color: getColor("/") }}
              >
                <HomeTwoToneIcon />
              </IconButton>


              <Typography variant="body2" sx={{ mt: 0 }}>
                Home
              </Typography>
            </ButtonBase>
          </Link>
          )}

          {/* MY CODES */}
          {user?._id && (
            <Link href="/mycodes" passHref legacyBehavior>
              <ButtonBase
                label="My codes"
                value="/mycodes"
                sx={{
                  flexDirection: "column",
                  justifyContent: "center",
                  alignItems: "center",
                  width: "33%",
                  height: "100%",
                  color: getColor("/mycodes"),
                }}
              >
                <IconButton
                  aria-label="close"
                  size="small"
                  value="/mycodes"
                  sx={{ m: 0, padding: "0px", color: getColor("/mycodes") }}
                >
                  <ImageTwoToneIcon />
                </IconButton>
                <Typography variant="body2" sx={{ mt: 0 }}>
                  My Codes
                </Typography>
              </ButtonBase>
            </Link>
          )}

          {/* GENERATE */}
          {user?._id && (
            <Link href="/generate" passHref legacyBehavior>
              <ButtonBase
                sx={{
                  flexDirection: "column",
                  justifyContent: "center",
                  alignItems: "center",
                  width: "33%",
                  height: "100%",
                  color: getColor("/generate"),
                }}
                label="Generate"
                value="/generate"
              >
                <Box
                  sx={{
                    width: "80px",
                    height: "42px",
                    borderRadius: "16px",
                    position: "absolute",
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    border: "#262626 6px solid",
                    backgroundColor: getColor("/generate"),
                  }}
                >
                  <IconButton
                    aria-label="close"
                    color="secondary"
                    size="small"
                    sx={{ m: 0, padding: "0px" }}
                  >
                    <AutoFixHighTwoToneIcon
                      sx={{ height: "32px", width: "32px" }}
                    />
                  </IconButton>
                </Box>
              </ButtonBase>
            </Link>
          )}

          {/* EXPLORE */}
          <Link href="/explore" passHref legacyBehavior>
            <ButtonBase
              sx={{
                flexDirection: "column",
                justifyContent: "center",
                alignItems: "center",
                width: user?._id ? "33%" : "50%",
                height: "100%",
                color: getColor("/explore"),
              }}
              label="Explore"
              value="/explore"
            >
              <IconButton
                aria-label="close"
                color="primary"
                size="small"
                sx={{ m: 0, padding: "0px", color: getColor("/explore") }}
              >
                <Diversity1TwoToneIcon />
              </IconButton>
              {/* MY CODES PAGE */}
              <Typography variant="body2" sx={{ mt: 0 }}>
                Explore
              </Typography>
            </ButtonBase>
          </Link>
        </Box>
      )}

      {/* --------------------------- DESKTOP NAVIGATION --------------------------- */}
      <Stack
        sx={{
          display: { xs: "none", md: "flex" },
          zIndex: 1000,
          position: "absolute",
          top: "3px",
          right: "50%",
          transform: "translate(50%, 0%)",
        }}
        direction="row"
      >
                {!user?._id && (
          <Link href="/" passHref legacyBehavior>
            <Tab
              label="Home"
              value="/"
              selected={tabValue === "/"}
            />
          </Link>
        )}
        {user?._id && (
          <Link href="/generate" passHref legacyBehavior>
            <Tab
              label="Generate"
              value="/generate"
              selected={tabValue === "/generate"}
            />
          </Link>
        )}

        {user?._id && (
          <Link href="/mycodes" passHref legacyBehavior>
            <Tab
              label="My codes"
              value="/mycodes"
              selected={tabValue === "/mycodes"}
            />
          </Link>
        )}

        <Link href="/explore" passHref legacyBehavior>
          <Tab
            label="Explore"
            value="/explore"
            selected={tabValue === "/explore"}
          />
        </Link>
      </Stack>
    </div>
  );
}

export default Tabs;
