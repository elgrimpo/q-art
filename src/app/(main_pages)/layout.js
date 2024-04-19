// Libraries
import "../globals.css";
import { Container } from "@mui/material";

// App imports
import NavBarDesktop from "./(navbar)/NavBarDesktop";
import NavBarMobile from "./(navbar)/NavBarMobile";

/* -------------------------------------------------------------------------- */
/*                               COMPONENT START                              */
/* -------------------------------------------------------------------------- */

export const metadata = {
  title: "QR AI",
  description: "Generate Art with QR Codes",
  twitter: {
    card: "summary_large_image",
    title: "QR AI",
    description: "Generate Art with QR Codes",
    images: [
      "https://qrartimages.s3.us-west-1.amazonaws.com/656e2d37e3aafee4354c812b.png",
    ],
  },
  openGraph: {
    images: [
      "https://qrartimages.s3.us-west-1.amazonaws.com/656e2d37e3aafee4354c812b.png",
    ],
    title: "QR AI",
    description: "Generate Art with QR Codes",
    url: "https://qr-ai.co",
  },
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
      {auth}
    </div>
  );
}
