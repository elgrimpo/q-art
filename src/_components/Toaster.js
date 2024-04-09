"use client";
// Libraries imports
import * as React from "react";
import { Snackbar, Alert, IconButton } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";

// App imports
import { useStore } from "@/store";
/* -------------------------------------------------------------------------- */
/*                               COMPONENT START                              */
/* -------------------------------------------------------------------------- */

export const Toaster = () => {
  /* ---------------------------- DECLARE VARIABLE ---------------------------- */

  // Contexts
  const {alert, closeAlert} = useStore()

  return (
    <Snackbar
      open={alert.open}
      anchorOrigin={{ vertical: "top", horizontal: "right" }}
      autoHideDuration={6000}
      onClose={closeAlert}
    >
      <Alert
        severity={alert.severity}
        sx={{ width: "100%" }}
        variant="filled"
        action={
          <IconButton
            aria-label="close"
            color="inherit"
            size="small"
            onClick={closeAlert}
          >
            <CloseIcon fontSize="inherit" />
          </IconButton>
        }
      >
        {alert.message}
      </Alert>
    </Snackbar>
  );
};
