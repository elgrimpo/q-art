// Libraries imports
import React from "react";
import { Box } from "@mui/material";
import Link from "next/link";
import { redirect } from "next/navigation";

//App imports
import { getImageById } from "@/_utils/ImagesUtils";
import { getUserInfo } from "@/_utils/userUtils";
import StyledIconButton from "@/_components/StyledIconButton";
import ImageFill from "./ImageFill";
import ImageSidebar from "./ImageSidebar";

/* -------------------------------------------------------------------------- */
/*                               COMPONENT START                              */
/* -------------------------------------------------------------------------- */
export async function generateMetadata({ params }) {
  const { imageId } = params;
  const image = await getImageById(imageId);

  return {
    title: "QR AI",
    description: "Generate Art with QR Codes",
    twitter: {
      card: "summary_large_image",
      title: "QR AI",
      description: "Generate Art with QR Codes",
      images: [image?.watermarked_image_url],
    },
    openGraph: {
      images: [image?.watermarked_image_url],
      title: "QR AI",
      description: "Generate Art with QR Codes",
      url: "https://qr-ai.co",
    },
  };
}

export default async function ImagePage({ params }) {
  /* ---------------------------- DECLARE VARIABLES --------------------------- */
  const { imageId } = params;
  const image = await getImageById(imageId);
  const user = await getUserInfo();
  /* -------------------------------- FUNCTIONS ------------------------------- */

  const customDeleteAction = async () => {
    "use server";
    redirect("/generate");
  };
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

        <ImageSidebar
          image={image}
          user={user}
          customDeleteAction={customDeleteAction}
        />
      </Box>
    </Box>
  );
}
