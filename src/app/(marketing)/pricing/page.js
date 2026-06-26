import Link from "next/link";
import { Box, Typography, Button } from "@mui/material";

export const metadata = {
  title: "Pricing — Free to Start, Credits for More | QR AI",
  description:
    "QR AI is free to try. Generate your first AI QR code with no sign-up required. Buy credits for more generations, downloads, and upscaling.",
  alternates: {
    canonical: "https://www.qr-ai.co/pricing",
  },
};

const creditActions = [
  { action: "Generate an AI QR code", credits: 1 },
  { action: "Download full-resolution image", credits: 10 },
  { action: "Upscale to 512 px", credits: 10 },
  { action: "Upscale to 1024 px", credits: 15 },
  { action: "Upscale to 2048 px", credits: 20 },
  { action: "Upscale to 4096 px (print quality)", credits: 25 },
];

const creditPacks = [
  { credits: 50, price: 5, perCredit: "10¢", label: "Starter" },
  { credits: 100, price: 9, perCredit: "9¢", label: "Creator", highlight: true },
  { credits: 250, price: 20, perCredit: "8¢", label: "Studio" },
];

export default function PricingPage() {
  return (
    <Box sx={{ maxWidth: "860px", mx: "auto", color: "#ccc" }}>
      <Typography
        variant="h1"
        sx={{ fontSize: { xs: "2rem", md: "2.8rem" }, mb: 2 }}
      >
        Pricing
      </Typography>
      <Typography component="p" sx={{ mb: 6, color: "#aaa", fontSize: "1.1rem", lineHeight: 1.8 }}>
        QR AI uses a credit-based system. You get free credits to start with no account required —
        just open the generator and create. Buy more credits when you need them. No subscriptions,
        no monthly fees. Credits never expire.
      </Typography>

      {/* Free tier */}
      <Box
        sx={{
          backgroundColor: "#1e1e1e",
          border: "1px solid #A5FFC3",
          borderRadius: 2,
          p: 4,
          mb: 6,
        }}
      >
        <Typography variant="h2" color="primary" sx={{ fontSize: "1.5rem", mb: 1 }}>
          Free tier
        </Typography>
        <Typography component="p" sx={{ color: "#aaa", lineHeight: 1.8, mb: 3 }}>
          Every guest (anonymous) session includes{" "}
          <strong style={{ color: "#fff" }}>free credits</strong> — no sign-up, no credit card
          required. Sign in with Google to keep your gallery and transfer any images you created as a
          guest to your account.
        </Typography>
        <Box sx={{ display: "flex", gap: 2 }}>
          <Link href="/generate" passHref>
            <Button variant="contained">Try for free</Button>
          </Link>
        </Box>
      </Box>

      {/* Credit packs */}
      <Typography variant="h2" color="primary" sx={{ fontSize: "1.5rem", mb: 3 }}>
        Credit packs
      </Typography>
      <Typography component="p" sx={{ mb: 4, color: "#aaa", lineHeight: 1.8 }}>
        Credits are one-time purchases. They&rsquo;re deducted when you generate images, download
        full-resolution files, or upscale. Purchased credits never expire.
      </Typography>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr 1fr" },
          gap: 3,
          mb: 8,
        }}
      >
        {creditPacks.map((pack) => (
          <Box
            key={pack.label}
            sx={{
              backgroundColor: pack.highlight ? "#1e2e1e" : "#1e1e1e",
              border: pack.highlight ? "2px solid #A5FFC3" : "1px solid #333",
              borderRadius: 2,
              p: 3,
              textAlign: "center",
              position: "relative",
            }}
          >
            {pack.highlight && (
              <Box
                sx={{
                  position: "absolute",
                  top: -12,
                  left: "50%",
                  transform: "translateX(-50%)",
                  backgroundColor: "#A5FFC3",
                  color: "#161616",
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  px: 2,
                  py: 0.5,
                  borderRadius: 1,
                  whiteSpace: "nowrap",
                }}
              >
                Most popular
              </Box>
            )}
            <Typography sx={{ fontSize: "1rem", color: "#888", mb: 1 }}>{pack.label}</Typography>
            <Typography sx={{ fontSize: "2.5rem", fontWeight: 800, color: "#A5FFC3", lineHeight: 1 }}>
              ${pack.price}
            </Typography>
            <Typography sx={{ fontSize: "1.1rem", color: "#fff", mt: 1, mb: 0.5 }}>
              {pack.credits} credits
            </Typography>
            <Typography sx={{ fontSize: "0.85rem", color: "#666", mb: 3 }}>
              {pack.perCredit} per credit
            </Typography>
            <Link href="/generate" passHref>
              <Button
                variant={pack.highlight ? "contained" : "outlined"}
                fullWidth
                size="small"
              >
                Get started
              </Button>
            </Link>
          </Box>
        ))}
      </Box>

      {/* Credit usage table */}
      <Typography variant="h2" color="primary" sx={{ fontSize: "1.5rem", mb: 3 }}>
        How credits are used
      </Typography>
      <Box
        sx={{
          border: "1px solid #333",
          borderRadius: 2,
          overflow: "hidden",
          mb: 8,
        }}
      >
        {creditActions.map((row, idx) => (
          <Box
            key={row.action}
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              px: 3,
              py: 2,
              borderBottom: idx < creditActions.length - 1 ? "1px solid #2a2a2a" : "none",
              backgroundColor: idx % 2 === 0 ? "#1a1a1a" : "#161616",
            }}
          >
            <Typography sx={{ color: "#ccc" }}>{row.action}</Typography>
            <Typography sx={{ color: "#A5FFC3", fontWeight: 700, minWidth: "80px", textAlign: "right" }}>
              {row.credits} {row.credits === 1 ? "credit" : "credits"}
            </Typography>
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
            <Typography component="h3" sx={{ color: "#fff", fontWeight: 600, mb: 1 }}>
              Do I need an account to try QR AI?
            </Typography>
            <Typography component="p" sx={{ color: "#aaa", lineHeight: 1.8 }}>
              No. Guest sessions are fully anonymous and come with free credits. You can generate,
              preview, and download images without creating an account. Sign in with Google to save
              your gallery and access purchased credits across devices.
            </Typography>
          </Box>

          <Box>
            <Typography component="h3" sx={{ color: "#fff", fontWeight: 600, mb: 1 }}>
              Do credits expire?
            </Typography>
            <Typography component="p" sx={{ color: "#aaa", lineHeight: 1.8 }}>
              Purchased credits never expire. Guest session credits are tied to the browser session and
              will not carry over if you clear cookies without signing in first.
            </Typography>
          </Box>

          <Box>
            <Typography component="h3" sx={{ color: "#fff", fontWeight: 600, mb: 1 }}>
              Can I get a refund?
            </Typography>
            <Typography component="p" sx={{ color: "#aaa", lineHeight: 1.8 }}>
              Credits are non-refundable, except as required by applicable law. If you experience a
              technical issue that consumes credits without delivering a result, contact us at{" "}
              <a href="mailto:support@qr-ai.co" style={{ color: "#A5FFC3" }}>
                support@qr-ai.co
              </a>{" "}
              and we&rsquo;ll make it right.
            </Typography>
          </Box>
        </Box>
      </Box>

      <Box sx={{ textAlign: "center", py: 4, borderTop: "1px solid #333" }}>
        <Typography variant="h3" color="primary" sx={{ mb: 2, fontSize: "1.4rem" }}>
          Start with free credits — no sign-up required
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
