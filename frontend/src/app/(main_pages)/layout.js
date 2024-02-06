// Libraries
import "../globals.css";
import { Container } from "@mui/material";

// App imports
import NavBar from "../components/NavBar";

/* -------------------------------------------------------------------------- */
/*                               COMPONENT START                              */
/* -------------------------------------------------------------------------- */

export const metadata = {
  title: "QR AI",
  description: "Generate Art with QR Codes",
};

export default function Layout({ children }) {
  /* ---------------------------- DECLARE VARIABLE ---------------------------- */


  /* -------------------------------------------------------------------------- */
  /*                              COMPONENT RENDER                              */
  /* -------------------------------------------------------------------------- */
  return (
    <div>
      {/* ------------------------------- NAVIGATION ------------------------------- */}

      <NavBar />

      {/* ------------------------------ APP BAR ----------------------------- */}

      {/* --------------------------- APP CONTENT -------------------------- */}

      <div className="body">
        <Container
          maxWidth="xl"
          sx={{ padding: { xs: 0, sm: 0, md: 0, lg: 0, xl: 0 } }}
        >
          {children}
        </Container>
      </div>

      {/* ---------------------------- SNACKBAR -------------------------- */}
      {/* <Snackbar
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
        </Snackbar> */}
    </div>
  );
}
