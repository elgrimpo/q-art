"use client";

// Libraries imports
import React from "react";
import Link from "next/link";
import {
  Avatar,
  Button,
  Chip,
  Box,
  MenuItem,
  Menu,
  Divider,
  IconButton,
  Tooltip,
} from "@mui/material";
import ListItemIcon from "@mui/material/ListItemIcon";
import DiamondTwoToneIcon from "@mui/icons-material/DiamondTwoTone";
import Logout from "@mui/icons-material/Logout";
import theme from "@/_styles/theme";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react"

// App import
import { useStore } from "@/store";

/* -------------------------------------------------------------------------- */
/*                               COMPONENT START                              */
/* -------------------------------------------------------------------------- */

export default function AccountMenuDesktop() {
  
  /* ---------------------------- DECLARE VARIABLE ---------------------------- */
  const router = useRouter();

  // User
  const user = useStore.getState().user;

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
    <div>
      {/* ACCOUNT */}
      {user?._id ? (
        <Box sx={{display: "flex", alignItems: "center", justifyContent: "center"}}>
          {/* -------------------------- USER CREDITS --------------------------- */}
          <Chip
            variant="outlined"
            icon={<DiamondTwoToneIcon sx={{color: theme.palette.primary.light}} />}
            label={user.credits}
            sx={{ height: "40px", borderRadius: "24px", color: theme.palette.primary.light, borderColor: theme.palette.primary.light, '& .MuiChip-icon': {color: theme.palette.primary.light} }}
          />
          <Box
            sx={{ display: "flex", alignItems: "center", textAlign: "center" }}
          >
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
            <MenuItem onClick={() => router.push("/profile")}>
              My account
            </MenuItem>
            <Divider />

            {/* LOGOUT */}
            <MenuItem onClick={()=>signOut()}>
              <ListItemIcon>
                <Logout fontSize="small" />
              </ListItemIcon>
              Logout
            </MenuItem>
          </Menu>
        </Box>
      ) : (
        <div>
          <Link
            href="/api/auth/signin"
            passHref
            legacyBehavior
          >
            <Button>Login</Button>
          </Link>
        </div>
      )}
    </div>
  );
}
