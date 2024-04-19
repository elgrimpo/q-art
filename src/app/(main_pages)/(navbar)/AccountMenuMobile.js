"use client";

// Libraries imports
import React from "react";
import Image from "next/image";
import {
  Chip,
  Box,
  Divider,
  Drawer,
  List,
  ListItem,
  ListItemText,
  ListItemButton,
  Typography,
} from "@mui/material";
import PersonOutlineTwoToneIcon from "@mui/icons-material/PersonOutlineTwoTone";
import ListItemIcon from "@mui/material/ListItemIcon";
import DiamondTwoToneIcon from "@mui/icons-material/DiamondTwoTone";
import Logout from "@mui/icons-material/Logout";
import theme from "@/_styles/theme";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";

// App import
import { useStore } from "@/store";

/* -------------------------------------------------------------------------- */
/*                               COMPONENT START                              */
/* -------------------------------------------------------------------------- */

export default function AccountMenuMobile(props) {
  /* ---------------------------- DECLARE VARIABLE ---------------------------- */

  const { open, setOpen } = props;
  const router = useRouter();

  const handleClose = () => {
    setOpen(false);
  };

  // User
  const user = useStore.getState().user;

  /* -------------------------------- FUNCTIONS ------------------------------- */

  /* -------------------------------------------------------------------------- */
  /*                              COMPONENT RENDER                              */
  /* -------------------------------------------------------------------------- */
  return (
    <Drawer open={open} onClose={handleClose} anchor="right">
      <Box sx={{ width: 250 }} role="presentation" onClick={handleClose}>
        {/* ------------------------------ APP AND LOGO ------------------------------ */}
        <List>
          <ListItem sx={{ mb: "0.5rem" }}>
            <Image src="/logo.png" alt="Logo" width={36} height={36} />
            <Typography variant="h5" sx={{ ml: "1rem" }}>
              QR AI
            </Typography>
          </ListItem>

          <Divider />

          {/* ------------------------------ USER DETAILS ------------------------------ */}
          <ListItem sx={{ mt: "0.5rem" }}>
            {/* USER NAME */}
            <Box>
              <Typography variant="h7">Logged in as</Typography>
              <Typography variant="h6">{user?.name}</Typography>
            </Box>
          </ListItem>

          {/* USER CREDITS */}
          <ListItem>
            <Chip
              color="primary"
              variant="outlined"
              icon={<DiamondTwoToneIcon />}
              label={user?.credits}
              sx={{ height: "40px", borderRadius: "24px", width: "100%" }}
            />
          </ListItem>
        </List>

        {/* ------------------------------- MENU ITEMS ------------------------------- */}
        <List>
          {/* MY ACCOUNT */}
          <ListItemButton onClick={() => router.push("/profile")}>
            <ListItemIcon>
              <PersonOutlineTwoToneIcon />
            </ListItemIcon>
            <ListItemText primary="My Account" />
          </ListItemButton>

          {/* LOGOUT */}
          <ListItemButton onClick={() => signOut()}>
            <ListItemIcon>
              <Logout />
            </ListItemIcon>
            <ListItemText primary="Logout" />
          </ListItemButton>
        </List>
      </Box>
    </Drawer>
  );
}
