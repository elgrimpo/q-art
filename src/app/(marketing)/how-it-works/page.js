import Link from "next/link";
import Image from "next/image";
import { Box, Typography, Button } from "@mui/material";
import { ICONS, heroSteps, steps, tips } from "./content";

export const metadata = {
  title: "How AI QR Codes Work — Step-by-Step Guide | QR AI",
  description:
    "Learn how QR AI transforms any URL into AI-generated QR code artwork using Stable Diffusion and ControlNet. A step-by-step guide with tips for best results.",
  alternates: {
    canonical: "https://www.qr-ai.co/how-it-works",
  },
};

function StepBadgeStrip() {
  return (
    <Box
      sx={{
        display: { xs: "none", sm: "flex" },
        alignItems: "center",
        justifyContent: "center",
        mb: 8,
      }}
    >
      {heroSteps.map((label, i) => (
        <Box key={label} sx={{ display: "flex", alignItems: "center" }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Box
              sx={{
                width: 28,
                height: 28,
                borderRadius: "50%",
                border: "2px solid",
                borderColor: "primary.main",
                color: "primary.main",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 700,
                fontSize: "0.9rem",
                flexShrink: 0,
              }}
            >
              {i + 1}
            </Box>
            <Typography sx={{ fontWeight: 600, color: "text.primary" }}>{label}</Typography>
          </Box>
          {i < heroSteps.length - 1 && (
            <Box
              sx={{
                width: { sm: 40, md: 64 },
                borderTop: "2px dashed",
                borderColor: "primary.main",
                opacity: 0.4,
                mx: 2,
              }}
            />
          )}
        </Box>
      ))}
    </Box>
  );
}

function StepSection({ step }) {
  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: { xs: "column", md: "row" },
        alignItems: "center",
        gap: { xs: 4, md: 6 },
      }}
    >
      <Box
        sx={{
          flex: { md: "0 0 55%" },
          width: "100%",
          borderRadius: 3,
          overflow: "hidden",
        }}
      >
        <Image
          src={step.image}
          alt={step.imageAlt}
          width={step.imageWidth}
          height={step.imageHeight}
          style={{ width: "100%", height: "auto", display: "block" }}
          sizes="(max-width: 900px) 100vw, 600px"
        />
      </Box>
      <Box sx={{ flex: 1, width: "100%" }}>
        <Typography
          component="h2"
          variant="h2"
          sx={{ fontSize: "1.8rem", fontWeight: 800, mb: 1 }}
        >
          <Box component="span" sx={{ color: "primary.main" }}>
            {step.number}.
          </Box>{" "}
          {step.title}
        </Typography>
        <Typography component="p" sx={{ color: "text.secondary", mb: 3, lineHeight: 1.7 }}>
          {step.description}
        </Typography>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
          {step.checklist.map((item) => {
            const Icon = ICONS[item.icon];
            return (
              <Box key={item.label} sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                <Icon sx={{ color: "primary.main", fontSize: 20, flexShrink: 0 }} />
                <Typography sx={{ color: "text.secondary" }}>{item.label}</Typography>
              </Box>
            );
          })}
        </Box>
      </Box>
    </Box>
  );
}

export default function HowItWorksPage() {
  return (
    <Box sx={{ maxWidth: "1120px", mx: "auto" }}>
      {/* Hero */}
      <Box sx={{ maxWidth: "760px", mx: "auto", textAlign: "center", mb: 6 }}>
        <Typography
          component="h1"
          variant="h1"
          sx={{
            fontSize: { xs: "2.5rem", md: "3.5rem" },
            fontWeight: 900,
            letterSpacing: "-0.02em",
            mb: 2,
          }}
        >
          How it{" "}
          <Box component="span" sx={{ color: "primary.main" }}>
            works
          </Box>
        </Typography>
        <Typography component="p" sx={{ fontSize: "1.2rem", mb: 1, color: "text.primary" }}>
          Create scannable QR artwork in a few simple steps.
        </Typography>
        <Typography component="p" sx={{ color: "text.secondary" }}>
          Add your link, describe your image, generate, refine, and unlock the final version.
        </Typography>
      </Box>

      <StepBadgeStrip />

      {/* Step sections */}
      <Box sx={{ display: "flex", flexDirection: "column", gap: 10, mb: 10 }}>
        {steps.map((step) => (
          <StepSection key={step.number} step={step} />
        ))}
      </Box>

      {/* Tips */}
      <Box sx={{ mb: 8 }}>
        <Typography variant="h2" color="primary" sx={{ fontSize: "1.4rem", mb: 2 }}>
          Tips for the best results
        </Typography>
        <Box
          component="ul"
          sx={{ pl: 3, color: "text.secondary", "& li": { mb: 1.5, lineHeight: 1.8 } }}
        >
          {tips.map((tip) => (
            <li key={tip.title}>
              <strong>{tip.title}</strong> {tip.body}
            </li>
          ))}
        </Box>
      </Box>

      {/* CTA */}
      <Box sx={{ textAlign: "center", py: 4, borderTop: "1px solid", borderColor: "divider" }}>
        <Typography variant="h3" color="primary" sx={{ mb: 2, fontSize: "1.4rem" }}>
          Ready to create your first AI QR code?
        </Typography>
        <Link href="/generate" passHref>
          <Button variant="contained" size="large">
            Try it free — no sign-up required
          </Button>
        </Link>
      </Box>
    </Box>
  );
}
