import LinkOutlined from "@mui/icons-material/LinkOutlined";
import EditOutlined from "@mui/icons-material/EditOutlined";
import PaletteOutlined from "@mui/icons-material/PaletteOutlined";
import AutoAwesomeOutlined from "@mui/icons-material/AutoAwesomeOutlined";
import VerifiedUserOutlined from "@mui/icons-material/VerifiedUserOutlined";
import QrCodeScannerOutlined from "@mui/icons-material/QrCodeScannerOutlined";
import ShuffleOutlined from "@mui/icons-material/ShuffleOutlined";
import LockOutlined from "@mui/icons-material/LockOutlined";
import TuneOutlined from "@mui/icons-material/TuneOutlined";

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
};

export const heroSteps = ["Describe", "Generate", "Refine", "Unlock"];

export const steps = [
  {
    number: "1",
    title: "Describe your idea",
    image: "/how-it-works/describe-idea.png",
    imageWidth: 1400,
    imageHeight: 970,
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
      { icon: "ShuffleOutlined", label: "Generate a new variation" },
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
    description:
      "Adjust the prompt, switch styles, or balance QR code weight to get the right mix of artistic freedom and scannability.",
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
