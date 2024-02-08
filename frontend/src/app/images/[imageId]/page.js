// Libraries imports
import React from "react";
import {
  List,
  ListItemText,
  Typography,
  Box,
  CardMedia,
  Skeleton,
} from "@mui/material";
import Link from "next/link";
import dayjs from "dayjs";

//App imports
import { getImageById } from "@/_utils/ImagesUtils";
import StyledIconButton from "../@/_components/StyledIconButton";
/* -------------------------------------------------------------------------- */
/*                               COMPONENT START                              */
/* -------------------------------------------------------------------------- */

async function ImagePage({ params }) {
  /* ---------------------------- DECLARE VARIABLES --------------------------- */
  // TODO: Put in
  const isMobile = false;
  // const { handleClose } = props;
  const { imageId } = params;

  // const [image, setImage] = useState({});

  /* -------------------------------- FUNCTIONS ------------------------------- */
  const image = await getImageById(imageId);

  /* -------------------------------------------------------------------------- */
  /*                              COMPONENT RENDER                              */
  /* -------------------------------------------------------------------------- */

  return (
    /* -------------------------- MODAL SCREEN -------------------------- */

    <Box sx={{ height: "100vh" }}>
      {/* ---------------------------- META TAGS --------------------------- */}
      {/* <Helmet>
        <meta property="og:image" content={image.image_url} />
        <meta name="twitter:image" content={image.image_url} />
        <meta property="twitter:card" content="summary_large_image" />
        {/* <!-- Primary Meta Tags --> 
        <meta name="title" content="QR AI" />
        <meta name="description" content="Create artsy QR Codes" />

        {/* <!-- Open Graph / Facebook --> 
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://www.qr-ai.co/" />
        <meta property="og:title" content="QR AI" />
        <meta property="og:description" content="Create artsy QR Codes" />
        <meta property="og:image" content={image.image_url} />

        {/* <!-- Twitter --> 
        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:url" content="https://www.qr-ai.co/" />
        <meta property="twitter:title" content="QR AI" />
        <meta property="twitter:description" content="Create artsy QR Codes" />
        <meta property="twitter:image" content={image.image_url} />
      </Helmet> */}

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
        <Box // Image Background fill
          sx={{
            height: "100%",
            width: "100%",
            backgroundColor: "#70E195",
            display: "flex",
            justifyContent: "center",
            padding: { xs: "0rem", md: "0rem", lg: "2rem" },
            flex: { xs: "2", lg: "3" },
          }}
        >
          {!image?.image_b64 ? (
            <Skeleton
              variant="rounded"
              animation="wave"
              sx={{
                borderRadius: { md: "12px" },
                objectFit: "contain",
                maxWidth: "100%",
                maxHeight: "100%",
                width: "auto",
                height: "auto",
                aspectRatio: "1/1",
              }}
            />
          ) : (
            <CardMedia
              component="img"
              image={`data:image/png;base64, ${image?.image_b64}`}
              sx={{
                borderRadius: { md: "12px" },
                objectFit: "contain",
                maxWidth: "100%",
                maxHeight: "100%",
                width: "auto",
                height: "auto",
                aspectRatio: "1/1",
                pointerEvents: "none",
              }}
            />
          )}
        </Box>

        {/* -------------------- Sidebar ------------------- */}

        <Box
          sx={{
            flex: "1",
            height: "100%",
            padding: "3rem",
            minWidth: "230px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            overflow: { md: "scroll" },
          }}
        >
          {/* -------------------------------- METADATA -------------------------------- */}
          <div style={{ maxHeight: "100%" }}>
            <Typography variant="h5" align={isMobile ? "center" : "left"}>
              Image Details
            </Typography>
            <List>
              <ListItemText
                primary="Date created"
                secondary={dayjs(image?.created_at).format("MMMM D, YYYY")}
                align={isMobile ? "center" : "left"}
              />
              <ListItemText
                primary="QR Content"
                secondary={image?.content}
                align={isMobile ? "center" : "left"}
              />
              <ListItemText
                primary="Prompt"
                secondary={image?.prompt}
                align={isMobile ? "center" : "left"}
              />
              <ListItemText
                primary="Style"
                secondary={image?.style_title}
                align={isMobile ? "center" : "left"}
              />
              <ListItemText
                primary="Seed"
                secondary={image?.seed}
                align={isMobile ? "center" : "left"}
              />
              <ListItemText
                primary="Image Dimensions"
                secondary={`${image?.width} x ${image?.height} px`}
                align={isMobile ? "center" : "left"}
              />
              <ListItemText
                primary="QR Code Weight"
                secondary={image?.qr_weight}
                align={isMobile ? "center" : "left"}
              />
              <ListItemText
                primary="Stable Diffusion Model"
                secondary={image?.sd_model}
                align={isMobile ? "center" : "left"}
              />
              <ListItemText
                primary="Image Id"
                secondary={image?._id}
                align={isMobile ? "center" : "left"}
              />
            </List>
          </div>
        </Box>
      </Box>
    </Box>
  );
}

export default ImagePage;
