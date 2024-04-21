"use client";

// Libraries imports
import React, { useState, useEffect } from "react";
import Image from "next/image";
import { AppBar, Stack, Tab, Paper } from "@mui/material";
import Slide from "@mui/material/Slide";
import useMediaQuery from "@mui/material/useMediaQuery";
import Link from "next/link";
import { usePathname } from "next/navigation";
import useScrollTrigger from "@mui/material/useScrollTrigger";


// App Imports
import "@/app/globals.css";
import AccountMenuDesktop from "./AccountMenuDesktop";
import { useStore } from "@/store";
import theme from "@/_styles/theme";

/* -------------------------------------------------------------------------- */
/*                               COMPONENT START                              */
/* -------------------------------------------------------------------------- */

export default function NavBarDesktop() {
  /* ---------------------------- DECLARE VARIABLE ---------------------------- */
  // URL Path
  const pathname = usePathname();
  const [tabValue, setTabValue] = useState(1);

  // Change selected Tab based on URL path
  useEffect(() => {
    setTabValue(pathname);
  }, [pathname]);

  // Screen size
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  // Context variables
  const { user } = useStore();

    // Scroll trigger
    const trigger = useScrollTrigger();

  /* -------------------------------- FUNCTIONS ------------------------------- */

  /* -------------------------------------------------------------------------- */
  /*                              COMPONENT RENDER                              */
  /* -------------------------------------------------------------------------- */
  if (isMobile) {
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

            <Paper elevation={3}
              sx={{
                backgroundColor: "#3d3d3d",
                height: "60px",
                borderRadius: "8px",
                display: "flex",
                alignItems: "center",
                alignSelf: "center",
                padding: "0rem 1rem",
                width: "100%",
                maxWidth: "1500px"
                

              }}>

              {/* LOGO */}
              <Image src="/logo_light.png" alt="Logo" width={40} height={40} />

              {/* ---------------------------------- TABS ---------------------------------- */}

              <Stack
                justifyContent="center"
                sx={{
                  display: "flex",
                  zIndex: 1000,
                  flexGrow: 1,
                }}
                direction="row"
              >
                {!user?._id && (
                  <Link href="/" passHref legacyBehavior>
                    <Tab label="Home" value="/" selected={tabValue === "/"} />
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

              {/* ACCOUNT */}
              <AccountMenuDesktop user={user} />
            </Paper>
            </AppBar>
        </Slide>     
         </div>
    );
  }
}
