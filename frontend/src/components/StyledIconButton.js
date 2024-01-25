import React from "react";
import { Tooltip, IconButton } from "@mui/material";
import theme from "../styles/mui-theme";
import CloseTwoToneIcon from "@mui/icons-material/CloseTwoTone";
import DownloadTwoToneIcon from "@mui/icons-material/DownloadTwoTone";
import ChevronRightTwoToneIcon from "@mui/icons-material/KeyboardArrowRightTwoTone";
import ChevronLeftTwoToneIcon from "@mui/icons-material/ChevronLeftTwoTone";
import DiamondTwoToneIcon from "@mui/icons-material/DiamondTwoTone";
import DeleteForeverTwoToneIcon from "@mui/icons-material/DeleteForeverTwoTone";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import FavoriteTwoToneIcon from "@mui/icons-material/FavoriteTwoTone";
import ShareTwoToneIcon from '@mui/icons-material/ShareTwoTone';

/* -------------------------------------------------------------------------- */
/*                               COMPONENT START                              */
/* -------------------------------------------------------------------------- */

function StyledIconButton(props) {
  /* ---------------------------- DECLARE VARIABLES --------------------------- */

  const { variant, color, type, handleClick, tooltip, disabled } = props;

  /* -------------------------------- FUNCTIONS ------------------------------- */

  const getIcon = () => {
    if (type === "download") {
      return <DownloadTwoToneIcon />;
    } else if (type === "copy") {
      return <ContentCopyIcon />;
    } else if (type === "delete") {
      return <DeleteForeverTwoToneIcon />;
    } else if (type === "upscale") {
      return <DiamondTwoToneIcon />;
    } else if (type === "close") {
      return <CloseTwoToneIcon />;
    } else if (type === "previous") {
      return <ChevronLeftTwoToneIcon />;
    } else if (type === "next") {
      return <ChevronRightTwoToneIcon />;
    } else if (type === "like") {
      return <FavoriteTwoToneIcon />;
    } else if (type === "share") {
      return <ShareTwoToneIcon />;
    } else {
      return null;
    }
  };

  const getFillColor = () => {
    if (variant === "outlined") {
      return null;
    } else if (variant === "contained") {
      if (color === "primary") {
        return theme.palette.primary.main;
      } else if (color === "secondary") {
        return theme.palette.secondary.main;
      }
    } else {
      return null;
    }
  };

  const getBorderColor = () => {
    if (variant === "contained") {
      return null;
    } else if (variant === "outlined") {
      if (color === "primary") {
        return theme.palette.primary.dark;
      } else if (color === "secondary") {
        return theme.palette.secondary.main;
      }
    } else {
      return null;
    }
  };

  const getIconColor = () => {
    if (variant === "outlined") {
      if (color === "primary") {
        return theme.palette.primary.dark;
      } else if (color === "secondary") {
        return theme.palette.secondary.main;
      }
    } else if (variant === "contained") {
      if (color === "primary") {
        return theme.palette.secondary.main;
      } else if (color === "secondary") {
        return theme.palette.primary.main;
      }
    } else {
      return null;
    }
  };

  /* -------------------------------------------------------------------------- */
  /*                              COMPONENT RENDER                              */
  /* -------------------------------------------------------------------------- */
  return (
    <Tooltip title={tooltip}>
      <IconButton
        sx={{
          backgroundColor: getFillColor(),
          width: "40px",
          height: "40px",
          border: `${getBorderColor()} 1px solid`,
          color: getIconColor(),
          "&:hover": {
            backgroundColor: getFillColor(),
          },
        }}
        disabled={disabled}
        onClick={(e) => handleClick(e)}
      >
        {getIcon()}
      </IconButton>
    </Tooltip>
  );
}

export default StyledIconButton;
