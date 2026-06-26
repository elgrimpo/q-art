"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Box, Container, Typography } from "@mui/material";
import Image from "next/image";

import Footer from "../(main_pages)/Footer";

const navLinks = [
  { href: "/generate", label: "Generate" },
  { href: "/gallery", label: "Gallery" },
  { href: "/how-it-works", label: "How It Works" },
  { href: "/pricing", label: "Pricing" },
  { href: "/faq", label: "FAQ" },
];

// Matches the uppercase nav-label treatment used in NavBarDesktop/Mobile
// (design/fontstyling.md "Navbar" spec): Inter 15px/600, letter-spaced
// uppercase, dim inactive / primary-green active.
function NavLink({ href, label }) {
  const pathname = usePathname();
  const active = pathname === href;

  return (
    <Link
      href={href}
      style={{
        textDecoration: "none",
        color: active ? "#70E195" : "rgba(255, 255, 255, 0.55)",
        fontWeight: 600,
        fontSize: "0.9375rem",
        letterSpacing: "0.03em",
        textTransform: "uppercase",
      }}
    >
      {label}
    </Link>
  );
}

function MarketingNav() {
  return (
    <Box
      component="header"
      sx={{
        position: "sticky",
        top: 0,
        zIndex: 500,
        backgroundColor: "background.paper",
        borderBottom: "1px solid",
        borderColor: "divider",
        px: { xs: 2, md: 4 },
        py: 1.5,
      }}
    >
      <Container maxWidth="xl" sx={{ display: "flex", alignItems: "center", gap: 3, p: "0 !important" }}>
        <Link href="/generate" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
          <Image src="/logo_light.png" alt="QR AI logo" width={32} height={32} />
          <Typography
            sx={{
              fontFamily: "var(--font-instrument-serif), serif",
              fontStyle: "italic",
              fontSize: "1.3rem",
              color: "primary.light",
            }}
          >
            QR AI
          </Typography>
        </Link>

        <Box component="nav" sx={{ display: "flex", gap: 3, ml: "auto", flexWrap: "wrap" }}>
          {navLinks.map((link) => (
            <NavLink key={link.href} {...link} />
          ))}
        </Box>
      </Container>
    </Box>
  );
}

export default function MarketingLayout({ children }) {
  return (
    <Box sx={{ display: "flex", flexDirection: "column", minHeight: "100vh", backgroundColor: "background.default" }}>
      <MarketingNav />
      <Container maxWidth="xl" sx={{ px: { xs: 2, md: 4 }, py: 4, flex: 1 }}>
        {children}
      </Container>
      <Footer />
    </Box>
  );
}
