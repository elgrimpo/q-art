import Link from "next/link";
import { Box, Typography, Button } from "@mui/material";

export const metadata = {
  title: "Blog — AI QR Code Tips, Guides & Inspiration | QR AI",
  description:
    "Tips, guides, and inspiration for creating AI-generated QR code artwork. Learn how to make the most of QR AI for your business, events, and creative projects.",
  alternates: {
    canonical: "https://www.qr-ai.co/blog",
  },
};

export default function BlogPage() {
  return (
    <Box sx={{ maxWidth: "860px", mx: "auto" }}>
      <Typography
        variant="h1"
        sx={{ fontSize: { xs: "2rem", md: "2.8rem" }, mb: 2 }}
      >
        QR AI Blog
      </Typography>
      <Typography component="p" sx={{ mb: 6, color: "text.secondary", fontSize: "1.1rem", lineHeight: 1.8 }}>
        Tips, guides, and inspiration for creating beautiful AI QR code artwork. Posts coming soon.
      </Typography>

      {/* Placeholder: upcoming posts */}
      <Box
        sx={{
          border: "1px solid",
          borderColor: "divider",
          borderRadius: 2,
          p: 4,
          backgroundColor: "background.paper",
          mb: 6,
        }}
      >
        <Typography variant="h2" color="primary" sx={{ fontSize: "1.3rem", mb: 2 }}>
          Coming soon
        </Typography>
        <Typography component="p" sx={{ lineHeight: 1.8, color: "text.secondary", mb: 3 }}>
          We&rsquo;re working on a series of guides to help you get the most out of QR AI:
        </Typography>
        <Box
          component="ul"
          sx={{ pl: 3, color: "text.muted", "& li": { mb: 1, lineHeight: 1.8 } }}
        >
          <li>How to make an AI QR code — a complete beginner&rsquo;s guide</li>
          <li>The best AI QR code styles for restaurants and cafés</li>
          <li>Do AI QR codes still scan? Everything you need to know</li>
          <li>AI QR codes for business cards — tips and templates</li>
          <li>How to create a QR code art piece for events and weddings</li>
        </Box>
      </Box>

      <Box sx={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
        <Link href="/how-it-works" passHref>
          <Button variant="outlined">How it works →</Button>
        </Link>
        <Link href="/gallery" passHref>
          <Button variant="outlined">View gallery →</Button>
        </Link>
        <Link href="/faq" passHref>
          <Button variant="outlined">FAQ →</Button>
        </Link>
      </Box>
    </Box>
  );
}
