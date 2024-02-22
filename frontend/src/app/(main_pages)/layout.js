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
  twitter: {
    card: 'summary_large_image',
    title: 'QR AI',
    description: 'Generate Art with QR Codes',
    images: ["https://qrartimages.s3.us-west-1.amazonaws.com/656e2d37e3aafee4354c812b.png"], 
  },
  openGraph: {
    image: "https://qrartimages.s3.us-west-1.amazonaws.com/656e2d37e3aafee4354c812b.png",
    title: "QR AI",
    description: "Generate Art with QR Codes",
    url: "https://qr-ai.co",
  }
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
