'use client'
// Libraries imports
import React, { useRef } from "react";
import { Box, Dialog, Grow } from "@mui/material";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useSwipeable } from "react-swipeable";
import theme from "@/_styles/theme";

//App imports
import StyledIconButton from "@/_components/StyledIconButton";
import ImageFill from "../../images/[imageId]/ImageFill";
import ImageSidebar from "../../images/[imageId]/ImageSidebar";
import { useStore } from "@/store";

/* -------------------------------------------------------------------------- */
/*                               COMPONENT START                              */
/* -------------------------------------------------------------------------- */

export default function ImageModal(props) {
  /* ---------------------------- DECLARE VARIABLES --------------------------- */
  const {
    open,
    images,
    setImages,
    index,
    handleClose,
    handleNext, 
    handlePrevious, 
    customLikeAction
  } = props;
  const image = images[index];
  const isFullScreen = useMediaQuery(theme.breakpoints.down("md"));

  const { user } = useStore();
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
        const sensitivity = 50; // Adjust this value based on your needs for swipe sensitivity

        if (Math.abs(deltaY) > sensitivity && modalTopPosition >= 0) {
          handleClose(); // Close the modal if swipe is mostly downward and at the top
        }
      }
    },
  });

  const customDeleteAction = () => {
    if (index > -1) {

      // Remove image from array
      const updatedImages = [
        ...images.slice(0, index),
        ...images.slice(index + 1),
      ];
      setImages(updatedImages);
    }
  };

  /* -------------------------------------------------------------------------- */
  /*                              COMPONENT RENDER                              */
  /* -------------------------------------------------------------------------- */

  return (
    <Dialog
      fullScreen={isFullScreen}
      TransitionComponent={Grow}
      open={open}
      onClose={handleClose}
      sx={{
        margin: "auto",
        maxWidth: "1400px",
        "& .MuiDialog-paper": { 
          maxHeight: "100%",
          maxWidth: "100%" 
        }
      }}
      // PaperProps={{ sx: .MuiDialog-paper: { height: "100vh" } }}
      {...handlers}
    >
      {/* ------------------------ NAVIGATION BUTTON ----------------------- */}

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
        }}
      >
        {/* ------------ Image ------------- */}

        <ImageFill image={image} />

        {/* -------------------- Sidebar ------------------- */}

        <ImageSidebar
          image={image}
          user={user}
          customDeleteAction={customDeleteAction}
          customLikeAction={customLikeAction}
        />
      </Box>
    </Dialog>
  );
}
