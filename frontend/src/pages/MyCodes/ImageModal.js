// Libraries imports
import {
  Paper,
  Fab,
  Backdrop,
  List,
  ListItemText,
  Typography,
  Box,
  CardMedia,
} from "@mui/material";
import ChevronRightTwoToneIcon from "@mui/icons-material/KeyboardArrowRightTwoTone";
import ChevronLeftTwoToneIcon from "@mui/icons-material/ChevronLeftTwoTone";
import CloseTwoToneIcon from "@mui/icons-material/CloseTwoTone";
import useMediaQuery from "@mui/material/useMediaQuery";
import theme from "../../styles/mui-theme";

//App imports
import { useImages } from "../../context/AppProvider";

/* -------------------------------------------------------------------------- */
/*                               COMPONENT START                              */
/* -------------------------------------------------------------------------- */

function ImagesModal(props) {
  const { userImages, communityImages } = useImages();

  /* ---------------------------- DECLARE VARIABLES --------------------------- */

  const { open, index, handleClose, handleNext, handlePrevious, imageType } =
    props;
  const isFullScreen = useMediaQuery(theme.breakpoints.down("lg"));
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  const image =
    imageType === "userImages" ? userImages[index] : communityImages[index];

  /* -------------------------------------------------------------------------- */
  /*                              COMPONENT RENDER                              */
  /* -------------------------------------------------------------------------- */

  return (
    <Backdrop
      sx={{
        color: "#fff",
        width: "100%",
        zIndex: (theme) => theme.zIndex.drawer + 1,
      }}
      open={open}
      onClick={handleClose}
    >
      {/* ------------------------ NAVIGATION BUTTONS ----------------------- */}

      {/* PREVIOUS */}
      <Fab
        color="primary"
        aria-label="previous"
        size="medium"
        sx={{
          borderRadius: "20px",
          margin: "1rem",
          position: "absolute",
          bottom: { xs: "1rem", lg: "auto" },
          left: { xs: "1rem", lg: "0.5rem", xl: "0.5rem" },
          zIndex: "1",
        }}
        onClick={handlePrevious}
      >
        <ChevronLeftTwoToneIcon />
      </Fab>

      {/* NEXT */}
      <Fab
        color="primary"
        variant="circular"
        size="medium"
        aria-label="next"
        sx={{
          borderRadius: "20px",
          margin: "1rem",
          position: { xs: "absolute" },
          bottom: { xs: "1rem", lg: "auto" },
          right: { xs: "1rem", lg: "0.5rem", xl: "0.5rem" },
          zIndex: "1",
        }}
        onClick={handleNext}
      >
        <ChevronRightTwoToneIcon />
      </Fab>

      {/* CLOSE */}
      {isFullScreen && (
        <Fab
          color="primary"
          aria-label="close"
          size="medium"
          sx={{
            borderRadius: "20px",
            margin: "1rem",
            position: "absolute",
            bottom: { xs: "1rem" },
            left: { xs: "auto" },
            zIndex: "1",
          }}
          onClick={handleClose}
        >
          <CloseTwoToneIcon />
        </Fab>
      )}

      {/* -------------------------- MODAL SCREEN -------------------------- */}
      <Paper
        elevation={10}
        sx={{
          width: { xs: "100%", lg: "85%", xl: "90%" },
          maxWidth: "1400px",
          height: { xs: "100%", lg: "90%" },
          backgroundColor: "#ffffff",
          display: "flex",
          flexDirection: { xs: "column", md: "row" },
          borderRadius: { xs: "0px", lg: "16px" },
          overflowY: { xs: "scroll", md: "hidden" },
        }}
      >
        {/* ------------ Image ------------- */}
        <Box
          sx={{
            maxHeight: "100%",
            backgroundColor: "#70E195",
            display: "flex",
            borderRadius: { xs: "0px", lg: "16px 0px 0px 16px" },
            maxWidth: "100%",
            flex: { xs: "2", lg: "3" },
          }}
        >
          <Box
            sx={{
              objectFit: "fill",
              aspectRatio: "1/1",
              margin: "auto",
              padding: { xs: "0rem", md: "0rem", lg: "2rem" },
              borderRadius: { xs: "0px", lg: "16px" },
              width: "100%",
            }}
          >
            <CardMedia
              component="img"
              image={image?.image_url}
              sx={{
                zIndex: "1",

                objectFit: "fill",
                // aspectRatio: "1/1",
                borderRadius: { xs: "0px", lg: "16px" },
                width: "100%",
              }}
            />
          </Box>
        </Box>

        {/* ------------- Sidebar -------------- */}
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
      </Paper>
    </Backdrop>
  );
}

export default ImagesModal;
