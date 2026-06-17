// Libraries
import "../globals.css";
import { Container } from "@mui/material";

// App imports
import NavBarDesktop from "./(navbar)/NavBarDesktop";
import NavBarMobile from "./(navbar)/NavBarMobile";
import Footer from "./Footer";

/* -------------------------------------------------------------------------- */
/*                               COMPONENT START                              */
/* -------------------------------------------------------------------------- */

// OG/Twitter images intentionally NOT set here. The hardcoded 1.5 MB S3 PNG that
// used to live here (wrong MIME, far too heavy) is replaced by the site-wide
// branded generator at src/app/opengraph-image.js, inherited via metadataBase.
// Each child page sets its own title/description; these are only fallbacks.
export const metadata = {
  title: "QR AI",
  description: "Generate Art with QR Codes",
};

export default function Layout({ children, auth }) {
  /* ---------------------------- DECLARE VARIABLE ---------------------------- */

  /* -------------------------------------------------------------------------- */
  /*                              COMPONENT RENDER                              */
  /* -------------------------------------------------------------------------- */
  return (
    <div>
      <NavBarDesktop />
      <NavBarMobile />

      <div className="body">
        <Container
          maxWidth="xl"
          sx={{ padding: { xs: 0, sm: 0, md: 0, lg: 0, xl: 0 } }}
        >
          {children}
        </Container>
      </div>
      <Footer />
      {auth}
    </div>
  );
}
