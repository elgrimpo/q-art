"use client";

//Libraries imports
import React, { useState } from "react";
import {
  Dialog,
  Button,
  DialogContentText,
  DialogTitle,
  DialogActions,
  Typography,
  DialogContent,
  ToggleButton,
  ToggleButtonGroup,
  IconButton,
} from "@mui/material";
import DiamondTwoToneIcon from "@mui/icons-material/DiamondTwoTone";
import * as amplitude from "@amplitude/analytics-browser";


// App imports
import { useStore } from "@/store";

import { calculateCredits } from "@/_utils/utils";
import StyledIconButton from "../StyledIconButton";
import { upscaleImage } from "@/_utils/ImagesUtils";

/* -------------------------------------------------------------------------- */
/*                               COMPONENT START                              */
/* -------------------------------------------------------------------------- */
export default function DownloadButton(props) {
  const { image, user } = props;
  const { openAlert, addImageProcessing, removeImageProcessing } = useStore();

  // States for Download dialog
  const [downloadOpen, setDownloadOpen] = useState(false);
  const [resolution, setResolution] = useState(512);
  const [downloadCredits, setDownloadCredits] = useState(
    calculateCredits({ download: !image?.downloaded })
  );

  /* -------------------------------- FUNCTIONS ------------------------------- */
  // Open Download Dialog
  const handleDownloadOpen = () => {
    setResolution(image.width);
    setDownloadCredits(calculateCredits({ download: !image.downloaded }));
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
      setDownloadCredits(
        calculateCredits({
          download: !image.downloaded,
          upscale: newResolution === image.width ? 0 : newResolution,
        })
      );
    }
  };

  const downloadImage = (upscaledImage) => {
    const link = document.createElement("a");

    // Append timestamp to the URL (to avoid downloading cached image)
    const timestamp = new Date().getTime(); 
    const imageUrlWithTimestamp = upscaledImage.image_url + '?t=' + timestamp;
    link.href = imageUrlWithTimestamp;
    link.download = "QR-art.png";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => {
        openAlert("success", "Image downloaded");
    }, 1000);
};

  const handleUpscaleDownload = async () => {

    addImageProcessing(image._id);
    openAlert("info", "Image is being prepared for download");

    try {
      amplitude.track("Download Image", {
        imageId: image._id,
        resolution: resolution,
      });
      // Upscale Image
      const upscaledImage = await upscaleImage(image._id, resolution, user._id);


      // Download Image
      downloadImage(upscaledImage);

    } catch (error) {
      // Toaster for error
      console.log(error)
      openAlert("error", "Error deleting image");
    }

    removeImageProcessing(image._id);
  };


  return (
    <div>
      {/* --------------------------------- BUTTON --------------------------------- */}
      <StyledIconButton
              variant="contained"
              color="secondary"
              type="download"
              handleClick={() => handleDownloadOpen()}
            />

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
            onClick={() => handleUpscaleDownload()}
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
    </div>
  );
}
