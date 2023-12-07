//Libraries imports
import React, { useState } from "react";
import { Card, CardMedia, Grid, Stack, Chip } from "@mui/material";
import theme from "../../styles/mui-theme.js";
import { useNavigate } from "react-router-dom";
import FavoriteTwoToneIcon from "@mui/icons-material/FavoriteTwoTone";
import FavoriteIcon from "@mui/icons-material/Favorite";

// App imports
import SkeletonCard from "./SkeletonCard.js";
import { useImageUtils } from "../../utils/ImageUtils.js";
import { useGenerateUtils } from "../../utils/GenerateUtils.js";
import StyledIconButton from "../../components/StyledIconButton.js";
import { useImages } from "../../context/AppProvider.js";
/* -------------------------------------------------------------------------- */
/*                               COMPONENT START                              */
/* -------------------------------------------------------------------------- */

function ImageCard(props) {
  const { variant, item, index, onClick, imageType, upscaling } = props;

  /* ---------------------------- DECLARE VARIABLES --------------------------- */

  const { user } = useImages();

  // Initialize navigate function
  const navigate = useNavigate();

  // Image fuctions
  const { likeImage } = useImageUtils();

  // Copy Image function
  const { copyGenerateFormValues } = useGenerateUtils();


  /* -------------------------------- FUNCTIONS ------------------------------- */

  // Copy formvalues to generate new image
  const handleCopy = (item) => {
    copyGenerateFormValues(item);
    navigate("/generate");
  };

  // Check if image is liked by user
  const isLiked = item?.likes?.includes(user?._id) ? true : false;

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
          <SkeletonCard index={index} key={index}/>
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
              key={index + "_3"}
            >

              
              {/* LIKE */}

              {user._id &&
              <Chip
                color="secondary"
                variant="contained"
                icon={isLiked ? <FavoriteIcon sx={{fill: "#FF8585"}}/> : <FavoriteTwoToneIcon color="primary"/>}
                label={item?.likes && item.likes.length > 0 ? item.likes.length : "0"}
                sx={{ height: "40px", borderRadius: "24px", color: isLiked ? "#FF8585" : theme.palette.primary.main }}
                onClick={()=> likeImage(item, user._id, imageType)}
                key={index + "_1"}
              />}

              {/* COPY */}
              <StyledIconButton
                type="copy"
                variant="contained"
                color="secondary"
                tooltip="Copy data to generate similar image"
                handleClick={() => handleCopy(item)}
                key={index + "_2"}
              />
            </Stack>
          </div>
        )}
      </Card>
    </Grid>
  );
}

export default ImageCard;
