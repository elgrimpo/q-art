"use client";

//Libraries imports
import React from "react";
import * as amplitude from "@amplitude/analytics-browser";


// App imports
import StyledIconButton from "@/_components/StyledIconButton.js";
import { useStore } from "@/store";
import { deleteImage } from "@/_utils/ImagesUtils";

/* -------------------------------------------------------------------------- */
/*                               COMPONENT START                              */
/* -------------------------------------------------------------------------- */
export default function DeleteButton(props) {
  const { image, customDeleteAction } = props;
  const { openAlert } = useStore();

  const handleDelete = async (image) => {
    try {
      // Delete image from database
      amplitude.track("Delete Image")
      await deleteImage(image._id);

      // Toaster for successful deletion
      openAlert("success", "Image deleted successfully");

      // Custom action (depending on specific page)
      if (customDeleteAction) {
        customDeleteAction();
      }
    } catch (error) {
      // Toaster for error
      openAlert("error", "Error deleting image");
    }
  };

  return (
    <StyledIconButton
      type="delete"
      variant="contained"
      color="secondary"
      tooltip="Delete image"
      handleClick={() => handleDelete(image)}
    />
  );
}
