// Libraries imports
import * as React from "react";
import Box from "@mui/material/Box";
import Avatar from "@mui/material/Avatar";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import ListItemIcon from "@mui/material/ListItemIcon";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import Chip from "@mui/material/Chip";
import Logout from "@mui/icons-material/Logout";
import DiamondTwoToneIcon from "@mui/icons-material/DiamondTwoTone";
import theme from "../../styles/mui-theme";

// App imports
import { useImages } from "../../context/AppProvider";

/* -------------------------------------------------------------------------- */
/*                               COMPONENT START                              */
/* -------------------------------------------------------------------------- */

export default function AccountMenu(props) {

  /* ---------------------------- DECLARE VARIABLES --------------------------- */
  
  // Props
  const { handleLogout } = props;

  // Context
  const { user } = useImages();

  // Anchor Element for Account Menu
  const [anchorEl, setAnchorEl] = React.useState(null);
  const open = Boolean(anchorEl);

  /* -------------------------------- FUNCTIONS ------------------------------- */

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };
  const handleClose = () => {
    setAnchorEl(null);
  };

  // Create Avatar icon
  function stringAvatar(user) {
    return {
      sx: {
        bgcolor: theme.palette.primary.main,
        height: 40,
        width: 40,
      },
      children: `${user.name.split(" ")[0][0]}${
        user.name.split(" ")[1] ? user.name.split(" ")[1][0] : ""
      }`,
    };
  }

  /* -------------------------------------------------------------------------- */
  /*                              COMPONENT RENDER                              */
  /* -------------------------------------------------------------------------- */

  return (
    <React.Fragment>

      {/* -------------------------- USER CREDITS --------------------------- */}
      <Chip color="primary"  icon={<DiamondTwoToneIcon/>} label={user.credits} />
      <Box sx={{ display: "flex", alignItems: "center", textAlign: "center" }}>
        <Tooltip title="Account settings">
          <IconButton
            onClick={handleClick}
            size="small"
            sx={{ ml: 2 }}
            aria-controls={open ? "account-menu" : undefined}
            aria-haspopup="true"
            aria-expanded={open ? "true" : undefined}
          >

            {/* ------------------------- USER ACCOUNT ------------------------- */}
            
            {/* AVATAR */}
            <Avatar {...stringAvatar(user)} />
          </IconButton>
        </Tooltip>
      </Box>

      {/* MENU */}
      <Menu
        anchorEl={anchorEl}
        id="account-menu"
        open={open}
        onClose={handleClose}
        onClick={handleClose}
        transformOrigin={{ horizontal: "right", vertical: "top" }}
        anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
      >

        {/* -------------------------- MENU ITEMS --------------------------- */}
        
        {/* MY ACCOUNT */}
        <MenuItem onClick={handleClose}>My account</MenuItem>
        <Divider />

        {/* LOGOUT */}
        <MenuItem onClick={handleLogout}>
          <ListItemIcon>
            <Logout fontSize="small" />
          </ListItemIcon>
          Logout
        </MenuItem>
      </Menu>
    </React.Fragment>
  );
}
