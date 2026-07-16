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
    // Rich landing page — promptIdeas + perfectFor present, so /styles/[slug]
    // renders the fuller template (examples grid pulled live from real
    // generations, prompt-idea chips, "perfect for" cards).
    landingPage: {
      slug: "ukiyo-e-qr-code",
      metaTitle:
        "Ukiyo-e QR Code Generator — Japanese Woodblock QR Art | QR AI",
      metaDescription:
        "Turn any link into a Japanese ukiyo-e-inspired QR code that still scans. Create bold woodblock-style QR art with QR AI.",
      badge: "Ukiyo-e Style",
      headingLines: ["Ukiyo-e", "QR Codes"],
      headingAccent: "QR",
      intro:
        "Bold outlines, flat color, and the timeless character of Japanese woodblock prints — transformed into QR art made to be seen and scanned.",
      exampleCaption: "Real, scannable Ukiyo-e QR code — made with QR AI",
      features: [
        { icon: "BrushOutlined", label: "Bold woodblock aesthetic" },
        { icon: "QrCode2Outlined", label: "Strong visual structure" },
        { icon: "LocalPrintshopOutlined", label: "Made for posters & menus" },
      ],
      why: [
        "Strong linework and defined color blocks complement the geometric structure of a QR code.",
        "The recognizable woodblock look gives food, travel, and culture-focused designs a distinctive identity.",
        "Works especially well with dramatic landscapes, waves, florals, and traditional Japanese subjects.",
      ],
      useCases: [
        "Restaurant and izakaya menus",
        "Art prints and gallery signage",
        "Travel and hospitality collateral",
        "Album covers and event posters",
      ],
      promptIdeas: [
        "great wave beneath Mount Fuji, fishing boats, rising sun",
        "red-crowned cranes among pine trees, winter landscape",
        "koi fish circling lotus flowers in a garden pond",
        "sushi platter, ceramic sake bottle, chopsticks, wasabi, folded linen",
        "matcha bowl, bamboo whisk, ceramic teapot, cherry blossoms",
        "persimmons, folded indigo cloth, ceramic vase, maple leaves",
      ],
      perfectFor: [
        {
          title: "Japanese Restaurants",
          description: "Distinctive menus, table cards, and takeaway packaging",
          icon: "RestaurantOutlined",
          imageUrl: "/product-placements/restaurants-food-trucks.png",
        },
        {
          title: "Travel & Hospitality",
          description: "Memorable guides, posters, and guest experiences",
          icon: "TravelExploreOutlined",
          imageUrl: "/product-placements/events-exhibitions.png",
        },
        {
          title: "Art & Culture",
          description: "Gallery signage, exhibitions, and cultural events",
          icon: "MuseumOutlined",
          imageUrl: "/product-placements/art-galleries.png",
        },
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
    landingPage: {
      slug: "low-poly-qr-code",
      metaTitle: "Low Poly QR Code Generator — Geometric 3D QR Art | QR AI",
      metaDescription:
        "Create geometric low-poly QR codes with faceted shapes and modern 3D character. Generate scannable QR art with QR AI.",
      badge: "Low Poly Style",
      headingLines: ["Low Poly", "QR Codes"],
      headingAccent: "QR",
      intro:
        "Faceted geometry and crisp polygonal forms give your QR code a modern, dimensional look with unmistakable digital character.",
      exampleCaption: "Real, scannable Low Poly QR code — made with QR AI",
      features: [
        { icon: "ViewInArOutlined", label: "Faceted 3D aesthetic" },
        { icon: "GridViewOutlined", label: "Geometry-led structure" },
        { icon: "SportsEsportsOutlined", label: "Ideal for digital brands" },
      ],
      why: [
        "Angular forms naturally complement the square geometry of a QR code.",
        "The modern 3D look works well for gaming, technology, architecture, and product-focused brands.",
        "Simple polygonal shapes create a strong visual identity without relying on fine detail.",
      ],
      useCases: [
        "Gaming and esports",
        "Technology campaigns",
        "Architecture and real estate",
        "Product launches",
      ],
      promptIdeas: [
        "faceted fox in a geometric forest, low poly mountains",
        "futuristic city skyline made from angular polygonal forms",
        "crystal mountains beneath a glowing sunset",
        "lemons, oranges, olive branches, folded cloth, geometric still life",
        "coffee grinder, espresso cup, roasted beans, faceted geometry",
        "coconuts, mangoes, dragon fruit, monstera leaves, polygonal forms",
      ],
      perfectFor: [
        {
          title: "Gaming & Esports",
          description: "Distinctive graphics for communities and events",
          icon: "SportsEsportsOutlined",
          imageUrl: "/product-placements/apparel-merch.png",
        },
        {
          title: "Tech Products",
          description: "Modern launch assets, packaging, and demos",
          icon: "DevicesOutlined",
          imageUrl: "/product-placements/business-branding.png",
        },
        {
          title: "Architecture",
          description: "Geometric QR artwork for properties and studios",
          icon: "ArchitectureOutlined",
          imageUrl: "/product-placements/art-galleries.png",
        },
      ],
    },
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
    landingPage: {
      slug: "oil-painting-qr-code",
      metaTitle: "Oil Painting QR Code Generator — Rich Painted QR Art | QR AI",
      metaDescription:
        "Create richly colored oil-painting QR codes with visible brushwork and gallery-like depth using QR AI.",
      badge: "Oil Painting Style",
      headingLines: ["Oil Painting", "QR Codes"],
      headingAccent: "QR",
      intro:
        "Rich pigment, visible brushwork, and luminous color transform your QR code into artwork with depth, warmth, and presence.",
      exampleCaption: "Real, scannable Oil Painting QR code — made with QR AI",
      features: [
        { icon: "PaletteOutlined", label: "Rich defined color" },
        { icon: "TextureOutlined", label: "Visible painted texture" },
        { icon: "MuseumOutlined", label: "Gallery-like presence" },
      ],
      why: [
        "Layered color and brush texture create a premium, handcrafted impression.",
        "The style is ideal for food, wine, hospitality, cultural projects, and decorative print.",
        "Bold color separation helps preserve recognizable QR structure inside a highly artistic composition.",
      ],
      useCases: [
        "Wine and gourmet products",
        "Hotels and restaurants",
        "Art prints and exhibitions",
        "Luxury packaging",
      ],
      promptIdeas: [
        "wine bottles, grapes, cheese, figs, candlelight, rich oil painting",
        "pumpkins, apples, pears, dried leaves, cinnamon sticks",
        "roasted coffee beans, espresso cup, vintage grinder, burlap sack",
        "sunflowers in a ceramic vase, dark background, defined golden color",
        "rustic Italian table, tomatoes, basil, olive oil, warm light",
        "mountain lodge terrace, wine glasses, sunset, expressive brushwork",
      ],
      perfectFor: [
        {
          title: "Wine & Gourmet",
          description: "Rich artwork for labels, menus, and tastings",
          icon: "WineBarOutlined",
          imageUrl: "/product-placements/restaurants-food-trucks.png",
        },
        {
          title: "Luxury Hospitality",
          description: "Elegant guest material for hotels and restaurants",
          icon: "HotelOutlined",
          imageUrl: "/product-placements/events-exhibitions.png",
        },
        {
          title: "Art Prints",
          description: "Decorative QR designs made to be displayed",
          icon: "MuseumOutlined",
          imageUrl: "/product-placements/art-galleries.png",
        },
      ],
    },
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
    landingPage: {
      slug: "cyberpunk-qr-code",
      metaTitle: "Cyberpunk QR Code Generator — Neon Futuristic QR Art | QR AI",
      metaDescription:
        "Create neon cyberpunk QR codes with futuristic cities, glowing signs, and high-tech atmosphere using QR AI.",
      badge: "Cyberpunk Style",
      headingLines: ["Cyberpunk", "QR Codes"],
      headingAccent: "QR",
      intro:
        "Neon light, futuristic cityscapes, and high-tech atmosphere turn your QR code into a vivid portal to another world.",
      exampleCaption: "Real, scannable Cyberpunk QR code — made with QR AI",
      features: [
        { icon: "BoltOutlined", label: "Electric neon energy" },
        { icon: "MemoryOutlined", label: "Futuristic visual language" },
        { icon: "NightlifeOutlined", label: "Made for nightlife & tech" },
      ],
      why: [
        "Bright neon contrast makes the QR structure visually prominent inside dark, atmospheric scenes.",
        "The style is a natural fit for gaming, nightlife, music, technology, and Web3 communities.",
        "Urban signs, grids, screens, and circuitry provide many ways to integrate QR geometry into the scene.",
      ],
      useCases: [
        "Gaming and esports",
        "Nightclubs and music events",
        "Technology products",
        "Web3 and digital communities",
      ],
      promptIdeas: [
        "rainy neon alley, holographic signs, crowded futuristic city",
        "female DJ in a cyberpunk club, lasers, glowing control panels",
        "ramen bowl, chopsticks, neon bottles, metallic counter, pink and blue light",
        "energy drink cans, headphones, circuit boards, holographic reflections",
        "futuristic coffee bar, chrome espresso machine, glowing steam",
        "cybernetic flowers in glass vessels, dark laboratory table",
      ],
      perfectFor: [
        {
          title: "Gaming & Esports",
          description: "Neon QR art for launches, tournaments, and communities",
          icon: "SportsEsportsOutlined",
          imageUrl: "/product-placements/apparel-merch.png",
        },
        {
          title: "Music & Nightlife",
          description: "High-energy posters, screens, and venue signage",
          icon: "NightlifeOutlined",
          imageUrl: "/product-placements/music-nightlife.png",
        },
        {
          title: "Technology",
          description: "Futuristic QR visuals for products and events",
          icon: "MemoryOutlined",
          imageUrl: "/product-placements/business-branding.png",
        },
      ],
    },
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
