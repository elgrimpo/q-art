import Image from "next/image";
import Link from "next/link";
import { Box, Typography, Button, Grid } from "@mui/material";

export const metadata = {
  title: "AI QR Code Art Gallery — Examples and Inspiration | QR AI",
  description:
    "Browse AI-generated QR code artwork created with Stable Diffusion. See examples across Ukiyo-e, Low Poly, Watercolor, Oil Painting, and more styles.",
  alternates: {
    canonical: "https://www.qr-ai.co/gallery",
  },
};

const galleryImages = [
  {
    url: "https://qrartimages.s3.us-west-1.amazonaws.com/654f34f6bef0549f910f70a5.png",
    alt: "AI-generated QR code artwork in a colorful expressionist style with bold brushstrokes",
    style: "Expressionism",
  },
  {
    url: "https://qrartimages.s3.us-west-1.amazonaws.com/64cda0d622cec9423f676916.png",
    alt: "AI-generated QR code artwork with a dreamy, ethereal glow and soft pastel colors",
    style: "Dreamy",
  },
  {
    url: "https://qrartimages.s3.us-west-1.amazonaws.com/65513586f4adf8ea932b06a7.png",
    alt: "AI-generated QR code artwork with vibrant photography-inspired cinematic composition",
    style: "Photography",
  },
  {
    url: "https://qrartimages.s3.us-west-1.amazonaws.com/658693d768084531da6282fb.png",
    alt: "AI-generated QR code artwork in traditional Ukiyo-e Japanese woodblock print style",
    style: "Ukiyo-e",
  },
  {
    url: "https://qrartimages.s3.us-west-1.amazonaws.com/65d7d2aef7ebe3fe4491aab8.png",
    alt: "AI-generated QR code artwork in soft watercolor style with translucent washes of color",
    style: "Watercolor",
  },
  {
    url: "https://qrartimages.s3.us-west-1.amazonaws.com/65a167cad076ab86bf56ac89.png",
    alt: "AI-generated QR code artwork in geometric low-poly art style with faceted shapes",
    style: "Low Poly Art",
  },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "ItemList",
  "name": "AI QR Code Art Gallery",
  "description": "Examples of AI-generated QR code artwork created with Stable Diffusion and ControlNet.",
  "url": "https://www.qr-ai.co/gallery",
  "itemListElement": galleryImages.map((image, idx) => ({
    "@type": "ListItem",
    "position": idx + 1,
    "item": {
      "@type": "ImageObject",
      "contentUrl": image.url,
      "name": `AI QR Code Art — ${image.style} Style`,
      "description": image.alt,
      "creator": {
        "@type": "Organization",
        "name": "QR AI",
        "url": "https://www.qr-ai.co",
      },
    },
  })),
};

export default function GalleryPage() {
  return (
    <Box sx={{ color: "#ccc" }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Typography
        variant="h1"
        color="primary"
        sx={{ fontSize: { xs: "2rem", md: "2.8rem" }, mb: 2 }}
      >
        AI QR Code Art Gallery
      </Typography>
      <Typography component="p" sx={{ mb: 6, color: "#aaa", fontSize: "1.1rem", lineHeight: 1.8, maxWidth: "760px" }}>
        Every image below is a real, scannable QR code transformed into a piece of artwork by QR AI.
        Each was generated using Stable Diffusion 1.5 with ControlNet — a fully functional QR code
        hidden inside the art. Browse examples across a range of styles for inspiration.
      </Typography>

      {/* Gallery grid */}
      <Grid container spacing={3} sx={{ mb: 8 }}>
        {galleryImages.map((image, idx) => (
          <Grid item key={idx} xs={12} sm={6} md={4}>
            <Box
              sx={{
                borderRadius: 2,
                overflow: "hidden",
                backgroundColor: "#A5FFC3",
                aspectRatio: "1/1",
                position: "relative",
              }}
            >
              <Image
                src={image.url}
                alt={image.alt}
                fill
                sizes="(max-width: 600px) 100vw, (max-width: 960px) 50vw, 33vw"
                style={{ objectFit: "cover" }}
              />
            </Box>
            <Typography
              sx={{ mt: 1, color: "#888", fontSize: "0.85rem", textAlign: "center" }}
            >
              Style: {image.style}
            </Typography>
          </Grid>
        ))}
      </Grid>

      {/* Art styles section */}
      <Box sx={{ maxWidth: "860px", mb: 8 }}>
        <Typography variant="h2" color="primary" sx={{ fontSize: "1.6rem", mb: 3 }}>
          Available art styles
        </Typography>
        <Typography component="p" sx={{ mb: 3, lineHeight: 1.8 }}>
          QR AI currently offers 13 curated art styles, each powered by a specific combination of
          Stable Diffusion checkpoint and LoRA weights. You can also combine any style with your own
          custom text prompt to guide the artwork further.
        </Typography>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr 1fr", sm: "1fr 1fr 1fr", md: "repeat(4, 1fr)" },
            gap: 1.5,
            mb: 3,
          }}
        >
          {[
            "Ukiyo-e", "Expressionism", "Dreamy", "Low Poly Art",
            "Photography", "Vector Art", "Doodle Art", "Ink",
            "Oil Painting", "Chinese Art", "Watercolor", "Sticker", "Color Blend",
          ].map((style) => (
            <Box
              key={style}
              sx={{
                backgroundColor: "#2a2a2a",
                border: "1px solid #333",
                borderRadius: 1,
                px: 2,
                py: 1,
                fontSize: "0.875rem",
                color: "#ccc",
                textAlign: "center",
              }}
            >
              {style}
            </Box>
          ))}
        </Box>
        <Typography component="p" sx={{ lineHeight: 1.8, color: "#aaa" }}>
          New styles are added regularly. All styles produce fully scannable QR codes with
          Error Correction Level H, meaning up to 30% of the code pattern can be artistic while
          remaining readable by standard QR scanners.
        </Typography>
      </Box>

      {/* Use cases */}
      <Box sx={{ maxWidth: "860px", mb: 8 }}>
        <Typography variant="h2" color="primary" sx={{ fontSize: "1.6rem", mb: 3 }}>
          What people use AI QR code art for
        </Typography>
        <Box
          component="ul"
          sx={{ pl: 3, "& li": { mb: 1.5, lineHeight: 1.8 } }}
        >
          <li><strong>Restaurant and café menus</strong> — replace plain menu QR codes with something that matches your brand aesthetic</li>
          <li><strong>Business cards and marketing materials</strong> — make your contact QR code memorable and distinctive</li>
          <li><strong>Event posters and invitations</strong> — wedding RSVPs, concert tickets, and event details with beautiful art QR codes</li>
          <li><strong>Social media profiles</strong> — create a unique link-in-bio QR code that reflects your personal brand</li>
          <li><strong>Product packaging and retail</strong> — eye-catching QR codes that customers actually want to scan</li>
          <li><strong>Portfolio and creative projects</strong> — showcase your work with QR codes that are themselves art</li>
        </Box>
      </Box>

      <Box sx={{ textAlign: "center", py: 4, borderTop: "1px solid #333" }}>
        <Typography variant="h3" color="primary" sx={{ mb: 2, fontSize: "1.4rem" }}>
          Create your own AI QR code artwork
        </Typography>
        <Link href="/generate" passHref>
          <Button variant="contained" size="large">
            Start generating — free credits included
          </Button>
        </Link>
      </Box>
    </Box>
  );
}
