'use client'

import React, { useRef } from "react";
import { Box, Dialog, Grow } from "@mui/material";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useSwipeable } from "react-swipeable";
import theme from "@/_styles/theme";

import ImageDetailContent from "../../images/[imageId]/ImageDetailContent";
import { useStore } from "@/store";

export default function ImageModal({
  open,
  images,
  setImages,
  index,
  handleClose,
  handleNext,
  handlePrevious,
  customLikeAction,
}) {
  const image = images[index];
  const isFullScreen = useMediaQuery(theme.breakpoints.down("md"));
  const { user } = useStore();
  const modalRef = useRef(null);

  const handlers = useSwipeable({
    onSwipedLeft: () => handleNext(),
    onSwipedRight: () => handlePrevious(),
    onSwipedDown: (eventData) => {
      const { deltaY } = eventData;
      const modalElement = modalRef.current;
      if (modalElement && Math.abs(deltaY) > 50 && modalElement.scrollTop === 0) {
        handleClose();
      }
    },
  });

  const customDeleteAction = () => {
    if (index > -1) {
      setImages([...images.slice(0, index), ...images.slice(index + 1)]);
    }
  };

  return (
    <Dialog
      fullScreen={isFullScreen}
      TransitionComponent={Grow}
      open={open}
      onClose={handleClose}
      slotProps={{
        backdrop: {
          sx: {
            backgroundColor: "rgba(255, 255, 255, 0.3)",
            backdropFilter: "blur(4px)",
          },
        },
      }}
      PaperProps={{
        sx: {
          bgcolor: "#161616",
          backgroundImage: "none",
          // The app-wide `.MuiDialog-paper { max-width: 80%; max-height: 80% }`
          // rule (globals.css) otherwise caps width AND breaks fullscreen — the
          // `&.MuiDialog-paper` selector outranks it for this dialog only.
          ...(isFullScreen
            ? { "&.MuiDialog-paper": { maxWidth: "100%", maxHeight: "100%" } }
            : {
                width: "90vw",
                height: "auto",
                borderRadius: "16px",
                "&.MuiDialog-paper": {
                  maxWidth: "1600px",
                  maxHeight: "calc(100vh - 40px)",
                },
              }),
        },
      }}
      {...handlers}
    >
      <Box
        ref={modalRef}
        sx={{
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          px: { xs: 2, md: 3 },
          pt: { xs: 0, md: 3 },
          pb: 3,
        }}
      >
        <ImageDetailContent
          image={image}
          user={user}
          onBack={handleClose}
          onPrev={handlePrevious}
          onNext={handleNext}
          customDeleteAction={customDeleteAction}
          customLikeAction={customLikeAction}
          fitHeight
        />
      </Box>
    </Dialog>
  );
}
