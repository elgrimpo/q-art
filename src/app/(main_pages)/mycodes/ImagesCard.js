//Libraries imports
import React from "react";
import { Card, CardMedia, Grid, Stack } from "@mui/material";

// App imports
import SkeletonCard from "./SkeletonCard.js";
import theme from "@/_styles/theme.js";
import ShareButton from "@/_components/actions/ShareButton.js";
import CopyButton from "@/_components/actions/CopyButton";
import LikeButton from "@/_components/actions/LikeButton.js";
import { useStore } from "@/store.js";

/* -------------------------------------------------------------------------- */
/*                               COMPONENT START                              */
/* -------------------------------------------------------------------------- */

function ImageCard(props) {
  /* ---------------------------- DECLARE VARIABLES --------------------------- */
  const { variant, image, index, handleCardClick, customLikeAction } = props;

  const { user, processingImages } = useStore();

  const isImageProcessing = processingImages.includes(image?._id);

  /* -------------------------------- FUNCTIONS ------------------------------- */

  // Prevent right click for image download
  const preventRightClick = (event) => {
    event.preventDefault();
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
        {variant === "skeleton" || isImageProcessing ? (
          <SkeletonCard index={index} key={index} />
        ) : (
          /* ------------------------------ IMAGE ------------------------------ */
          <div>
            <CardMedia
              component="img"
              image={image.watermarked_image_url}
              sx={{ borderRadius: "5px" }}
              onClick={handleCardClick}
              onContextMenu={(e) => preventRightClick(e)}
              key={index}
            />

            {/* ------------------------------ ICONS ------------------------------ */}
            <Stack
              direction="row"
              justifyContent="center"
              alignItems="center"
              spacing={3}
              sx={{ mt: "1rem" }}
              key={index + "_3"}
            >
              {/* LIKE */}

              <LikeButton
                image={image}
                user={user}
                customLikeAction={customLikeAction}
              />
              {user?._id && <CopyButton index={index} image={image} />}

              <ShareButton index={index} image={image} />
            </Stack>
          </div>
        )}
      </Card>
    </Grid>
  );
}

export default ImageCard;
