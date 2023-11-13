//Libraries imports
import { useTheme } from "@mui/material/styles";
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

// App imports
import SkeletonCard from "./SkeletonCard.js";
import { useImageUtils } from "../../utils/ImageUtils.js";
import { useGenerateUtils } from "../../utils/GenerateUtils.js";

function ImageCard(props) {
  const { variant, item, index, onClick, setTabValue, imageType } = props;

  const theme = useTheme();
  const { downloadImage, deleteImage, upscaleImage } = useImageUtils();
    // Upscaling
  const {copyGenerateFormValues} = useGenerateUtils()
  const [upscaling, setUpscaling] = useState(false);

  const primaryColor = theme.palette.primary.main;

  // -------- Actions ----------

  const handleCopy = (item) => {
    copyGenerateFormValues(item)
    setTabValue("1");
  };


  return (
    <Grid item md={2} key={index}>
      {" "}
      <Card
        elevation={0}
        key={index}
        sx={{
          padding: "1.2rem",
          backgroundColor: primaryColor,
          borderRadius: "5px",
        }}
        color="primary"
      >
        {variant === "skeleton" || upscaling ? (
          <SkeletonCard index={index} />
        ) : (
          <div>
            <CardMedia
              component="img"
              image={item?.image_url}
              sx={{ borderRadius: "5px" }}
              onClick={onClick}
              key={index}
            />

            <Stack
              direction="row"
              justifyContent="center"
              alignItems="center"
              spacing={3}
              sx={{ mt: "1rem" }}
              key={index + "_6"}
            >
              <Tooltip title="Download image">
                <IconButton
                  onClick={() => downloadImage(item)}
                  key={index + "_1"}
                >
                  <DownloadTwoToneIcon key={index} />
                </IconButton>
              </Tooltip>

              <Tooltip title="Copy data to generate similar image">
                <IconButton key={index + "_2"} onClick={() => handleCopy(item)}>
                  <ContentCopyIcon index={index} />
                </IconButton>
              </Tooltip>

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
