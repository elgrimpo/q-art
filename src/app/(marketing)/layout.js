import Link from "next/link";
import { Box, Container } from "@mui/material";
import Image from "next/image";

const navLinks = [
  { href: "/generate", label: "Generate" },
  { href: "/gallery", label: "Gallery" },
  { href: "/how-it-works", label: "How It Works" },
  { href: "/pricing", label: "Pricing" },
  { href: "/faq", label: "FAQ" },
];

function MarketingNav() {
  return (
    <Box
      component="header"
      sx={{
        position: "sticky",
        top: 0,
        zIndex: 500,
        backgroundColor: "#2a2a2a",
        borderBottom: "1px solid #333",
        px: { xs: 2, md: 4 },
        py: 1.5,
      }}
    >
      <Container maxWidth="xl" sx={{ display: "flex", alignItems: "center", gap: 3, p: "0 !important" }}>
        <Link href="/generate" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
          <Image src="/logo_light.png" alt="QR AI logo" width={32} height={32} />
          <span style={{ color: "#A5FFC3", fontWeight: 700, fontSize: "1.1rem" }}>QR AI</span>
        </Link>

        <Box component="nav" sx={{ display: "flex", gap: 2, ml: "auto", flexWrap: "wrap" }}>
          {navLinks.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              style={{ color: "#ccc", textDecoration: "none", fontSize: "0.9rem" }}
            >
              {label}
            </Link>
          ))}
        </Box>
      </Container>
    </Box>
  );
}

function MarketingFooter() {
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
        justifyContent: "space-between",
        alignItems: { xs: "center", sm: "center" },
        gap: 2,
        backgroundColor: "#161616",
        color: "#888",
        fontSize: "0.875rem",
      }}
    >
      <span>&copy; {new Date().getFullYear()} QR AI. All rights reserved.</span>
      <Box
        component="nav"
        aria-label="footer navigation"
        sx={{ display: "flex", gap: 3, flexWrap: "wrap", justifyContent: "center" }}
      >
        <Link href="/generate" style={{ color: "#888", textDecoration: "none" }}>Generate</Link>
        <Link href="/privacy" style={{ color: "#888", textDecoration: "none" }}>Privacy Policy</Link>
        <Link href="/terms" style={{ color: "#888", textDecoration: "none" }}>Terms of Service</Link>
        <a href="mailto:support@qr-ai.co" style={{ color: "#888", textDecoration: "none" }}>Contact</a>
      </Box>
    </Box>
  );
}

export default function MarketingLayout({ children }) {
  return (
    <div>
      <MarketingNav />
      <Container maxWidth="xl" sx={{ px: { xs: 2, md: 4 }, py: 4 }}>
        {children}
      </Container>
      <MarketingFooter />
    </div>
  );
}
