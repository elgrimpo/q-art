import Link from "next/link";
import { Box, Typography } from "@mui/material";

export default function Footer() {
  return (
    <Box
      component="footer"
      sx={{
        borderTop: "1px solid #2a2a2a",
        mt: 8,
        py: 4,
        px: { xs: 2, md: 4 },
        display: "flex",
        flexDirection: { xs: "column", sm: "row" },
        alignItems: { xs: "center", sm: "space-between" },
        justifyContent: "space-between",
        gap: 2,
        backgroundColor: "#161616",
        color: "#888",
        fontSize: "0.875rem",
      }}
    >
      <Typography sx={{ color: "#888", fontSize: "0.875rem" }}>
        &copy; {new Date().getFullYear()} QR AI. All rights reserved.
      </Typography>

      <Box
        component="nav"
        aria-label="footer navigation"
        sx={{ display: "flex", gap: 3, flexWrap: "wrap", justifyContent: "center" }}
      >
        <Link href="/generate" style={{ color: "#888", textDecoration: "none" }}>Generate</Link>
        <Link href="/explore" style={{ color: "#888", textDecoration: "none" }}>Explore</Link>
        <Link href="/how-it-works" style={{ color: "#888", textDecoration: "none" }}>How It Works</Link>
        <Link href="/blog" style={{ color: "#888", textDecoration: "none" }}>Blog</Link>
        <Link href="/pricing" style={{ color: "#888", textDecoration: "none" }}>Pricing</Link>
        <Link href="/faq" style={{ color: "#888", textDecoration: "none" }}>FAQ</Link>
        <Link href="/privacy" style={{ color: "#888", textDecoration: "none" }}>Privacy Policy</Link>
        <Link href="/terms" style={{ color: "#888", textDecoration: "none" }}>Terms of Service</Link>
      </Box>
    </Box>
  );
}
