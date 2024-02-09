// Libraries imports
import React from "react";
import { Box } from "@mui/material";
import Link from "next/link";

//App imports
import { getImageById } from "@/_utils/ImagesUtils";
import { getUserInfo } from "@/_utils/userUtils";
import StyledIconButton from "@/_components/StyledIconButton";
import ImageFill from "./ImageFill";
import ImageSidebar from "./ImageSidebar";

/* -------------------------------------------------------------------------- */
/*                               COMPONENT START                              */
/* -------------------------------------------------------------------------- */

export default async function ImagePage({ params }) {
  /* ---------------------------- DECLARE VARIABLES --------------------------- */
  const { imageId } = params;
  /* -------------------------------- FUNCTIONS ------------------------------- */
  const image = await getImageById(imageId);
  const user = await getUserInfo();

  /* -------------------------------------------------------------------------- */
  /*                              COMPONENT RENDER                              */
  /* -------------------------------------------------------------------------- */

  return (
    <Box sx={{ height: "100vh" }}>
      {/* ------------------------ NAVIGATION BUTTON ----------------------- */}

      {/* CLOSE */}
      <Box
        sx={{
          margin: { sx: "0rem", lg: "1rem" },
          position: "fixed",
          top: { xs: "0.5rem" },
          right: { xs: "0.5rem" },
          zIndex: "2000",
        }}
      >
        <Link href="/generate">
          <StyledIconButton
            variant="contained"
            color="secondary"
            type="close"
          />
        </Link>
      </Box>

      {/* ----------------------------- DIALOG CONTENT ----------------------------- */}
      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", md: "row" },
          overflowY: { xs: "scroll", md: "hidden" },
          height: "100%",
        }}
      >
        {/* ------------ Image ------------- */}

        <ImageFill image={image} />

        {/* -------------------- Sidebar ------------------- */}

        <ImageSidebar image={image} user={user} />
      </Box>
    </Box>
  );
}
