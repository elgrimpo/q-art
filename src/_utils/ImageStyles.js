export const RANDOM_STYLE_ID = "random";

export const styles = [
  {
    id: RANDOM_STYLE_ID,
    title: "Random",
    image_url:
      "https://qrartimages.s3.us-west-1.amazonaws.com/6575fc6828c914471b835383.png",
  },
  {
    id: "6a4cfaec4021f21026e477ed",
    title: "Ukiyo-e",
    image_url:
      "https://qrartimages.s3.us-west-1.amazonaws.com/656e2d37e3aafee4354c812b.png",
    // Simple landing page — no promptIdeas/perfectFor yet, so /styles/[slug]
    // renders the lighter legacy layout for this style. See "Watercolor"
    // below for the fuller shape once a style has that content written.
    landingPage: {
      slug: "ukiyo-e-qr-code",
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
  },
  {
    id: "6a4cfaed4021f21026e477ee",
    title: "Expressionism",
    image_url:
      "https://qrartimages.s3.us-west-1.amazonaws.com/6a498f50dbeee01fccc37bc6.png",
  },
  {
    id: "6a4cfaed4021f21026e477ef",
    title: "Low Poly Art",
    image_url:
      "https://qrartimages.s3.us-west-1.amazonaws.com/65a167cad076ab86bf56ac89.png",
  },
  {
    id: "6a4cfaee4021f21026e477f0",
    title: "Photography",
    image_url:
      "https://qrartimages.s3.us-west-1.amazonaws.com/6a4abe9e2164b64ac00f0758.png",
  },
  {
    id: "6a4cfaee4021f21026e477f1",
    title: "Vector Art",
    image_url:
      "https://qrartimages.s3.us-west-1.amazonaws.com/65cc123c7b729925fcced038.png",
  },
  {
    id: "6a4cfaee4021f21026e477f2",
    title: "Doodle Art",
    image_url:
      "https://qrartimages.s3.us-west-1.amazonaws.com/65a19822d076ab86bf56acab.png",
  },
  {
    id: "6a4cfaee4021f21026e477f3",
    title: "Ink",
    image_url:
      "https://qrartimages.s3.us-west-1.amazonaws.com/6595dd1fd3f4c7d50f757b65.png",
  },
  {
    id: "6a4cfaee4021f21026e477f4",
    title: "Oil Painting",
    image_url:
      "https://qrartimages.s3.us-west-1.amazonaws.com/659801fb55848e0542b40cd0.png",
  },
  {
    id: "6a4cfaee4021f21026e477f5",
    title: "Chinese art",
    image_url:
      "https://qrartimages.s3.us-west-1.amazonaws.com/65e243349c04d23c99e86494.png",
  },
  {
    id: "6a4cfaee4021f21026e477f6",
    title: "Watercolor",
    image_url:
      "https://qrartimages.s3.us-west-1.amazonaws.com/6a49894ce43200a51524b869.png",
    // Rich landing page — promptIdeas + perfectFor present, so /styles/[slug]
    // renders the fuller template (examples grid pulled live from real
    // generations, prompt-idea chips, "perfect for" cards).
    landingPage: {
      slug: "watercolor-qr-code",
      metaTitle: "Watercolor QR Code Generator — Free AI Art QR Codes | QR AI",
      metaDescription:
        "Turn any link into a watercolor-style QR code that still scans. Free to try, no sign-up — pick the Watercolor style and generate in seconds.",
      badge: "Watercolor Style",
      headingLines: ["Watercolor", "QR Codes"],
      headingAccent: "QR",
      intro:
        "Soft, painterly QR art that brings beauty to everything you share — without sacrificing scannability.",
      // Shown under every card in the live Examples strip instead of that
      // generation's real prompt — real prompts are user-written and can be
      // off-brand for a marketing page (test/joke prompts, unrelated
      // subjects). Edit this string directly; it's the same caption on
      // every example card until there's a real per-image curation model.
      exampleCaption: "Real, scannable Watercolor QR code — made with QR AI",
      features: [
        { icon: "BrushOutlined", label: "Soft painterly aesthetic" },
        { icon: "QrCode2Outlined", label: "Scannable by design" },
        { icon: "LocalPrintshopOutlined", label: "Perfect for print & invites" },
      ],
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
      // Each links to /generate?style=<slug>&prompt=<text> — prefills the
      // form, doesn't auto-submit.
      promptIdeas: [
        "Wildflowers in watercolor",
        "Peach & blush watercolor florals",
        "Ocean waves with soft watercolor splashes",
        "Lavender field painting",
        "Sunset over mountains, watercolor",
        "Eucalyptus leaves & watercolor wash",
      ],
      // imageUrl is a placeholder pulled from the site's existing generic
      // /product-placements/ set (same images the /generate use-case
      // carousel uses) — swap for dedicated per-style photography later.
      perfectFor: [
        {
          title: "Wedding Stationery",
          description: "Elegant saves, invites & thank you cards",
          icon: "FavoriteBorderOutlined",
          imageUrl: "/product-placements/weddings-stationery.png",
        },
        {
          title: "Menus & Café",
          description: "Beautiful menus that guests love",
          icon: "LocalCafeOutlined",
          imageUrl: "/product-placements/restaurants-food-trucks.png",
        },
        {
          title: "Events & Posters",
          description: "Stand out with artwork that scans",
          icon: "CelebrationOutlined",
          imageUrl: "/product-placements/events-exhibitions.png",
        },
        {
          title: "Product Packaging",
          description: "Add artistic QR codes to labels & packaging",
          icon: "Inventory2Outlined",
          imageUrl: "/product-placements/business-branding.png",
        },
        {
          title: "Social Sharing",
          description: "Make your profile, portfolio & links pop",
          icon: "ShareOutlined",
          imageUrl: "/product-placements/apparel-merch.png",
        },
      ],
    },
  },
  {
    id: "6a4cfaee4021f21026e477f7",
    title: "Ghibli",
    image_url:
      "https://qrartimages.s3.us-west-1.amazonaws.com/6a4bbb07890b1939b5192cd8.png",
  },
  {
    id: "6a4cfaee4021f21026e477f8",
    title: "Cyberpunk",
    image_url:
      "https://qrartimages.s3.us-west-1.amazonaws.com/6a4508cc3b23a83b1fa7b4c3.png",
  },
  {
    id: "6a4cfaef4021f21026e477f9",
    title: "Illustration",
    image_url:
      "https://qrartimages.s3.us-west-1.amazonaws.com/6a4bb59e2cfa329e8d58854c.png",
  },
];

/**
 * Pick a random non-Random style. Used by GenerateForm and IteratePanel
 * when the user has selected style_id === RANDOM_STYLE_ID ("Random").
 */
export function selectRandomStyle() {
  const available = styles.filter((s) => s.id !== RANDOM_STYLE_ID);
  return available[Math.floor(Math.random() * available.length)];
}

/** Styles that have a /styles/[slug] landing page. */
export function stylesWithLandingPage() {
  return styles.filter((s) => s.landingPage);
}

/** Look up a style by its landing-page slug (e.g. "watercolor-qr-code"). */
export function findStyleByLandingSlug(slug) {
  return styles.find((s) => s.landingPage?.slug === slug);
}

/** A landing page is "rich" once it has prompt ideas + perfect-for content. */
export function isRichLandingPage(landingPage) {
  return Boolean(landingPage?.promptIdeas?.length);
}
