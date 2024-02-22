"use client";

//Libraries imports
import React from "react";
import {
  FacebookShareButton,
  LinkedinShareButton,
  PinterestShareButton,
  RedditShareButton,
  TwitterShareButton,
  WhatsappShareButton,
} from "react-share";
import {
  FacebookIcon,
  LinkedinIcon,
  PinterestIcon,
  RedditIcon,
  WhatsappIcon,
  XIcon,
} from "react-share";
import { Menu, MenuItem, ListItemIcon, ListItemText } from "@mui/material";

// App imports
import StyledIconButton from "@/_components/StyledIconButton.js";

/* -------------------------------------------------------------------------- */
/*                               COMPONENT START                              */
/* -------------------------------------------------------------------------- */
export default function ShareButton(props) {
  const { index, image } = props;
  const [anchorEl, setAnchorEl] = React.useState(null);
  const open = Boolean(anchorEl);
  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };
  const handleClose = () => {
    setAnchorEl(null);
  };

  const shareUrl = `http://www.qr-ai.co/images/${image?._id}`;
  const shareTitle = `Check out my QR Code @qr-ai.co`;

  return (
    <div>
      <StyledIconButton
        type="share"
        variant="contained"
        color="secondary"
        tooltip="Copy data to generate similar image"
        handleClick={handleClick}
        key={index}
      />
      {/* ---------------------------------- MENU ---------------------------------- */}
      <Menu
        id="basic-menu"
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        MenuListProps={{
          "aria-labelledby": "basic-button",
        }}
        anchorOrigin={{
          vertical: "top",
          horizontal: "left",
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: "left",
        }}
      >
        {/* TWITTER / X */}

        <MenuItem onClick={handleClose}>
          <TwitterShareButton
            url={shareUrl}
            title={shareTitle}
            className="share-button"
            style={{
              display: "flex",
              width: "100%",
            }}
          >
            <ListItemIcon>
              <XIcon size={24} round={true} />
            </ListItemIcon>
            <ListItemText align="left">X</ListItemText>
          </TwitterShareButton>
        </MenuItem>

        {/* FACEBOOK */}

        <MenuItem onClick={handleClose}>
          <FacebookShareButton
            url={shareUrl}
            hashtag="#qr_ai"
            className="share-button"
            style={{
              display: "flex",
              width: "100%",
            }}
          >
            <ListItemIcon>
              <FacebookIcon size={24} round={true} />
            </ListItemIcon>
            <ListItemText align="left">Facebook</ListItemText>
          </FacebookShareButton>
        </MenuItem>

        {/* LinkedIn */}

        <MenuItem onClick={handleClose}>
          <LinkedinShareButton
            url={shareUrl}
            title={shareTitle}
            source="https://qr-ai.co"
            className="share-button"
            style={{
              display: "flex",
              width: "100%",
            }}
          >
            <ListItemIcon>
              <LinkedinIcon size={24} round={true} />
            </ListItemIcon>
            <ListItemText align="left">LinkedIn</ListItemText>
          </LinkedinShareButton>
        </MenuItem>

        {/* Reddit */}

        <MenuItem onClick={handleClose}>
          <RedditShareButton
            url={shareUrl}
            title={shareTitle}
            className="share-button"
            style={{
              display: "flex",
              width: "100%",
            }}
          >
            <ListItemIcon>
              <RedditIcon size={24} round={true} />
            </ListItemIcon>
            <ListItemText align="left">Reddit</ListItemText>
          </RedditShareButton>
        </MenuItem>

        {/* Whatsapp */}

        <MenuItem onClick={handleClose}>
          <WhatsappShareButton
            url={shareUrl}
            title={shareTitle}
            className="share-button"
            style={{
              display: "flex",
              width: "100%",
            }}
          >
            <ListItemIcon>
              <WhatsappIcon size={24} round={true} />
            </ListItemIcon>
            <ListItemText align="left">Whatsapp</ListItemText>
          </WhatsappShareButton>
        </MenuItem>
      </Menu>{" "}
    </div>
  );
}
