"use client";
import { useState } from "react";
import {
  IconButton,
  Fab,
  Menu,
  MenuItem,
} from "@mui/material";
import MoreVertIcon from "@mui/icons-material/MoreVert";

function AdminMyCodesMenu({ myCodesOnly, onToggle, trigger }) {
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);

  const handleOpen = (event) => setAnchorEl(event.currentTarget);
  const handleClose = () => setAnchorEl(null);

  const handleToggle = () => {
    onToggle(!myCodesOnly);
    handleClose();
  };

  return (
    <>
      {trigger === "fab" ? (
        <Fab
          size="small"
          color="primary"
          onClick={handleOpen}
          aria-label="Admin menu"
          sx={{
            position: "fixed",
            bottom: "92px",
            right: "16px",
            zIndex: "100",
          }}
        >
          <MoreVertIcon />
        </Fab>
      ) : (
        <IconButton
          size="large"
          color="primary"
          onClick={handleOpen}
          aria-label="Admin menu"
          sx={{ border: 1, borderColor: "divider" }}
        >
          <MoreVertIcon />
        </IconButton>
      )}

      <Menu anchorEl={anchorEl} open={open} onClose={handleClose}>
        <MenuItem disableRipple>
          <input
            type="checkbox"
            checked={myCodesOnly}
            onChange={handleToggle}
            role="switch"
            aria-label="My codes"
            style={{ marginRight: "8px" }}
          />
          <span>My codes</span>
        </MenuItem>
      </Menu>
    </>
  );
}

export default AdminMyCodesMenu;
