// Libraries imports
import {
  Paper,
  Backdrop,
  IconButton,
  List,
  ListItemText,
  Typography,
} from "@mui/material";
import ChevronRightTwoToneIcon from "@mui/icons-material/KeyboardArrowRightTwoTone";
import ChevronLeftTwoToneIcon from "@mui/icons-material/ChevronLeftTwoTone";

//App imports
import { useImages } from "../../context/AppProvider";

function ImagesModal(props) {
  const { userImages } = useImages();
  const { open, index, handleClose, handleNext, handlePrevious } = props;
  const image = userImages[index];

  return (
    <Backdrop
      sx={{ color: "#fff", zIndex: (theme) => theme.zIndex.drawer + 1 }}
      open={open}
      onClick={handleClose}
    >
      <IconButton
        sx={{
          borderRadius: "20px",
          backgroundColor: "#70E195",
          margin: "1rem",
        }}
        onClick={handlePrevious}
      >
        <ChevronLeftTwoToneIcon />
      </IconButton>
      <Paper
        elevation={10}
        sx={{
          width: "80%",
          maxWidth: "1200px",
          height: "80%",
          backgroundColor: "#ffffff",
          display: "flex",
          flexDirection: "row",
          borderRadius: "16px",
        }}
      >
        <div
          style={{
            height: "100%",
            aspectRatio: "1/1",
            backgroundColor: "#70E195",
            display: "flex",
            borderRadius: "16px 0px 0px 16px",
          }}
        >
          <img
            src={image?.image_url}
            style={{
              height: "90%",
              objectFit: "contain",
              margin: "auto",
              borderRadius: "16px",
            }}
          />
        </div>
        <div
          style={{
            height: "100%",
            padding: "3rem",
            boxSizing: "border-box",
            display: "flex",
            flexDirection: "column",
            overflow: "scroll",
          }}
        >
          <Typography variant="h5" align="left">
            Image Details
          </Typography>
          <List>
            <ListItemText
              primary="Date created"
              secondary={image?.created_at}
            />
            <ListItemText primary="QR Content" secondary={image?.content} />
            <ListItemText primary="Prompt" secondary={image?.prompt} />
            <ListItemText
              primary="Negative prompt"
              secondary={image?.negative_prompt}
            />
            <ListItemText primary="Seed" secondary={image?.seed} />
            <ListItemText
              primary="Image Quality"
              secondary={`${image?.image_quality} (${image?.steps} sampling steps)`}
            />
            <ListItemText
              primary="Image Dimensions"
              secondary={`${image?.width} x ${image?.height} px`}
            />
            <ListItemText
              primary="QR Code Weight"
              secondary={image?.qr_weight}
            />
            <ListItemText
              primary="Stable Diffusion Model"
              secondary={image?.sd_model}
            />
            <ListItemText
              primary="Image Id"
              secondary={image?._id}
            />
          </List>
        </div>
      </Paper>
      <IconButton
        sx={{
          borderRadius: "20px",
          backgroundColor: "#70E195",
          margin: "1rem",
        }}
        onClick={handleNext}
      >
        <ChevronRightTwoToneIcon />
      </IconButton>
    </Backdrop>
  );
}

export default ImagesModal;
