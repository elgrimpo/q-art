//Libraries imports
import React, { useState } from "react";
import { Card, CardMedia, Grid, Stack, Chip } from "@mui/material";

import FavoriteTwoToneIcon from "@mui/icons-material/FavoriteTwoTone";
import FavoriteIcon from "@mui/icons-material/Favorite";

// App imports
import SkeletonCard from "./SkeletonCard.js";
import theme from "@/_styles/theme.js";
import { useImageUtils } from "@/_utils/ImageUtilss.js";
import ShareButton from "@/_components/actions/ShareButton.js";
import CopyButton from "@/_components/actions/CopyButton";
import { useStore } from "@/store.js";

/* -------------------------------------------------------------------------- */
/*                               COMPONENT START                              */
/* -------------------------------------------------------------------------- */

function ImageCard(props) {
  const { variant, item, index, handleCardClick, imageType, upscaling, images } = props;
  /* ---------------------------- DECLARE VARIABLES --------------------------- */

  const { user } = useStore();


  // Image fuctions
  const { likeImage } = useImageUtils();

  /* -------------------------------- FUNCTIONS ------------------------------- */


  // Check if image is liked by user
  const isLiked = item?.likes?.includes(user?._id) ? true : false;

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
        {variant === "skeleton" || upscaling.includes(item?._id) ? (
          <SkeletonCard index={index} key={index} />
        ) : (
          /* ------------------------------ IMAGE ------------------------------ */
          <div>
            <CardMedia
              component="img"
              image={item.image_url}
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

              {user._id && (
                <Chip
                  color="secondary"
                  variant="contained"
                  icon={
                    isLiked ? (
                      <FavoriteIcon sx={{ fill: "#FF8585" }} />
                    ) : (
                      <FavoriteTwoToneIcon color="primary" />
                    )
                  }
                  label={
                    item?.likes && item.likes.length > 0
                      ? item.likes.length
                      : "0"
                  }
                  sx={{
                    height: "40px",
                    borderRadius: "24px",
                    color: isLiked ? "#FF8585" : theme.palette.primary.main,
                  }}
                  onClick={() => likeImage(item, user._id, imageType)}
                  key={index + "_1"}
                />
              )}

              <CopyButton index={index} image={item} />

              <ShareButton index={index} image={item}/>
            </Stack>
          </div>
        )}
      </Card>
    </Grid>
  );
}

export default ImageCard;
