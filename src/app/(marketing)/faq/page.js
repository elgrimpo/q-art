import Link from "next/link";
import { Box, Typography, Button } from "@mui/material";

export const metadata = {
  title: "FAQ — AI QR Codes Explained | QR AI",
  description:
    "Answers to common questions about AI QR codes: will they still scan, how does the AI work, what styles are available, and tips for best results.",
  alternates: {
    canonical: "https://www.qr-ai.co/faq",
  },
};

const faqs = [
  {
    q: "Will an AI QR code still scan?",
    a: "Yes — when generated correctly. QR AI uses Error Correction Level H, the highest available, which means up to 30% of the QR code pattern can be visually altered while the code remains scannable. The ControlNet unit in the AI pipeline enforces the underlying QR structure during generation. That said, every output is different — always test your QR code with at least two devices (iOS Camera, an Android QR scanner app) before publishing or printing. If it doesn't scan, try regenerating with a higher QR weight setting.",
  },
  {
    q: "How does an AI QR code actually work?",
    a: "A standard QR code encodes your URL as a pattern of dark and light squares. QR AI takes that pattern and feeds it into a Stable Diffusion image generation pipeline alongside your chosen art style and an optional text prompt. Two ControlNet units guide the generation: one for brightness/tone, and one specifically trained to preserve the QR code structure (QR Monster v2). The result is an image that looks like a painting or illustration but contains the encoded QR pattern beneath the artistic layers.",
  },
  {
    q: "What QR code types and URL formats are supported?",
    a: "QR AI generates standard QR codes from any URL or text string — websites, social media profiles (instagram.com/yourname), payment links, WiFi credentials (WIFI:S:NetworkName;T:WPA;P:password;;), vCards, and plain text. The shorter your URL, the simpler the QR pattern, which gives the AI more creative freedom to transform it. For long URLs, consider using a URL shortener.",
  },
  {
    q: "What art styles are available?",
    a: "QR AI currently offers 13 curated styles: Ukiyo-e, Expressionism, Dreamy, Low Poly Art, Photography, Vector Art, Doodle Art, Ink, Oil Painting, Chinese Art, Watercolor, Sticker, and Color Blend. Each style uses a specific Stable Diffusion 1.5 model checkpoint and LoRA weights trained for that aesthetic. You can also add a custom text prompt to any style to further guide the artwork — for example, \"cherry blossoms and mountains\" with the Watercolor style.",
  },
  {
    q: "What is the QR weight slider?",
    a: "The QR weight slider (0–1) controls how strongly the AI enforces the QR code structure in the final image. A lower value produces more artistic, abstract results where the QR pattern is subtler. A higher value makes the QR pattern more prominent and reliable for scanning. For most use cases, the default setting (0.5) works well. For high-stakes applications — restaurant menus, business cards, print materials — increase it to 0.7–1.0.",
  },
  {
    q: "Are AI QR codes reliable enough for business use?",
    a: "Many businesses use AI-generated QR codes successfully for menus, marketing, and packaging. However, reliability depends on output quality, printing conditions, and the QR reader used. Best practices: use a higher QR weight setting (0.7+), use a short URL, test with multiple scanning apps, use high-contrast printing, and avoid placing the QR code over highly textured or complex backgrounds. Always test before large print runs.",
  },
  {
    q: "Can I use the generated images commercially?",
    a: "You retain a non-exclusive, worldwide license to use generated images for personal and commercial purposes under QR AI's Terms of Service. This includes using images on business cards, menus, packaging, social media, and marketing materials. See the Terms of Service for full details.",
  },
  {
    q: "Do I need to sign in?",
    a: "No sign-up is required to start. Anonymous (guest) sessions get free credits. Sign in with Google to save your gallery, access credits you've purchased, and transfer guest-generated images to your account.",
  },
  {
    q: "How do credits work?",
    a: "Credits are consumed when you generate images (1 credit), download full-resolution images (10 credits), or upscale to higher resolutions (10–25 credits depending on size). Guest sessions include free credits. You can buy additional credit packs ($5 for 50 credits, $9 for 100, $20 for 250) — they never expire.",
  },
  {
    q: "What resolution are generated images?",
    a: "Generated images are 512×512 pixels by default — enough for screens and small prints. Upscaling is available to 512, 1024, 2048, or 4096 pixels (4096px is suitable for large-format print). Upscaling uses additional credits.",
  },
  {
    q: "How long does generation take?",
    a: "Generation typically completes in 10–30 seconds depending on server load. The pipeline runs on a GPU-powered API (Novita AI), and your request is queued and processed asynchronously. You'll see a loading indicator while the generation runs.",
  },
  {
    q: "Why doesn't my QR code scan?",
    a: "If a generated QR code doesn't scan: (1) regenerate with a higher QR weight value, (2) use a shorter URL (long URLs produce denser, harder-to-scan patterns), (3) try a different art style — some styles preserve QR structure better than others, and (4) ensure the image has sufficient contrast when printed. If you're printing, avoid scaling below 2cm×2cm as QR codes need a minimum size for reliable scanning.",
  },
];

export default function FAQPage() {
  return (
    <Box sx={{ maxWidth: "860px", mx: "auto", color: "#ccc" }}>
      <Typography
        variant="h1"
        color="primary"
        sx={{ fontSize: { xs: "2rem", md: "2.8rem" }, mb: 2 }}
      >
        Frequently Asked Questions
      </Typography>
      <Typography component="p" sx={{ mb: 6, color: "#aaa", fontSize: "1.1rem", lineHeight: 1.8 }}>
        Everything you need to know about AI QR codes — how they work, whether they scan, how to
        get the best results, and how QR AI&rsquo;s credit system works.
      </Typography>

      <Box sx={{ display: "flex", flexDirection: "column", gap: 0 }}>
        {faqs.map((faq, idx) => (
          <Box
            key={idx}
            sx={{
              borderTop: "1px solid #2a2a2a",
              py: 4,
              "&:last-child": { borderBottom: "1px solid #2a2a2a" },
            }}
          >
            <Typography
              component="h2"
              sx={{
                fontSize: "1.1rem",
                fontWeight: 600,
                color: "#fff",
                mb: 2,
              }}
            >
              {faq.q}
            </Typography>
            <Typography component="p" sx={{ lineHeight: 1.8, color: "#bbb" }}>
              {faq.a}
            </Typography>
          </Box>
        ))}
      </Box>

      <Box sx={{ textAlign: "center", py: 6 }}>
        <Typography component="p" sx={{ color: "#888", mb: 3 }}>
          Still have questions?{" "}
          <a href="mailto:support@qr-ai.co" style={{ color: "#A5FFC3" }}>
            Contact us
          </a>
        </Typography>
        <Link href="/generate" passHref>
          <Button variant="contained" size="large">
            Try QR AI for free
          </Button>
        </Link>
      </Box>
    </Box>
  );
}
