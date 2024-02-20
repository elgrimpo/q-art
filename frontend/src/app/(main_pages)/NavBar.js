import "server-only";

// Libraries imports
import React from "react";
import Image from "next/image";
import { AppBar, Container, Button, Toolbar, Box } from "@mui/material";
import ImageTwoToneIcon from "@mui/icons-material/ImageTwoTone";
import Diversity1TwoToneIcon from "@mui/icons-material/Diversity1TwoTone";
import useMediaQuery from "@mui/material/useMediaQuery";
// App Imports
import { getUserInfo } from "@/_utils/userUtils";
import "../globals.css";
import Tabs from "./Tabs";
import Account from "./AccountMenu";

/* -------------------------------------------------------------------------- */
/*                               COMPONENT START                              */
/* -------------------------------------------------------------------------- */

export default async function NavBar() {
  /* ---------------------------- DECLARE VARIABLE ---------------------------- */

  // Utils functions
  const user = await getUserInfo();

  /* -------------------------------- FUNCTIONS ------------------------------- */

  /* -------------------------------------------------------------------------- */
  /*                              COMPONENT RENDER                              */
  /* -------------------------------------------------------------------------- */
  return (
    /* --------------------------- MOBILE NAVIGATION --------------------------- */
    <div>
      <AppBar sx={{ backgroundColor: "white", boxShadow: "none", zIndex: 500 }}>
        <Tabs />
        <Container
          maxWidth="xl"
          sx={{
            padding: { xs: 0, sm: 0, md: 0, lg: 0, xl: 0 },
          }}
        >
          <Toolbar display="flex" className="header">
            {/* LOGO */}
            <Image src="/logo.png" alt="Logo" />
            <Box sx={{ flexGrow: 1 }}></Box>

            {/* ACCOUNT */}
            <Account user={user} />
          </Toolbar>
        </Container>
      </AppBar>
    </div>
  );
}
