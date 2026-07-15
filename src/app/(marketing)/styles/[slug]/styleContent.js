// Content for the per-style landing pages (/styles/[slug]). Each entry maps
// to a real style in `_utils/ImageStyles.js` — the hero image and the
// `?style=` deep-link into /generate both key off `slug` matching that
// style's title (lowercased, spaces to hyphens).
export const styleContent = {
  watercolor: {
    slug: "watercolor",
    title: "Watercolor",
    styleImageUrl:
      "https://qrartimages.s3.us-west-1.amazonaws.com/6a49894ce43200a51524b869.png",
    metaTitle: "Watercolor QR Code Generator — Free AI Art QR Codes | QR AI",
    metaDescription:
      "Turn any link into a watercolor-style QR code that still scans. Free to try, no sign-up — pick the Watercolor style and generate in seconds.",
    heading: "Watercolor QR Code Generator",
    intro:
      "Soft washes of color, organic bleed, and a hand-painted feel — watercolor turns a plain QR code into something that looks like it belongs on an invitation, not a receipt.",
    why: [
      "Soft, blended color transitions read as elegant and personal rather than corporate.",
      "Works especially well against light, minimal backgrounds — invitations, stationery, and packaging with white space to spare.",
      "One of QR AI's most-picked looks for anything tied to a real-world event or gift.",
    ],
    useCases: [
      "Wedding invitations & save-the-dates",
      "Gift tags and greeting cards",
      "Boutique packaging and product tags",
      "Event signage with a soft, artistic feel",
    ],
  },
  "ukiyo-e": {
    slug: "ukiyo-e",
    title: "Ukiyo-e",
    styleImageUrl:
      "https://qrartimages.s3.us-west-1.amazonaws.com/656e2d37e3aafee4354c812b.png",
    metaTitle:
      "Ukiyo-e QR Code Generator — Japanese Woodblock Art QR Codes | QR AI",
    metaDescription:
      "Turn any link into a Japanese ukiyo-e woodblock-style QR code that still scans. Free to try, no sign-up — pick the Ukiyo-e style and generate in seconds.",
    heading: "Ukiyo-e QR Code Generator",
    intro:
      "Bold outlines, flat planes of color, and the unmistakable look of Japanese woodblock printmaking — ukiyo-e turns a QR code into a piece of art with real cultural weight behind it.",
    why: [
      "Strong linework and high contrast naturally preserve the QR code's structure well.",
      "A distinctive, recognizable aesthetic that stands out from typical AI-art looks.",
      "Pairs naturally with food, travel, art, and culture-adjacent brands.",
    ],
    useCases: [
      "Restaurant and izakaya menus",
      "Art prints, posters, and gallery signage",
      "Travel and hospitality collateral",
      "Album art and music packaging",
    ],
  },
};

export const styleSlugs = Object.keys(styleContent);
