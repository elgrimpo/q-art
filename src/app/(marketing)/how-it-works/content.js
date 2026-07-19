import LinkOutlined from "@mui/icons-material/LinkOutlined";
import EditOutlined from "@mui/icons-material/EditOutlined";
import PaletteOutlined from "@mui/icons-material/PaletteOutlined";
import AutoAwesomeOutlined from "@mui/icons-material/AutoAwesomeOutlined";
import VerifiedUserOutlined from "@mui/icons-material/VerifiedUserOutlined";
import QrCodeScannerOutlined from "@mui/icons-material/QrCodeScannerOutlined";
import ShuffleOutlined from "@mui/icons-material/ShuffleOutlined";
import LockOutlined from "@mui/icons-material/LockOutlined";
import TuneOutlined from "@mui/icons-material/TuneOutlined";
import HdOutlined from "@mui/icons-material/HdOutlined";
import PaidOutlined from "@mui/icons-material/PaidOutlined";
import LocalPrintshopOutlined from "@mui/icons-material/LocalPrintshopOutlined";

export const ICONS = {
  LinkOutlined,
  EditOutlined,
  PaletteOutlined,
  AutoAwesomeOutlined,
  VerifiedUserOutlined,
  QrCodeScannerOutlined,
  ShuffleOutlined,
  LockOutlined,
  TuneOutlined,
  HdOutlined,
  PaidOutlined,
  LocalPrintshopOutlined,
};

export const heroSteps = ["Describe", "Generate", "Refine", "Unlock"];

export const steps = [
  {
    number: "1",
    title: "Describe your idea",
    image: "/how-it-works/describe-idea.png",
    imageWidth: 841,
    imageHeight: 610,
    imageAlt:
      "QR AI generate form filled in with a website URL, an image description, and the Ukiyo-e style selected",
    description:
      "Add your website link, describe the artwork you want to create, and optionally choose a style.",
    checklist: [
      { icon: "LinkOutlined", label: "Enter your website" },
      { icon: "EditOutlined", label: "Describe your image" },
      { icon: "PaletteOutlined", label: "Choose a style (optional)" },
      { icon: "AutoAwesomeOutlined", label: "Then click Generate." },
    ],
  },
  {
    number: "2",
    title: "Review your result",
    image: "/how-it-works/review-result.png",
    imageWidth: 1400,
    imageHeight: 847,
    imageAlt:
      "A generated koi fish QR code artwork with its scannability score and an unlock option",
    description:
      "Check the scannability score, verify it yourself, and decide what to do next.",
    checklist: [
      { icon: "VerifiedUserOutlined", label: "Check scannability score" },
      { icon: "QrCodeScannerOutlined", label: "Verify by scanning yourself" },
      { icon: "LockOutlined", label: "Unlock if satisfied" },
      {
        icon: "AutoAwesomeOutlined",
        label: "Want to improve it? Iterate and tweak the image.",
      },
    ],
  },
  {
    number: "3",
    title: "Fine-tune your result",
    image: "/how-it-works/fine-tune.png",
    imageWidth: 1256,
    imageHeight: 1402,
    imageAlt: "The iterate panel with prompt, style, and QR code weight slider",
    description: "Not happy yet? You've got two ways to get a better result:",
    subsections: [
      {
        title: "Create Variant",
        description:
          "Keep the same prompt, style, and QR weight — just generate a fresh take with a new random seed.",
        checklist: [
          { icon: "ShuffleOutlined", label: "Same settings" },
          { icon: "AutoAwesomeOutlined", label: "New image generated" },
        ],
      },
      {
        title: "Iterate",
        description:
          "Tweak the settings for a similar image — same content, refined.",
        checklist: [
          { icon: "EditOutlined", label: "Edit prompt" },
          { icon: "PaletteOutlined", label: "Change style" },
          {
            icon: "TuneOutlined",
            label: "Adjust QR code weight — more artistic ↔ more scannable",
          },
          { icon: "AutoAwesomeOutlined", label: "Generate a new refined version." },
        ],
      },
    ],
  },
  {
    number: "4",
    title: "Unlock your image",
    image:
      "https://qrartimages.s3.us-west-1.amazonaws.com/product-placements/ukiyo-e-restaurant.png",
    imageWidth: 1086,
    imageHeight: 1448,
    imageAlt:
      "An unlocked, watermark-free AI QR code art print used as a restaurant menu cover",
    description:
      "Once you're happy with your art, unlock the full-resolution, watermark-free version — ready to print, share, or bring into the real world.",
    checklist: [
      { icon: "HdOutlined", label: "Watermark removed, full 2048px resolution" },
      { icon: "PaidOutlined", label: "One-time unlock — no subscription" },
      {
        icon: "LocalPrintshopOutlined",
        label: "Print-ready for menus, posters, packaging, and more",
      },
    ],
  },
];

export const tips = [
  {
    title: "Use a short URL.",
    body:
      "Longer URLs produce denser QR patterns, which are harder for the AI to blend artistically. Use a URL shortener to reduce complexity.",
  },
  {
    title: "Raise QR weight for high-stakes uses.",
    body:
      "For restaurant menus, business cards, or product packaging where reliable scanning is critical, nudge the QR weight slider toward Scannable.",
  },
];
