// Libraries imports
import React, { useState, useRef } from "react";
import {
  Dialog,
  List,
  ListItemText,
  Typography,
  Box,
  CardMedia,
  Stack,
  Skeleton,
} from "@mui/material";
import useMediaQuery from "@mui/material/useMediaQuery";
import theme from "../../styles/mui-theme";
import StyledIconButton from "../../components/StyledIconButton";
import { useSwipeable } from "react-swipeable";

//App imports
import { useImages } from "../../context/AppProvider";
import { useImageUtils } from "../../utils/ImageUtils";

/* -------------------------------------------------------------------------- */
/*                               COMPONENT START                              */
/* -------------------------------------------------------------------------- */

function ImagesModal(props) {
  const { userImages, communityImages, user } = useImages();

  /* ---------------------------- DECLARE VARIABLES --------------------------- */

  const { open, index, handleClose, handleNext, handlePrevious, imageType } =
    props;
  const isFullScreen = useMediaQuery(theme.breakpoints.down("md"));
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  // Image fuctions
  const { downloadImage, deleteImage, upscaleImage } = useImageUtils();

  // Upscaling (loading)
  const [upscaling, setUpscaling] = useState(false);

  const image =
    imageType === "userImages" ? userImages[index] : communityImages[index];

  // Ref for CardMedia component
  const modalRef = useRef(null);

  /* -------------------------------- FUNCTIONS ------------------------------- */

  const handlers = useSwipeable({
    // Other handlers for left, right, up, etc.
    onSwipedLeft: () => handleNext(),
    onSwipedRight: () => handlePrevious(),
    onSwipedDown: (eventData) => {
      const { deltaY } = eventData;
      const modalElement = modalRef.current; // Get the modal element by ID

      if (modalElement) {
        const modalTopPosition = modalElement.getBoundingClientRect().top;
        console.log(modalTopPosition);
        const sensitivity = 50; // Adjust this value based on your needs for swipe sensitivity

        if (Math.abs(deltaY) > sensitivity && modalTopPosition >= 0) {
          handleClose(); // Close the modal if swipe is mostly downward and at the top
        }
      }
    },
  });
  /* -------------------------------------------------------------------------- */
  /*                              COMPONENT RENDER                              */
  /* -------------------------------------------------------------------------- */

  return (
    /* -------------------------- MODAL SCREEN -------------------------- */

    <Dialog
      fullScreen={isMobile}
      maxWidth="xl"
      open={open}
      onClose={handleClose}
      fullWidth
      PaperProps={{ sx: { height: "100%" } }}
      {...handlers}
    >
      {/* ------------------------ NAVIGATION BUTTONS ----------------------- */}

      {/* PREVIOUS */}
      <Box
        sx={{
          position: "fixed",
          bottom: "50%",
          left: { xs: "1rem", md: "0.5rem" },
          zIndex: "2000",
        }}
      >
        <StyledIconButton
          variant="contained"
          color="secondary"
          type="previous"
          handleClick={handlePrevious}
        />
      </Box>

      {/* NEXT */}
      <Box
        sx={{
          position: "fixed",
          bottom: "50%",
          right: { xs: "1rem", md: "0.5rem" },
          zIndex: "2000",
        }}
      >
        <StyledIconButton
          variant="contained"
          color="secondary"
          type="next"
          handleClick={handleNext}
        />
      </Box>

      {/* CLOSE */}
      {isFullScreen && (
        <Box
          sx={{
            margin: { sx: "0rem", lg: "1rem" },
            position: "fixed",
            top: { xs: "0.5rem" },
            right: { xs: "0.5rem" },
            zIndex: "2000",
          }}
        >
          <StyledIconButton
            variant="contained"
            color="secondary"
            type="close"
            handleClick={handleClose}
          />
        </Box>
      )}

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
          {upscaling ? (
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
              image={image?.image_url}
              sx={{
                borderRadius: { md: "12px" },
                objectFit: "contain",
                maxWidth: "100%",
                maxHeight: "100%",
                width: "auto",
                height: "auto",
                aspectRatio: "1/1",
              }}
              ref={modalRef}
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
          {/* ------------------------------ ICON BUTTONS ------------------------------ */}
          <Stack
            direction="row"
            justifyContent={{ xs: "center", md: "left" }}
            alignItems="center"
            spacing={3}
            sx={{ mb: "1rem" }}
          >
            {/* DOWNLOAD */}
            <StyledIconButton
              variant="contained"
              color="secondary"
              type="download"
              handleClick={() => downloadImage(image)}
            />

            {/* UPSCALE */}
            {image?.width === 512 && imageType === "userImages" && (
              <StyledIconButton
                variant="contained"
                color="secondary"
                type="upscale"
                handleClick={() => upscaleImage(image._id, setUpscaling)}
              />
            )}

            {/* DELETE */}
            {image?.user_id === user._id && (
              <StyledIconButton
                variant="contained"
                color="secondary"
                type="delete"
                handleClick={() => deleteImage(image._id, index)}
              />
            )}
          </Stack>

          {/* -------------------------------- METADATA -------------------------------- */}
          <div style={{ maxHeight: "100%" }}>
            <Typography variant="h5" align={isMobile ? "center" : "left"}>
              Image Details
            </Typography>
            <List>
              <ListItemText
                primary="Date created"
                secondary={image?.created_at}
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
                primary="Negative prompt"
                secondary={image?.negative_prompt}
                align={isMobile ? "center" : "left"}
              />
              <ListItemText
                primary="Seed"
                secondary={image?.seed}
                align={isMobile ? "center" : "left"}
              />
              <ListItemText
                primary="Image Quality"
                secondary={`${image?.image_quality} (${image?.steps} sampling steps)`}
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
    </Dialog>
  );
}

export default ImagesModal;
