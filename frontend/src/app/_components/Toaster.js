"use client";
// Libraries imports
import * as React from "react";
import { Snackbar, Alert, IconButton } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";

// App imports
import { useImages } from "@/app/_context/AppProvider";
import { useUtils } from "@/app/_utils/utils";

/* -------------------------------------------------------------------------- */
/*                               COMPONENT START                              */
/* -------------------------------------------------------------------------- */

export const Toaster = () => {
  /* ---------------------------- DECLARE VARIABLE ---------------------------- */

  // Contexts
  const { alertOpen, alertSeverity, alertMessage } = useImages();

  // Utils functions
  const { closeAlert } = useUtils();

  return (
    <Snackbar
      open={alertOpen}
      anchorOrigin={{ vertical: "top", horizontal: "right" }}
      autoHideDuration={6000}
      onClose={closeAlert}
    >
      <Alert
        severity={alertSeverity}
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
        {alertMessage}
      </Alert>
    </Snackbar>
  );
};
