"use client";

// Libraries imports
import React, { useState, useEffect } from "react";
import Image from "next/image";
import { AppBar, Container, Toolbar, Stack, Tab } from "@mui/material";
import useMediaQuery from "@mui/material/useMediaQuery";
import Link from "next/link";
import { usePathname } from "next/navigation";

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

  /* -------------------------------- FUNCTIONS ------------------------------- */

  /* -------------------------------------------------------------------------- */
  /*                              COMPONENT RENDER                              */
  /* -------------------------------------------------------------------------- */
  if (isMobile) {
  } else {
    return (
      <div>
        <AppBar
          sx={{ backgroundColor: "white", boxShadow: "none", zIndex: 500 }}
        >
          <Container
            maxWidth="xl"
            sx={{
              padding: { xs: 0, sm: 0, md: 0, lg: 0, xl: 0 },
            }}
          >
            <Toolbar display="flex" className="header">

              {/* LOGO */}
              <Image src="/logo.png" alt="Logo" width={40} height={40} />

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
            </Toolbar>
          </Container>
        </AppBar>
      </div>
    );
  }
}
