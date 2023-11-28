//Libraries imports
import React, { useState } from "react";
import {
  Card,
  CardMedia,
  Grid,
  Stack,
  IconButton,
  Tooltip,
} from "@mui/material";
import DownloadTwoToneIcon from "@mui/icons-material/DownloadTwoTone";
import DeleteForeverTwoToneIcon from "@mui/icons-material/DeleteForeverTwoTone";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import DiamondTwoToneIcon from "@mui/icons-material/DiamondTwoTone";
import theme from "../../styles/mui-theme.js";
import { useNavigate } from "react-router-dom";

// App imports
import SkeletonCard from "./SkeletonCard.js";
import { useImageUtils } from "../../utils/ImageUtils.js";
import { useGenerateUtils } from "../../utils/GenerateUtils.js";

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
              <Tooltip title="Download image">
                <IconButton
                  onClick={() => downloadImage(item)}
                  key={index + "_1"}
                >
                  <DownloadTwoToneIcon key={index} />
                </IconButton>
              </Tooltip>

              {/* COPY */}
              <Tooltip title="Copy data to generate similar image">
                <IconButton key={index + "_2"} onClick={() => handleCopy(item)}>
                  <ContentCopyIcon index={index} />
                </IconButton>
              </Tooltip>

              {/* DELETE */}
              {imageType === "userImages" && (
                <Tooltip title="Delete image">
                  <IconButton
                    onClick={() => deleteImage(item._id, index)}
                    key={index + "_3"}
                  >
                    <DeleteForeverTwoToneIcon key={index} />
                  </IconButton>
                </Tooltip>
              )}

              {/* UPSCALE */}
              {item.width === 512 && imageType === "userImages" && (
                <Tooltip title="Upscale resolution to 1024 x 1024">
                  <IconButton
                    onClick={() => upscaleImage(item._id, setUpscaling)}
                    key={index + "_4"}
                  >
                    <DiamondTwoToneIcon key={index} />
                  </IconButton>
                </Tooltip>
              )}
            </Stack>
          </div>
        )}
      </Card>
    </Grid>
  );
}

export default ImageCard;
