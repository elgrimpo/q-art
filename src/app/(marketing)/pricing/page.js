import Link from "next/link";
import { Box, Typography, Button } from "@mui/material";

export const metadata = {
  title: "Pricing — Generate Free, Unlock HD for $3.99 | QR AI",
  description:
    "QR AI is free to try — generate and preview AI QR codes with no sign-up. Only pay when you love one: unlock a high-resolution, watermark-free download for $3.99. No subscriptions.",
  alternates: {
    canonical: "https://www.qr-ai.co/pricing",
  },
};

const unlockPerks = [
  "High-resolution, print-ready image",
  "Watermark removed",
  "Yours to use personally and commercially",
  "One-time payment — no subscription, no credits to track",
];

const steps = [
  { n: "01", t: "Generate for free", d: "Open the generator, enter a URL, pick a style, and create — no account or card required." },
  { n: "02", t: "Preview every result", d: "Browse your generations and see exactly how each one looks before you decide. Previews are free." },
  { n: "03", t: "Unlock the one you love", d: "Found a winner? Pay $3.99 once to unlock the high-res, watermark-free download of that image." },
];

export default function PricingPage() {
  return (
    <Box sx={{ maxWidth: "860px", mx: "auto" }}>
      <Typography
        variant="h1"
        sx={{ fontSize: { xs: "2rem", md: "2.8rem" }, mb: 2 }}
      >
        Simple pricing
      </Typography>
      <Typography component="p" sx={{ mb: 6, color: "text.secondary", fontSize: "1.1rem", lineHeight: 1.8 }}>
        Generating and previewing AI QR codes is free — no sign-up, no credit card. You only pay
        when you find one you want to keep. No subscriptions, no monthly fees, no credits to manage.
      </Typography>

      {/* Two-card layout: Free vs Unlock */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
          gap: 3,
          mb: 8,
        }}
      >
        {/* Free */}
        <Box
          sx={{
            backgroundColor: "background.paper",
            border: "1px solid",
            borderColor: "divider",
            borderRadius: 2,
            p: 4,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <Typography variant="h2" color="primary" sx={{ fontSize: "1.5rem", mb: 1 }}>
            Generate &amp; preview
          </Typography>
          <Typography sx={{ fontSize: "2.5rem", fontWeight: 800, color: "primary.light", lineHeight: 1, mb: 2 }}>
            Free
          </Typography>
          <Typography component="p" sx={{ color: "text.secondary", lineHeight: 1.8, mb: 3, flexGrow: 1 }}>
            Create AI QR codes and preview every result at no cost. No account needed — sign in with
            Google only if you want to save your gallery across devices.
          </Typography>
          <Link href="/generate" passHref>
            <Button variant="outlined" fullWidth>Try for free</Button>
          </Link>
        </Box>

        {/* Unlock */}
        <Box
          sx={{
            backgroundColor: "background.elevated",
            border: "2px solid",
            borderColor: "primary.light",
            borderRadius: 2,
            p: 4,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <Typography variant="h2" color="primary" sx={{ fontSize: "1.5rem", mb: 1 }}>
            Unlock HD
          </Typography>
          <Box sx={{ display: "flex", alignItems: "baseline", gap: 1, mb: 2 }}>
            <Typography sx={{ fontSize: "2.5rem", fontWeight: 800, color: "primary.light", lineHeight: 1 }}>
              $3.99
            </Typography>
            <Typography sx={{ color: "text.muted", fontSize: "0.95rem" }}>per image</Typography>
          </Box>
          <Box component="ul" sx={{ pl: 2.5, mb: 3, flexGrow: 1, "& li": { mb: 1, lineHeight: 1.7, color: "text.secondary" } }}>
            {unlockPerks.map((perk) => (
              <li key={perk}>{perk}</li>
            ))}
          </Box>
          <Link href="/generate" passHref>
            <Button variant="contained" fullWidth>Start creating</Button>
          </Link>
        </Box>
      </Box>

      {/* How it works */}
      <Typography variant="h2" color="primary" sx={{ fontSize: "1.5rem", mb: 3 }}>
        How it works
      </Typography>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 3, mb: 8 }}>
        {steps.map((s) => (
          <Box key={s.n} sx={{ display: "flex", gap: 3, alignItems: "flex-start" }}>
            <Typography sx={{ fontSize: "1.6rem", fontWeight: 800, color: "primary.light", minWidth: 40, lineHeight: 1.2 }}>
              {s.n}
            </Typography>
            <Box>
              <Typography component="h3" sx={{ color: "text.primary", fontWeight: 600, mb: 0.5 }}>
                {s.t}
              </Typography>
              <Typography component="p" sx={{ color: "text.secondary", lineHeight: 1.8 }}>
                {s.d}
              </Typography>
            </Box>
          </Box>
        ))}
      </Box>

      {/* FAQ section */}
      <Box sx={{ mb: 8 }}>
        <Typography variant="h2" color="primary" sx={{ fontSize: "1.5rem", mb: 3 }}>
          Common questions
        </Typography>

        <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
          <Box>
            <Typography component="h3" sx={{ color: "text.primary", fontWeight: 600, mb: 1 }}>
              Do I need to pay to try QR AI?
            </Typography>
            <Typography component="p" sx={{ color: "text.secondary", lineHeight: 1.8 }}>
              No. Generating AI QR codes and previewing the results is completely free, with no
              account required. You only pay if you decide to unlock a high-resolution download.
            </Typography>
          </Box>

          <Box>
            <Typography component="h3" sx={{ color: "text.primary", fontWeight: 600, mb: 1 }}>
              What does the $3.99 unlock include?
            </Typography>
            <Typography component="p" sx={{ color: "text.secondary", lineHeight: 1.8 }}>
              A one-time $3.99 payment unlocks the high-resolution, watermark-free version of that
              specific image, ready to download and use — including for commercial projects like
              menus, packaging, invitations, and posters.
            </Typography>
          </Box>

          <Box>
            <Typography component="h3" sx={{ color: "text.primary", fontWeight: 600, mb: 1 }}>
              Is it a subscription?
            </Typography>
            <Typography component="p" sx={{ color: "text.secondary", lineHeight: 1.8 }}>
              No. There are no subscriptions, monthly fees, or credit bundles. You pay per image,
              only for the ones you choose to unlock.
            </Typography>
          </Box>

          <Box>
            <Typography component="h3" sx={{ color: "text.primary", fontWeight: 600, mb: 1 }}>
              What if an image doesn&rsquo;t work after I unlock it?
            </Typography>
            <Typography component="p" sx={{ color: "text.secondary", lineHeight: 1.8 }}>
              If a technical issue prevents you from getting the image you paid for, let us know and
              we&rsquo;ll make it right. We always recommend previewing a result and testing that it
              scans before unlocking.
            </Typography>
          </Box>
        </Box>
      </Box>

      <Box sx={{ textAlign: "center", py: 4, borderTop: "1px solid", borderColor: "divider" }}>
        <Typography variant="h3" color="primary" sx={{ mb: 2, fontSize: "1.4rem" }}>
          Generate for free — pay only when you love it
        </Typography>
        <Link href="/generate" passHref>
          <Button variant="contained" size="large">
            Open the generator
          </Button>
        </Link>
      </Box>
    </Box>
  );
}
