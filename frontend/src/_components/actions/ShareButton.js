'use client'

//Libraries imports
import React from "react";
import { TwitterShareButton } from "react-share";

// App imports
import StyledIconButton from "@/_components/StyledIconButton.js";

/* -------------------------------------------------------------------------- */
/*                               COMPONENT START                              */
/* -------------------------------------------------------------------------- */
export default function ShareButton(props) {

const {index, image} = props

  return (
    <TwitterShareButton
      url={`http://www.qr-ai.co/images/${image?._id}`}
      title="@qrai"
      className="twitter-share-button"
    >
      <StyledIconButton
        type="share"
        variant="contained"
        color="secondary"
        tooltip="Copy data to generate similar image"
        handleClick={() => {}}
        key={index + "_3"}
      />
    </TwitterShareButton>
  );
}
