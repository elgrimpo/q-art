"use client";
import { useState } from "react";
import {
  IconButton,
  Fab,
  Menu,
  MenuItem,
  Switch,
  FormControlLabel,
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
          <FormControlLabel
            control={
              <Switch
                checked={myCodesOnly}
                onChange={handleToggle}
                inputProps={{ role: "switch", "aria-label": "My codes" }}
              />
            }
            label="My codes"
          />
        </MenuItem>
      </Menu>
    </>
  );
}

export default AdminMyCodesMenu;
