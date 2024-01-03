// Libraries imports
import React, { useState, useRef } from "react";
import {
  Dialog,
  Button,
  DialogContentText,
  DialogTitle,
  DialogActions,
  List,
  ListItemText,
  Typography,
  Box,
  CardMedia,
  Stack,
  Skeleton,
  Grow,
  DialogContent,
  ToggleButton,
  ToggleButtonGroup,
  IconButton,
} from "@mui/material";
import useMediaQuery from "@mui/material/useMediaQuery";
import theme from "../../styles/mui-theme";
import StyledIconButton from "../../components/StyledIconButton";
import { useSwipeable } from "react-swipeable";
import dayjs from "dayjs";
import DiamondTwoToneIcon from "@mui/icons-material/DiamondTwoTone";

//App imports
import { useImages } from "../../context/AppProvider";
import { useImageUtils } from "../../utils/ImageUtils";
import { useUtils } from "../../utils/utils";

/* -------------------------------------------------------------------------- */
/*                               COMPONENT START                              */
/* -------------------------------------------------------------------------- */

function ImagesModal(props) {
  const { userImages, communityImages, user } = useImages();

  /* ---------------------------- DECLARE VARIABLES --------------------------- */

  const {
    open,
    index,
    handleClose,
    handleNext,
    handlePrevious,
    imageType,
    upscaling,
    setUpscaling,
  } = props;
  const isFullScreen = useMediaQuery(theme.breakpoints.down("md"));
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  // Image fuctions
  const { downloadImage, deleteImage, upscaleImage, upscaleDownload } =
    useImageUtils();
  const { calculateCredits } = useUtils();

  const image =
    imageType === "userImages" ? userImages[index] : communityImages[index];

  // Ref for CardMedia component
  const modalRef = useRef(null);

  // States for Download dialog
  const [downloadOpen, setDownloadOpen] = useState(false);
  const [resolution, setResolution] = useState(512);
  const [downloadCredits, setDownloadCredits] = useState(
    calculateCredits("download", resolution)
  );

  /* -------------------------------- FUNCTIONS ------------------------------- */
  // Open Download Dialog
  const handleDownloadOpen = () => {
    setResolution(image.width);
    setDownloadCredits(calculateCredits("download", image.width));
    setDownloadOpen(true);
  };

  // Close Download Dialog
  const handleDownloadClose = () => {
    setDownloadOpen(false);
  };

  // Change resolution in Download dialog
  const handleResolutionChange = (event, newResolution) => {
    if (newResolution !== null) {
      setResolution(newResolution);
      setDownloadCredits(calculateCredits("download", newResolution));
    }
  };

  const handleDownload = () => {
    setDownloadOpen(false);
    upscaleDownload(image, resolution, upscaling, setUpscaling);
  };

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

  /* -------------------------------------------------------------------------- */
  /*                              COMPONENT RENDER                              */
  /* -------------------------------------------------------------------------- */

  return (
    /* -------------------------- MODAL SCREEN -------------------------- */

    <Dialog
      fullScreen={isMobile}
      TransitionComponent={Grow}
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
          {upscaling.includes(image?._id) ? (
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
                pointerEvents: "none",
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
            {/* TODO: disable icon buttons when upscaling */}
            {/* DOWNLOAD */}
            <StyledIconButton
              variant="contained"
              color="secondary"
              type="download"
              handleClick={() => handleDownloadOpen()}
            />

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

      {/* ----------------------------- DOWNLOAD DIALOG ---------------------------- */}
      <Dialog open={downloadOpen} onClose={handleDownloadClose}>
        <DialogTitle>{"Download QR Image"}</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Upscale your image to a desired image resolution and download to
            your computer
          </DialogContentText>
          <ToggleButtonGroup
            color="secondary"
            value={resolution}
            exclusive
            onChange={handleResolutionChange}
            aria-label="Platform"
            sx={{ mt: 2 }}
          >
            <ToggleButton value={512} disabled={image?.width > 512}>
              512 x 512
            </ToggleButton>
            <ToggleButton value={1024} disabled={image?.width > 1024}>
              1024 x 1024
            </ToggleButton>
            <ToggleButton value={2048} disabled={image?.width > 2048}>
              2048 x 2048
            </ToggleButton>
            <ToggleButton value={4096} disabled={image?.width > 4096}>
              4096 x 4096
            </ToggleButton>
          </ToggleButtonGroup>

          <Typography sx={{ mt: 2 }}>
            Required credits: {downloadCredits}
            <IconButton size="small" color="secondary">
              <DiamondTwoToneIcon />
            </IconButton>
          </Typography>
        </DialogContent>
        <DialogActions sx={{ padding: "0rem 1rem 1rem 1rem" }}>
          <Button variant="outlined" onClick={handleDownloadClose}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={() => handleDownload(resolution)}
            autoFocus
          >
            Download ( {downloadCredits}
            <IconButton size="small" color="secondary">
              <DiamondTwoToneIcon />
            </IconButton>
            )
          </Button>
        </DialogActions>
      </Dialog>
    </Dialog>
  );
}

export default ImagesModal;
