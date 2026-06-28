import Image from "next/image";
import { Box, Typography } from "@mui/material";

import { palette } from "@/_styles/palette";
import GenerateForm from "./GenerateForm";
import UseCasesCarousel from "./UseCasesCarousel";

const softwareApplicationSchema = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "QR AI — AI QR Code Art Generator",
  applicationCategory: "DesignApplication",
  operatingSystem: "Web",
  url: "https://www.qr-ai.co/generate",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
  description:
    "Transform any URL into AI-generated QR code artwork. Enter your URL, pick an art style, and download a beautiful, fully scannable QR code in seconds.",
};

// ISR: re-render the static shell at most every hour.
// Only takes effect once getUserInfo() is moved out of the root layout (QRAI-18).
export const revalidate = 3600;

export const metadata = {
  title: "AI QR Code Art Generator – Create Beautiful QR Codes | QR AI",
  description:
    "Transform any URL into AI-generated QR code artwork. Free to try — enter your URL, pick a style, download your art QR code. No design skills needed.",
  alternates: {
    canonical: "https://www.qr-ai.co/generate",
  },
  // No openGraph/twitter override here on purpose: defining an openGraph object
  // would shallow-replace the root one and drop the site-wide opengraph-image.
  // og:title/og:description auto-populate from title/description above; og:image,
  // site_name, type and twitter.card are inherited from the root layout.
};

export default function GeneratePage() {
  return (
    <Box
      sx={{
        width: "100%",
        maxWidth: "1600px",
        padding: { xs: "0rem 0rem 5rem 0rem", lg: "5rem 1rem" },
        backgroundColor: palette.background.default,
      }}
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareApplicationSchema) }}
      />

      {/* Banner Section */}
      <Box id="generate-form-anchor" className="BannerSection">
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
              xs: `linear-gradient(0deg, ${palette.background.default} 30%, rgba(22,22,22,0) 90%)`,
              lg: `linear-gradient(90deg, ${palette.background.default} 45%, rgba(22,22,22,0) 90%)`,
            },
          }}
        />

        {/* Hero image — next/image auto-converts to WebP, generates srcset, preloads as LCP */}
        <Box
          className="BannerImage"
          sx={{
            position: "relative",
            backgroundColor: palette.primary.light,
            padding: { xs: "0.5rem", sm: "1rem" },
            paddingTop: { xs: "4.7rem", sm: "4.7rem", lg: "1rem" },
            width: { xs: "100vw", lg: "60%" },
            borderRadius: { xs: "0px", lg: "5px" },
            aspectRatio: "1/1",
            justifySelf: "end",
          }}
        >
          <Image
            src="https://qrartimages.s3.us-west-1.amazonaws.com/654f3d47bef0549f910f70ca.png"
            alt="Example AI-generated QR code artwork"
            fill
            sizes="(max-width: 1024px) 100vw, 70vw"
            priority
            style={{ borderRadius: "5px", objectFit: "cover" }}
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
            sx={{
              fontSize: { xs: "3rem", sm: "3rem", md: "5rem" },
              fontFamily: "var(--font-inter), Inter, sans-serif",
              fontWeight: 900,
              letterSpacing: "-0.03em",
            }}
          >
            Scannable{" "}
            <Box component="span" sx={{ color: "primary.main" }}>
              Art.
            </Box>
          </Typography>

          <Typography
            variant="h2"
            sx={{ fontSize: { xs: "1.5rem", sm: "2rem", md: "2.5rem" }, mt: 1, mb: 0 }}
          >
            Create beautiful QR codes people actually want to scan.
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

      {/* Use cases carousel — marketing section showing product placement examples */}
      <UseCasesCarousel />


</Box>
  );
}
