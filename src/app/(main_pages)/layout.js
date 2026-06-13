// Libraries
import "../globals.css";
import { Container } from "@mui/material";
import dynamic from "next/dynamic";

// App imports
// ssr:false prevents hydration mismatches — both navbars read Zustand state
// which persists across client navigations but is empty on the server.
const NavBarDesktop = dynamic(() => import("./(navbar)/NavBarDesktop"), { ssr: false });
const NavBarMobile = dynamic(() => import("./(navbar)/NavBarMobile"), { ssr: false });
import Footer from "./Footer";

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
    url: "https://www.qr-ai.co",
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
      <Footer />
      {auth}
    </div>
  );
}
