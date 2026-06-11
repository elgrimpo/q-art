import { Box, Typography, CardMedia } from "@mui/material";

import GenerateForm from "./GenerateForm";
import GuestGallery from "./GuestGallery";

export const metadata = {
  title: "AI QR Code Art Generator – Create Beautiful QR Codes | QR AI",
  description:
    "Transform any URL into AI-generated QR code artwork. Free to try — enter your URL, pick a style, download your art QR code. No design skills needed.",
  alternates: {
    canonical: "https://www.qr-ai.co/generate",
  },
  openGraph: {
    title: "AI QR Code Art Generator | QR AI",
    description: "Transform QR codes into AI-generated artwork instantly.",
    url: "https://www.qr-ai.co/generate",
    siteName: "QR AI",
    type: "website",
  },
  twitter: {
    title: "AI QR Code Art Generator | QR AI",
    description:
      "Transform any URL into AI-generated QR code artwork. Free to try — no design skills needed.",
  },
};

export default function GeneratePage() {
  return (
    <Box
      sx={{
        width: "100%",
        maxWidth: "1600px",
        padding: { xs: "0rem 0rem 5rem 0rem", lg: "5rem 1rem" },
        backgroundColor: "#161616",
      }}
    >
      {/* Banner Section */}
      <Box className="BannerSection">
        {/* Gradient overlay */}
        <Box
          className="Gradient"
          sx={{
            width: { xs: "100%", lg: "90%" },
            zIndex: 2,
            height: { xs: "80%", sm: "100%" },
            pt: { xs: "100px", lg: "0px" },
            ml: { xs: "0px", lg: "24px" },
            background: {
              xs: "linear-gradient(0deg, rgba(22,22,22,1) 30%, rgba(22,22,22,0) 90%)",
              lg: "linear-gradient(90deg, rgba(22,22,22,1) 55%, rgba(22,22,22,0) 90%)",
            },
          }}
        />

        {/* Hero image */}
        <Box
          className="BannerImage"
          sx={{
            backgroundColor: "#A5FFC3",
            padding: { xs: "0.5rem", sm: "1rem" },
            paddingTop: { xs: "4.7rem", sm: "4.7rem", lg: "1rem" },
            width: { xs: "100vw", lg: "70%" },
            borderRadius: { xs: "0px", lg: "5px" },
            aspectRatio: "1/1",
            justifySelf: "end",
          }}
        >
          <CardMedia
            component="img"
            src="https://qrartimages.s3.us-west-1.amazonaws.com/654f3d47bef0549f910f70ca.png"
            sx={{
              borderRadius: "5px",
              aspectRatio: "1/1",
              zIndex: 1,
              order: 2,
            }}
          />
        </Box>

        {/* Form column — H1 is server-rendered for SEO; form hydrates on the client */}
        <Box
          className="GenerateForm"
          sx={{
            width: { xs: "100%", lg: "900px" },
            padding: "1rem",
            pt: { xs: "60%", lg: "10%" },
            zIndex: 3,
            left: { xs: "0px", lg: "1rem" },
            textAlign: { xs: "center", lg: "left" },
          }}
        >
          <Typography
            variant="h1"
            color="primary"
            sx={{ fontSize: { xs: "3rem", sm: "3rem", md: "5rem" } }}
          >
            AI QR Code Art Generator
          </Typography>

          <Box
            sx={{
              display: "flex",
              gap: 2,
              justifyContent: { xs: "center", lg: "flex-start" },
            }}
          >
            <GenerateForm />
          </Box>
        </Box>
      </Box>

      {/* Guest gallery — client component, only visible when user is a guest */}
      <GuestGallery />

      {/* SSR feature section — server-rendered, visible to crawlers */}
      <Box
        component="section"
        aria-label="features"
        sx={{
          mt: 8,
          px: { xs: 2, lg: 0 },
          maxWidth: "900px",
        }}
      >
        <Typography variant="h2" color="primary" sx={{ mb: 2 }}>
          Turn any URL into AI-generated artwork
        </Typography>
        <Typography
          component="p"
          sx={{ mb: 3, color: "#ccc", lineHeight: 1.8 }}
        >
          QR AI uses advanced Stable Diffusion and ControlNet AI models to
          transform plain QR codes into stunning works of art. Whether you&apos;re
          a business looking for eye-catching marketing materials, a restaurant
          wanting a unique menu QR code, or a creator who wants to share links
          in style — QR AI generates beautiful, fully scannable QR code artwork
          in seconds. No design skills required. Choose from dozens of artistic
          styles, from watercolor paintings to cyberpunk aesthetics, oil
          paintings to minimalist designs. Every QR code is optimized for all
          standard QR readers.
        </Typography>

        <Typography variant="h3" color="primary" sx={{ mb: 1 }}>
          How it works
        </Typography>
        <Box
          component="ul"
          sx={{ pl: 3, color: "#ccc", "& li": { mb: 1, lineHeight: 1.8 } }}
        >
          <li>
            Enter any URL — website, social profile, payment link, or WiFi
            credentials
          </li>
          <li>
            Pick an art style from dozens of curated presets, or let the AI
            surprise you
          </li>
          <li>
            Our AI generates a beautiful, fully scannable QR code artwork in
            seconds
          </li>
          <li>Download and share — or save to your personal gallery</li>
        </Box>
        <Typography
          component="p"
          sx={{ mt: 2, color: "#ccc", lineHeight: 1.8 }}
        >
          Perfect for restaurant menus, retail packaging, business cards, event
          posters, social media profiles, wedding invitations, and more. Free
          credits included to get started.
        </Typography>
      </Box>
    </Box>
  );
}
