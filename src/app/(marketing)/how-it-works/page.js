import Link from "next/link";
import { Box, Typography, Button } from "@mui/material";

export const metadata = {
  title: "How AI QR Codes Work — Step-by-Step Guide | QR AI",
  description:
    "Learn how QR AI transforms any URL into AI-generated QR code artwork using Stable Diffusion and ControlNet. A step-by-step guide with tips for best results.",
  alternates: {
    canonical: "https://www.qr-ai.co/how-it-works",
  },
};

const steps = [
  {
    number: "01",
    title: "Enter your URL",
    body: "Start by pasting any URL into the generator — a website, social media profile, restaurant menu, payment link, or WiFi credentials. QR AI encodes it into a standard QR code with the highest error-correction level (Error Correct H), meaning the QR pattern can be heavily transformed by the AI while still scanning reliably.",
  },
  {
    number: "02",
    title: "Write an optional prompt",
    body: "You can add a custom text prompt to guide the artwork — for example \"cherry blossoms and mountains at dusk\" or \"vibrant street art, neon city at night\". Leave it blank and the AI will create something based purely on the chosen style. The more specific your prompt, the more tailored the result.",
  },
  {
    number: "03",
    title: "Pick an art style",
    body: "Choose from 13 curated art styles: Ukiyo-e, Expressionism, Low Poly Art, Photography, Vector Art, Doodle Art, Ink, Oil Painting, Chinese Art, Watercolor, Ghibli, Cyberpunk, and Illustration. Each style uses a specific Stable Diffusion checkpoint and LoRA weights tuned for that aesthetic. You can also use the Random option to let the AI surprise you.",
  },
  {
    number: "04",
    title: "Adjust the QR weight (optional)",
    body: "The QR weight slider controls how visible the QR code pattern is in the final artwork. A lower value produces more artistic and abstract images; a higher value makes the QR pattern stronger and easier to scan. For most use cases, the default setting (0.5) balances artistic quality and scannability well. For high-stakes applications like menus or business cards, nudge it higher.",
  },
  {
    number: "05",
    title: "Generate and download",
    body: "Click Generate. QR AI submits the request to a GPU-powered AI pipeline and returns your artwork in seconds. Preview the result and save it to your gallery — and when you're happy with one, unlock the high-resolution, watermark-free download.",
  },
];

export default function HowItWorksPage() {
  return (
    <Box sx={{ maxWidth: "860px", mx: "auto" }}>
      <Typography
        variant="h1"
        sx={{ fontSize: { xs: "2rem", md: "2.8rem" }, mb: 2 }}
      >
        How{" "}
        <Box component="span" sx={{ color: "primary.main", fontWeight: 600 }}>
          AI QR Code Art
        </Box>{" "}
        Generation Works
      </Typography>
      <Typography component="p" sx={{ mb: 6, color: "text.secondary", fontSize: "1.1rem", lineHeight: 1.8 }}>
        QR AI uses a two-stage AI pipeline — Stable Diffusion 1.5 with dual ControlNet units — to
        blend your chosen art style with the invisible structure of a QR code. The result is a fully
        scannable image that looks like a piece of artwork. Here&rsquo;s exactly how it works.
      </Typography>

      {/* Step by step */}
      <Box sx={{ display: "flex", flexDirection: "column", gap: 5, mb: 8 }}>
        {steps.map((step) => (
          <Box key={step.number} sx={{ display: "flex", gap: 3, alignItems: "flex-start" }}>
            <Typography
              sx={{
                fontSize: "2rem",
                fontWeight: 800,
                color: "primary.light",
                minWidth: "48px",
                lineHeight: 1,
                mt: 0.5,
              }}
            >
              {step.number}
            </Typography>
            <Box>
              <Typography variant="h2" color="primary" sx={{ fontSize: "1.3rem", mb: 1 }}>
                {step.title}
              </Typography>
              <Typography component="p" sx={{ lineHeight: 1.8, color: "text.secondary" }}>
                {step.body}
              </Typography>
            </Box>
          </Box>
        ))}
      </Box>

      {/* How the AI pipeline works */}
      <Typography variant="h2" color="primary" sx={{ fontSize: "1.6rem", mb: 2 }}>
        Under the hood: the AI pipeline
      </Typography>
      <Typography component="p" sx={{ mb: 3, lineHeight: 1.8, color: "text.secondary" }}>
        QR AI&rsquo;s generation pipeline runs on{" "}
        <strong>Stable Diffusion 1.5</strong> with two simultaneous{" "}
        <strong>ControlNet units</strong>:
      </Typography>
      <Box
        component="ul"
        sx={{ pl: 3, mb: 3, color: "text.secondary", "& li": { mb: 2, lineHeight: 1.8 } }}
      >
        <li>
          <strong>Brightness ControlNet</strong> (control_v1p_sd15_brightness, strength 0.35) — guides the
          overall luminance distribution of the image, ensuring the art has visual depth and isn&rsquo;t flat.
        </li>
        <li>
          <strong>QR Monster ControlNet</strong> (control_v1p_sd15_qrcode_monster_v2, strength 0.85–1.05
          depending on your QR weight setting) — embeds the QR code structure into the AI&rsquo;s generation
          process. This unit runs from guidance step ~40% onward, so early generation is purely artistic
          before the QR structure is enforced.
        </li>
      </Box>
      <Typography component="p" sx={{ mb: 3, lineHeight: 1.8, color: "text.secondary" }}>
        The QR code is generated first using the Python{" "}
        <code style={{ backgroundColor: "#2A2A2A", padding: "2px 6px", borderRadius: "4px" }}>qrcode</code>{" "}
        library with error correction level H — the highest level, which means up to 30% of the QR
        pattern can be obscured or altered while the code still scans correctly. This headroom is what
        allows the AI to blend artistic elements into the code naturally.
      </Typography>

      {/* Tips */}
      <Typography variant="h2" color="primary" sx={{ fontSize: "1.6rem", mb: 2 }}>
        Tips for the best results
      </Typography>
      <Box
        component="ul"
        sx={{ pl: 3, mb: 6, color: "text.secondary", "& li": { mb: 1.5, lineHeight: 1.8 } }}
      >
        <li>
          <strong>Test scannability before publishing.</strong> Always scan your generated QR code with multiple
          devices and apps (iOS Camera, Android Camera, QR-specific scanners) before printing or distributing it.
        </li>
        <li>
          <strong>Use a short URL.</strong> Longer URLs produce denser QR patterns, which are harder for the
          AI to blend artistically. Use a URL shortener to reduce complexity.
        </li>
        <li>
          <strong>Raise QR weight for high-stakes uses.</strong> For restaurant menus, business cards, or product
          packaging where reliable scanning is critical, increase the QR weight to 0.7–1.0.
        </li>
        <li>
          <strong>Experiment with prompts.</strong> A nature-themed prompt with a Watercolor style creates
          very different results than the same style with a "cyberpunk city" prompt. Don&rsquo;t be afraid to
          generate several variations.
        </li>
        <li>
          <strong>Unlock the HD version for print.</strong> Previews are watermarked and sized for
          screens — unlock the high-resolution, watermark-free download for anything you plan to print.
        </li>
      </Box>

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
