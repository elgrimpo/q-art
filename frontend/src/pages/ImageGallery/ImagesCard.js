//Libraries imports
import React, { useState } from "react";
import {
  Card,
  CardMedia,
  Grid,
  Stack,
} from "@mui/material";
import theme from "../../styles/mui-theme.js";
import { useNavigate } from "react-router-dom";

// App imports
import SkeletonCard from "./SkeletonCard.js";
import { useImageUtils } from "../../utils/ImageUtils.js";
import { useGenerateUtils } from "../../utils/GenerateUtils.js";
import StyledIconButton from "../../components/StyledIconButton.js";
/* -------------------------------------------------------------------------- */
/*                               COMPONENT START                              */
/* -------------------------------------------------------------------------- */

function ImageCard(props) {
  const { variant, item, index, onClick, imageType } = props;

  /* ---------------------------- DECLARE VARIABLES --------------------------- */

  // Initialize navigate function
  const navigate = useNavigate();

  // Image fuctions
  const { downloadImage, deleteImage, upscaleImage } = useImageUtils();

  // Copy Image function
  const { copyGenerateFormValues } = useGenerateUtils();

  // Upscaling (loading)
  const [upscaling, setUpscaling] = useState(false);

  /* -------------------------------- FUNCTIONS ------------------------------- */

  const handleCopy = (item) => {
    copyGenerateFormValues(item);
    navigate("/generate");
  };

  /* -------------------------------------------------------------------------- */
  /*                              COMPONENT RENDER                              */
  /* -------------------------------------------------------------------------- */

  return (
    <Grid item xs={1} key={index}>
      {" "}
      <Card
        elevation={0}
        key={index}
        sx={{
          padding: { xs: "0 0 1rem 0", md: "1.2rem" },
          backgroundColor: theme.palette.primary.main,
          borderRadius: "5px",
        }}
        color="primary"
      >
        {/* Skeleton (if loading) */}
        {variant === "skeleton" || upscaling ? (
          <SkeletonCard index={index} />
        ) : (
          /* ------------------------------ IMAGE ------------------------------ */
          <div>
            <CardMedia
              component="img"
              image={item?.image_url}
              sx={{ borderRadius: "5px" }}
              onClick={onClick}
              key={index}
            />

            {/* ------------------------------ ICONS ------------------------------ */}
            <Stack
              direction="row"
              justifyContent="center"
              alignItems="center"
              spacing={3}
              sx={{ mt: "1rem" }}
              key={index + "_6"}
            >
              {/* DOWNLOAD */}
              <StyledIconButton
                type="download"
                variant="contained"
                color="secondary"
                tooltip="Download image"
                handleClick={() => downloadImage(item)}
                key={index + "_1"}
              />

              {/* COPY */}
              <StyledIconButton
                type="copy"
                variant="contained"
                color="secondary"
                tooltip="Copy data to generate similar image"
                handleClick={() => handleCopy(item)}
                key={index + "_2"}
              />

              {/* DELETE */}
              {imageType === "userImages" && (
                <StyledIconButton
                  type="delete"
                  variant="contained"
                  color="secondary"
                  tooltip="Delete image"
                  handleClick={() => deleteImage(item._id, index)}
                  key={index + "_3"}
                />
              )}

              {/* UPSCALE */}
              {item.width === 512 && imageType === "userImages" && (
                <StyledIconButton
                  type="upscale"
                  variant="contained"
                  color="secondary"
                  tooltip="Upscale resolution to 1024 x 1024"
                  handleClick={() => upscaleImage(item._id, setUpscaling)}
                  key={index + "_4"}
                />
              )}
            </Stack>
          </div>
        )}
      </Card>
    </Grid>
  );
}

export default ImageCard;
