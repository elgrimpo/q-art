"use client";

//Libraries imports
import React, { useState, useEffect } from "react";
import { Chip } from "@mui/material";
import FavoriteTwoToneIcon from "@mui/icons-material/FavoriteTwoTone";
import FavoriteIcon from "@mui/icons-material/Favorite";
import * as amplitude from "@amplitude/analytics-browser";

// App imports
import { useStore } from "@/store";
import { likeImage } from "@/_utils/ImagesUtils";
import theme from "@/_styles/theme.js";

/* -------------------------------------------------------------------------- */
/*                               COMPONENT START                              */
/* -------------------------------------------------------------------------- */
export default function LikeButton(props) {
  const { image, user, customLikeAction } = props;
  const { openAlert } = useStore();

  // Check if image is liked by user
  const [likes, setLikes] = useState(image?.likes);
  const [isLiked, setIsLiked] = useState(
    likes?.some((like) => like?.userId === user?._id)
  );

  useEffect(() => {
    setLikes(image?.likes);
    setIsLiked(likes?.some((like) => like?.userId === user?._id));
  }, [image, user]);

  const handleLike = async () => {
    
    if (user?._id) {
      try {
        // Delete image from database
        await likeImage(image._id, user._id);
        amplitude.track("Unlike image");
        // Update likes
        let updatedLikes = [...(likes || [])];
        if (isLiked) {
          // Remove userId from likes
          updatedLikes = updatedLikes.filter(
            (like) => like.userId !== user._id
          );
          setIsLiked(false);
        } else {
          amplitude.track("Like image");
          // Add userId to likes
          updatedLikes.push({
            userId: user._id,
            time: new Date().toISOString(),
          });
          setIsLiked(true);
        }
        setLikes(updatedLikes);

        // Custom action (depending on specific page)
        if (customLikeAction) {
          customLikeAction(image._id, updatedLikes);
        }
      } catch (error) {
        // Toaster for error
        openAlert("error", "There was a problem with liking the image");
      }
    }
  };

  return (
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
      label={likes && likes.length > 0 ? likes.length : "0"}
      sx={{
        height: "40px",
        borderRadius: "24px",
        color: isLiked ? "#FF8585" : theme.palette.primary.main,
      }}
      onClick={() => handleLike()}
      key={image?._id}
    />
  );
}
