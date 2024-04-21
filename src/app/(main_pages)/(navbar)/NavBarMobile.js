"use client";

// Libraries imports
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  AppBar,
  ButtonBase,
  IconButton,
  Typography,
  Paper,
} from "@mui/material";
import ImageTwoToneIcon from "@mui/icons-material/ImageTwoTone";
import Diversity1TwoToneIcon from "@mui/icons-material/Diversity1TwoTone";
import HomeTwoToneIcon from "@mui/icons-material/HomeTwoTone";
import useMediaQuery from "@mui/material/useMediaQuery";
import AutoFixHighTwoToneIcon from "@mui/icons-material/AutoFixHighTwoTone";
import LoginTwoToneIcon from '@mui/icons-material/LoginTwoTone';
import MenuTwoToneIcon from "@mui/icons-material/MenuTwoTone";
import useScrollTrigger from "@mui/material/useScrollTrigger";
import Slide from "@mui/material/Slide";

// App Imports
import "@/app/globals.css";
import { useStore } from "@/store";
import theme from "@/_styles/theme";
import AccountMenuMobile from "./AccountMenuMobile";
/* -------------------------------------------------------------------------- */
/*                               COMPONENT START                              */
/* -------------------------------------------------------------------------- */

export default function NavBarMobile() {
  /* ---------------------------- DECLARE VARIABLE ---------------------------- */
  // URL Path
  const pathname = usePathname();
  const [tabValue, setTabValue] = useState(1);
  const [open, setOpen] = useState(false);

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
  // Screen size
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  // Context variables
  const { user } = useStore();

  // Scroll trigger
  const trigger = useScrollTrigger();

  /* -------------------------------- FUNCTIONS ------------------------------- */

  const handleOpen = () => {
    setOpen(true);
  };

  /* -------------------------------------------------------------------------- */
  /*                              COMPONENT RENDER                              */
  /* -------------------------------------------------------------------------- */
  if (!isMobile) {
  } else {
    return (
      <div>
        <Slide appear={false} direction="down" in={!trigger}>
          <AppBar
            sx={{
              backgroundColor: "transparent",
              boxShadow: "none",
              zIndex: 500,
              padding: {xs: "0.5rem 0.5rem", sm: "0.5rem 1rem"},
            }}
          >
            {/* ---------------------------------- TABS ---------------------------------- */}
            <Paper
              elevation={3}
              sx={{
                backgroundColor: "#3d3d3d",
                height: "60px",
                borderRadius: "8px",
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
                      width: "33%",
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

              {/* GENERATE */}
              {user?._id && (
                <Link href="/generate" passHref legacyBehavior>
                  <ButtonBase
                    label="Generate"
                    value="/generate"
                    sx={{
                      flexDirection: "column",
                      justifyContent: "center",
                      alignItems: "center",
                      width: user?._id ? "25%" : "50%",
                      height: "100%",
                      color: getColor("/generate"),
                    }}
                  >
                    <IconButton
                      aria-label="close"
                      size="small"
                      value="/generate"
                      sx={{
                        m: 0,
                        padding: "0px",
                        color: getColor("/generate"),
                      }}
                    >
                      <AutoFixHighTwoToneIcon />
                    </IconButton>
                    <Typography variant="body2" sx={{ mt: 0 }}>
                      Generate
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
                      width: user?._id ? "25%" : "50%",
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

              {/* EXPLORE */}
              <Link href="/explore" passHref legacyBehavior>
                <ButtonBase
                  sx={{
                    flexDirection: "column",
                    justifyContent: "center",
                    alignItems: "center",
                    width: user?._id ? "25%" : "33%",
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

              {/* MORE */}
              {user?._id && (
                <ButtonBase
                  sx={{
                    flexDirection: "column",
                    justifyContent: "center",
                    alignItems: "center",
                    width: user?._id ? "25%" : "50%",
                    height: "100%",
                    color: getColor("/"),
                  }}
                  label="More"
                  value="/"
                  onClick={handleOpen}
                >
                  <IconButton
                    aria-label="close"
                    color="primary"
                    size="small"
                    sx={{ m: 0, padding: "0px", color: getColor("/") }}
                  >
                    <MenuTwoToneIcon />
                  </IconButton>

                  <Typography variant="body2" sx={{ mt: 0 }}>
                    More
                  </Typography>
                </ButtonBase>
              )}

              {/* LOGIN */}
              {!user?._id && (
                <Link href="/api/auth/signin" passHref legacyBehavior>
                  <ButtonBase
                    label="Login"
                    value="/api/auth/signin"
                    sx={{
                      flexDirection: "column",
                      justifyContent: "center",
                      alignItems: "center",
                      width: "33%",
                      height: "100%",
                      color: getColor("/api/auth/signin"),
                    }}
                  >
                    <IconButton
                      aria-label="close"
                      size="small"
                      value="/api/auth/signin"
                      sx={{ m: 0, padding: "0px", color: getColor("/api/auth/signin") }}
                    >
                      <LoginTwoToneIcon />
                    </IconButton>
                    <Typography variant="body2" sx={{ mt: 0 }}>
                      Login
                    </Typography>
                  </ButtonBase>
                </Link>
              )}

            </Paper>
          </AppBar>
        </Slide>
        <AccountMenuMobile open={open} setOpen={setOpen} />
      </div>
    );
  }
}
