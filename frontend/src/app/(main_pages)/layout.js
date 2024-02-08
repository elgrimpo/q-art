// Libraries
import "../globals.css";
import { Container } from "@mui/material";

// App imports
import NavBar from "./NavBar";

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

      <NavBar />

      <div className="body">
        <Container
          maxWidth="xl"
          sx={{ padding: { xs: 0, sm: 0, md: 0, lg: 0, xl: 0 } }}
        >
          {children}
        </Container>
      </div>      
    </div>
  );
}
