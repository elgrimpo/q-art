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
      tagline: "Classic Japanese woodblock prints.",
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
          imageUrl: "https://qrartimages.s3.us-west-1.amazonaws.com/product-placements/ukiyo-e-restaurant.png",
        },
        {
          title: "Music & Nightlife",
          description: "High-energy posters, event screens, and venue signage",
          icon: "NightlifeOutlined",
          imageUrl: "https://qrartimages.s3.us-west-1.amazonaws.com/product-placements/ukiyo-e-nightlife.png",
        },
        {
          title: "Art & Culture",
          description: "Gallery signage, exhibitions, and cultural events",
          icon: "MuseumOutlined",
          imageUrl: "https://qrartimages.s3.us-west-1.amazonaws.com/product-placements/ukiyo-e-festival.png",
        },
      ],
    },
  },
  {
    id: "6a4cfaed4021f21026e477ee",
    title: "Expressionism",
    image_url:
      "https://qrartimages.s3.us-west-1.amazonaws.com/6a5bef7adc5e6b9f5d8dd988.png",
    landingPage: {
      slug: "expressionism-qr-code",
      tagline: "Bold brushstrokes and emotional energy.",
      metaTitle:
        "Expressionist QR Code Generator — Bold Artistic QR Codes | QR AI",
      metaDescription:
        "Create expressive QR code art with energetic brushwork, vivid color, and emotional character. Free to try with QR AI.",
      badge: "Expressionism Style",
      headingLines: ["Expressionist", "QR Codes"],
      headingAccent: "QR",
      intro:
        "Energetic brushwork, exaggerated color, and emotional intensity turn every QR code into a bold visual statement.",
      exampleCaption: "Real, scannable Expressionist QR code — made with QR AI",
      features: [
        { icon: "PaletteOutlined", label: "Vivid emotional color" },
        { icon: "AutoAwesomeOutlined", label: "Bold artistic energy" },
        { icon: "CampaignOutlined", label: "Built to stand out" },
      ],
      why: [
        "High-energy color and dramatic marks make even simple subjects feel expressive and memorable.",
        "The style is ideal for campaigns, music, nightlife, and creative brands that want visual impact.",
        "Strong contrasts and broad shapes preserve visual structure while allowing substantial artistic freedom.",
      ],
      useCases: [
        "Music and festival posters",
        "Creative brand campaigns",
        "Gallery and exhibition materials",
        "Editorial and cultural projects",
      ],
      promptIdeas: [
        "stormy coastline, red sky, windswept trees, dramatic brushstrokes",
        "jazz musicians in a crowded club, glowing stage lights",
        "wildflowers in a ceramic vase, saturated colors, dark table",
        "oranges, blue bottle, folded cloth, expressive shadows",
        "coffee cup, scattered beans, vintage grinder, bold painted forms",
        "pumpkins, apples, dried leaves, cinnamon sticks, vivid autumn color",
      ],
      perfectFor: [
        {
          title: "Music & Nightlife",
          description: "High-impact posters, tickets, and venue graphics",
          icon: "MusicNoteOutlined",
          imageUrl: "https://qrartimages.s3.us-west-1.amazonaws.com/product-placements/expressionism-music-nightlife.png",
        },
        {
          title: "Creative Campaigns",
          description: "Bold branding and identity work for creative studios",
          icon: "CampaignOutlined",
          imageUrl: "https://qrartimages.s3.us-west-1.amazonaws.com/product-placements/expressionism-creative-campaigns.png",
        },
        {
          title: "Retail & Fashion",
          description: "Vivid storefronts, pop-ups, and window displays",
          icon: "StorefrontOutlined",
          imageUrl: "https://qrartimages.s3.us-west-1.amazonaws.com/product-placements/expressionism-retail-fashion.png",
        },
      ],
    },
  },
  {
    id: "6a4cfaed4021f21026e477ef",
    title: "Low Poly Art",
    image_url:
      "https://qrartimages.s3.us-west-1.amazonaws.com/65a167cad076ab86bf56ac89.png",
    landingPage: {
      slug: "low-poly-qr-code",
      tagline: "Geometric shapes with modern depth.",
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
          imageUrl: "https://qrartimages.s3.us-west-1.amazonaws.com/product-placements/lowpoly-gaming-esports.png",
        },
        {
          title: "Outdoor Advertising",
          description: "Bold billboards and campaign displays",
          icon: "CampaignOutlined",
          imageUrl: "https://qrartimages.s3.us-west-1.amazonaws.com/product-placements/lowpoly-outdoor-advertising.png",
        },
        {
          title: "Food & Beverage",
          description: "Eye-catching signage for food trucks and street food",
          icon: "RestaurantOutlined",
          imageUrl: "https://qrartimages.s3.us-west-1.amazonaws.com/product-placements/lowpoly-food-beverage.png",
        },
      ],
    },
  },
  {
    id: "6a4cfaee4021f21026e477f0",
    title: "Photography",
    image_url:
      "https://qrartimages.s3.us-west-1.amazonaws.com/6a4abe9e2164b64ac00f0758.png",
    landingPage: {
      slug: "photography-qr-code",
      tagline: "Realistic scenes with rich detail.",
      metaTitle: "Photorealistic QR Code Generator — AI Photo QR Codes | QR AI",
      metaDescription:
        "Blend your QR code into a photorealistic scene. Create detailed, scannable AI photo QR codes with QR AI.",
      badge: "Photography Style",
      headingLines: ["Photorealistic", "QR Codes"],
      headingAccent: "QR",
      intro:
        "Natural light, realistic materials, and cinematic detail make your QR code feel embedded in a real photographed scene.",
      exampleCaption: "Real, scannable Photography QR code — made with QR AI",
      features: [
        { icon: "PhotoCameraOutlined", label: "Photorealistic scenes" },
        { icon: "CenterFocusStrongOutlined", label: "Cinematic composition" },
        { icon: "StorefrontOutlined", label: "Made for real products" },
      ],
      why: [
        "Photorealistic scenes help audiences immediately understand how the QR code fits into a real setting.",
        "The style is especially strong for food, travel, property, products, and social content.",
        "Careful composition makes the QR structure feel like part of the environment rather than an overlay.",
      ],
      useCases: [
        "Food and beverage marketing",
        "Travel and destination campaigns",
        "Real estate and hospitality",
        "Product and lifestyle advertising",
      ],
      promptIdeas: [
        "rustic Italian table, tomatoes, basil, olive oil, warm trattoria lighting",
        "roasted coffee beans, espresso cup, vintage grinder, burlap sack",
        "ceramic teapot, matcha bowl, bamboo whisk, cherry blossoms",
        "lemons, oranges, olive branches, linen cloth, soft window light",
        "luxury villa perched on a cliff at sunset, ocean view",
        "whisky tasting on a Swiss terrace, mountains, wooden table, golden hour",
      ],
      perfectFor: [
        {
          title: "Food & Beverage",
          description: "Realistic menus, campaigns, and product scenes",
          icon: "RestaurantOutlined",
          imageUrl: "https://qrartimages.s3.us-west-1.amazonaws.com/product-placements/photography-food-beverage.png",
        },
        {
          title: "Travel & Property",
          description: "Destination, hotel, and real-estate marketing",
          icon: "TravelExploreOutlined",
          imageUrl: "https://qrartimages.s3.us-west-1.amazonaws.com/product-placements/photography-travel-property.png",
        },
        {
          title: "Product Advertising",
          description: "Lifestyle imagery that makes products feel tangible",
          icon: "ShoppingBagOutlined",
          imageUrl: "https://qrartimages.s3.us-west-1.amazonaws.com/product-placements/photography-product-advertising.png",
        },
      ],
    },
  },
  
  {
    id: "6a4cfaee4021f21026e477f2",
    title: "Doodle Art",
    image_url:
      "https://qrartimages.s3.us-west-1.amazonaws.com/65a19822d076ab86bf56acab.png",
    landingPage: {
      slug: "doodle-art-qr-code",
      tagline: "Playful hand-drawn doodles and icons.",
      metaTitle: "Doodle QR Code Generator — Playful Hand-Drawn QR Art | QR AI",
      metaDescription:
        "Create playful doodle-style QR codes filled with hand-drawn charm. Generate fun, scannable QR art with QR AI.",
      badge: "Doodle Art Style",
      headingLines: ["Doodle Art", "QR Codes"],
      headingAccent: "QR",
      intro:
        "Loose lines, playful icons, and hand-drawn personality make every QR code feel friendly, spontaneous, and fun.",
      exampleCaption: "Real, scannable Doodle Art QR code — made with QR AI",
      features: [
        { icon: "GestureOutlined", label: "Playful hand-drawn feel" },
        { icon: "SentimentSatisfiedAltOutlined", label: "Friendly & approachable" },
        { icon: "ChildCareOutlined", label: "Perfect for casual brands" },
      ],
      why: [
        "Hand-drawn marks make digital interactions feel personal and informal.",
        "The style is a strong fit for education, creators, cafés, family events, and community projects.",
        "Small icons and simple outlines decorate the QR structure without making the composition feel heavy.",
      ],
      useCases: [
        "Kids and education",
        "Creator profiles",
        "Community events",
        "Casual cafés and small businesses",
      ],
      promptIdeas: [
        "coffee cup, croissant, beans, tiny stars, playful hand-drawn doodles",
        "school books, pencils, ruler, backpack, cheerful doodle icons",
        "mushrooms, pinecones, moss, fern leaves, acorns, sketchy doodles",
        "teacups, macarons, flowers, lace tablecloth, whimsical line art",
        "camera, passport, map, sunglasses, travel doodle collection",
        "birthday cake, balloons, gifts, confetti, hand-drawn icons",
      ],
      perfectFor: [
        {
          title: "Education",
          description: "Friendly QR codes for classes and learning materials",
          icon: "SchoolOutlined",
          imageUrl: "https://qrartimages.s3.us-west-1.amazonaws.com/product-placements/doodle-education.png",
        },
        {
          title: "Creators",
          description: "Playful portfolio, profile, and social links",
          icon: "BrushOutlined",
          imageUrl: "https://qrartimages.s3.us-west-1.amazonaws.com/product-placements/doodle-creators.png",
        },
        {
          title: "Apparel & Merch",
          description: "Playful designs for t-shirts, stickers, and gear",
          icon: "CheckroomOutlined",
          imageUrl: "https://qrartimages.s3.us-west-1.amazonaws.com/product-placements/doodle-apparel-merch.png",
        },
      ],
    },
  },
  {
    id: "6a4cfaee4021f21026e477f3",
    title: "Ink",
    image_url:
      "https://qrartimages.s3.us-west-1.amazonaws.com/6595dd1fd3f4c7d50f757b65.png",
    landingPage: {
      slug: "ink-qr-code",
      tagline: "Elegant ink wash and expressive linework.",
      metaTitle: "Ink QR Code Generator — Elegant Black Ink QR Art | QR AI",
      metaDescription:
        "Create elegant ink-style QR codes with expressive linework and high-contrast detail. Generate scannable ink QR art with QR AI.",
      badge: "Ink Style",
      headingLines: ["Ink", "QR Codes"],
      headingAccent: "QR",
      intro:
        "Expressive linework, deep contrast, and organic brush marks give your QR code a refined, timeless visual presence.",
      exampleCaption: "Real, scannable Ink QR code — made with QR AI",
      features: [
        { icon: "DrawOutlined", label: "Expressive linework" },
        { icon: "ContrastOutlined", label: "Elegant high contrast" },
        { icon: "MenuBookOutlined", label: "Refined editorial feel" },
      ],
      why: [
        "Dark ink and negative space align naturally with the visual logic of QR codes.",
        "The restrained palette gives premium brands, menus, books, and exhibitions an elegant feel.",
        "Ink works especially well for botanicals, architecture, animals, and atmospheric landscapes.",
      ],
      useCases: [
        "Premium menus and packaging",
        "Editorial and publishing",
        "Gallery and museum signage",
        "Tattoo, fashion, and design studios",
      ],
      promptIdeas: [
        "raven perched on a twisted branch, black ink wash",
        "misty mountains, pine trees, distant temple, expressive ink",
        "ceramic teapot, matcha bowl, bamboo whisk, cherry blossoms",
        "mushrooms, pinecones, moss, fern leaves, acorns, botanical ink study",
        "wine bottle, grapes, corkscrew, folded linen, ink illustration",
        "dried lavender bundles, candles, linen fabric, delicate linework",
      ],
      perfectFor: [
        {
          title: "Premium Hospitality",
          description: "Elegant menus, wine lists, and guest collateral",
          icon: "WineBarOutlined",
          imageUrl: "https://qrartimages.s3.us-west-1.amazonaws.com/product-placements/ink-premium-hospitality.png",
        },
        {
          title: "Editorial Design",
          description: "Refined QR art for books, magazines, and prints",
          icon: "MenuBookOutlined",
          imageUrl: "https://qrartimages.s3.us-west-1.amazonaws.com/product-placements/ink-editorial-design.png",
        },
        {
          title: "Art & Fashion",
          description: "Distinctive material for studios and exhibitions",
          icon: "DesignServicesOutlined",
          imageUrl: "https://qrartimages.s3.us-west-1.amazonaws.com/product-placements/ink-art-fashion.png",
        },
      ],
    },
  },
  {
    id: "6a4cfaee4021f21026e477f4",
    title: "Oil Painting",
    image_url:
      "https://qrartimages.s3.us-west-1.amazonaws.com/659801fb55848e0542b40cd0.png",
    landingPage: {
      slug: "oil-painting-qr-code",
      tagline: "Rich textures and painterly strokes.",
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
          imageUrl: "https://qrartimages.s3.us-west-1.amazonaws.com/product-placements/oilpainting-wine-gourmet.png",
        },
        {
          title: "Luxury Hospitality",
          description: "Elegant guest material for hotels and restaurants",
          icon: "HotelOutlined",
          imageUrl: "https://qrartimages.s3.us-west-1.amazonaws.com/product-placements/oilpainting-luxury-hospitality.png",
        },
        {
          title: "Cafés & Bistros",
          description: "Warm painted artwork for menus and café signage",
          icon: "LocalCafeOutlined",
          imageUrl: "https://qrartimages.s3.us-west-1.amazonaws.com/product-placements/oilpainting-cafes-bistros.png",
        },
      ],
    },
  },
  {
    id: "6a4cfaee4021f21026e477f5",
    title: "Chinese art",
    image_url:
      "https://qrartimages.s3.us-west-1.amazonaws.com/65e243349c04d23c99e86494.png",
    landingPage: {
      slug: "chinese-art-qr-code",
      tagline: "Traditional brushwork and timeless beauty.",
      metaTitle:
        "Chinese Art QR Code Generator — Traditional Brush QR Art | QR AI",
      metaDescription:
        "Create Chinese-art-inspired QR codes with elegant brushwork, natural motifs, and traditional visual character using QR AI.",
      badge: "Chinese Art Style",
      headingLines: ["Chinese Art", "QR Codes"],
      headingAccent: "QR",
      intro:
        "Graceful brushwork, poetic landscapes, and symbolic natural motifs give your QR code a calm, culturally distinctive character.",
      exampleCaption: "Real, scannable Chinese Art QR code — made with QR AI",
      features: [
        { icon: "LandscapeOutlined", label: "Poetic natural scenes" },
        { icon: "GestureOutlined", label: "Traditional brush character" },
        { icon: "SpaOutlined", label: "Elegant & harmonious" },
      ],
      why: [
        "Traditional brushwork and generous negative space pair naturally with QR geometry.",
        "The style is especially suitable for tea, hospitality, culture, wellness, and premium food brands.",
        "Mountains, bamboo, cranes, blossoms, and calligraphic forms create compositions with a calm visual rhythm.",
      ],
      useCases: [
        "Tea and food packaging",
        "Cultural events",
        "Hospitality and wellness",
        "Galleries and museums",
      ],
      promptIdeas: [
        "misty mountains, pine trees, pavilion, waterfall, traditional brush painting",
        "red-crowned cranes among bamboo and plum blossoms",
        "ceramic teapot, tea cups, bamboo tray, loose tea leaves",
        "peaches, porcelain bowl, silk cloth, flowering branches",
        "lotus flowers and koi fish in a quiet garden pond",
        "moon gate, stone path, bamboo grove, distant mountains",
      ],
      perfectFor: [
        {
          title: "Tea & Culinary",
          description: "Elegant packaging, menus, and tasting experiences",
          icon: "EmojiFoodBeverageOutlined",
          imageUrl: "https://qrartimages.s3.us-west-1.amazonaws.com/product-placements/chinese-art-tea-culinary.png",
        },
        {
          title: "Cultural Events",
          description: "Distinctive signage and printed event material",
          icon: "FestivalOutlined",
          imageUrl: "https://qrartimages.s3.us-west-1.amazonaws.com/product-placements/chinese-art-cultural-events.png",
        },
        {
          title: "Wellness & Hospitality",
          description: "Calm, premium visuals for guest experiences",
          icon: "SpaOutlined",
          imageUrl: "https://qrartimages.s3.us-west-1.amazonaws.com/product-placements/chinese-art-wellness-hospitality.png",
        },
      ],
    },
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
      tagline: "Soft washes and delicate painterly blends.",
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
      perfectFor: [
        {
          title: "Wedding Stationery",
          description: "Elegant saves, invites & thank you cards",
          icon: "FavoriteBorderOutlined",
          imageUrl: "https://qrartimages.s3.us-west-1.amazonaws.com/product-placements/watercolor-wedding-stationery.png",
        },
        {
          title: "Menus & Events",
          description: "Beautiful menus and event signage that guests love",
          icon: "LocalCafeOutlined",
          imageUrl: "https://qrartimages.s3.us-west-1.amazonaws.com/product-placements/watercolor-menus-events.png",
        },
        {
          title: "Real Estate & Property",
          description: "Soft, artistic marketing for listings and developments",
          icon: "TravelExploreOutlined",
          imageUrl: "https://qrartimages.s3.us-west-1.amazonaws.com/product-placements/watercolor-real-estate-property.png",
        },
      ],
    },
  },
  {
    id: "6a4cfaee4021f21026e477f7",
    title: "Ghibli",
    image_url:
      "https://qrartimages.s3.us-west-1.amazonaws.com/6a4bbb07890b1939b5192cd8.png",
    // Public-facing copy uses "Whimsical Anime," never "Ghibli"/"Studio
    // Ghibli" — avoids implying official affiliation with the studio.
    // The internal title/id stay "Ghibli" to match the Mongo style_title
    // the generation pipeline and getImages() depend on.
    landingPage: {
      slug: "ghibli-qr-code",
      tagline: "Whimsical anime scenes full of charm.",
      // Name used in template-derived visible copy (Examples heading, CTAs,
      // alt text) in place of the internal title "Ghibli". See
      // styleDisplayName() and the /styles/[slug] page template.
      displayName: "Whimsical Anime",
      metaTitle:
        "Whimsical Anime QR Code Generator — Cozy Storybook QR Art | QR AI",
      metaDescription:
        "Create whimsical hand-painted anime QR codes featuring cozy fantasy worlds, nature, and everyday wonder with QR AI.",
      badge: "Whimsical Anime Style",
      headingLines: ["Whimsical Anime", "QR Codes"],
      headingAccent: "QR",
      intro:
        "Warm light, storybook landscapes, and cozy everyday details turn your QR code into a scene filled with imagination and wonder.",
      exampleCaption:
        "Real, scannable whimsical anime QR code — made with QR AI",
      features: [
        { icon: "AutoStoriesOutlined", label: "Storybook atmosphere" },
        { icon: "ForestOutlined", label: "Nature-rich worlds" },
        { icon: "FavoriteBorderOutlined", label: "Warm emotional charm" },
      ],
      why: [
        "Cozy environments and expressive natural details make the QR code feel like part of a larger story.",
        "The style is ideal for family events, travel, cafés, creators, and imaginative brands.",
        "Soft painted backgrounds and recognizable silhouettes create a warm, accessible result.",
      ],
      useCases: [
        "Family and children's events",
        "Cafés and bakeries",
        "Travel and nature experiences",
        "Creator and fan communities",
      ],
      promptIdeas: [
        "cozy bakery at sunrise, bread baskets, flowers, warm painted light",
        "small cottage in a lush forest, moss, lanterns, winding path",
        "ceramic teapot, pastries, fresh flowers, lace tablecloth",
        "mushrooms, pinecones, moss, fern leaves, acorns, magical forest table",
        "train crossing a green valley beneath a bright summer sky",
        "seaside town, bicycles, laundry lines, distant islands",
      ],
      perfectFor: [
        {
          title: "Family Events",
          description: "Warm invitations, activities, and celebration material",
          icon: "FamilyRestroomOutlined",
          imageUrl: "https://qrartimages.s3.us-west-1.amazonaws.com/product-placements/ghibli-family-events.png",
        },
        {
          title: "Travel & Nature",
          description: "Whimsical guides, maps, and destination content",
          icon: "ForestOutlined",
          imageUrl: "https://qrartimages.s3.us-west-1.amazonaws.com/product-placements/ghibli-travel-nature.png",
        },
        {
          title: "Publishing & Media",
          description: "Cover art for travel magazines and guidebooks",
          icon: "AutoStoriesOutlined",
          imageUrl: "https://qrartimages.s3.us-west-1.amazonaws.com/product-placements/ghibli-publishing-media.png",
        },
      ],
    },
  },
  {
    id: "6a4cfaee4021f21026e477f8",
    title: "Cyberpunk",
    image_url:
      "https://qrartimages.s3.us-west-1.amazonaws.com/6a4508cc3b23a83b1fa7b4c3.png",
    landingPage: {
      slug: "cyberpunk-qr-code",
      tagline: "Neon lights and futuristic urban vibes.",
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
          title: "Music & Nightlife",
          description: "High-energy posters, screens, and venue signage",
          icon: "NightlifeOutlined",
          imageUrl: "https://qrartimages.s3.us-west-1.amazonaws.com/product-placements/cyberpunk-music-nightlife.png",
        },
        {
          title: "Events & Tickets",
          description: "Bold tickets and passes for races and live events",
          icon: "CelebrationOutlined",
          imageUrl: "https://qrartimages.s3.us-west-1.amazonaws.com/product-placements/cyberpunk-events-tickets.png",
        },
        {
          title: "Digital Art & NFTs",
          description: "Futuristic collections and gallery drops",
          icon: "MemoryOutlined",
          imageUrl: "https://qrartimages.s3.us-west-1.amazonaws.com/product-placements/cyberpunk-digital-art-nfts.png",
        },
      ],
    },
  },
  {
    id: "6a4cfaef4021f21026e477f9",
    title: "Illustration",
    image_url:
      "https://qrartimages.s3.us-west-1.amazonaws.com/6a4bb59e2cfa329e8d58854c.png",
    landingPage: {
      slug: "illustration-qr-code",
      tagline: "Creative illustrated scenes for any idea.",
      metaTitle:
        "Illustration QR Code Generator — Custom Illustrated QR Art | QR AI",
      metaDescription:
        "Create custom illustrated QR codes with expressive characters, scenes, and colorful graphic storytelling using QR AI.",
      badge: "Illustration Style",
      headingLines: ["Illustrated", "QR Codes"],
      headingAccent: "QR",
      intro:
        "Expressive characters, polished scenes, and flexible visual storytelling make illustration one of the most versatile ways to transform a QR code.",
      exampleCaption: "Real, scannable Illustration QR code — made with QR AI",
      features: [
        { icon: "DrawOutlined", label: "Flexible visual storytelling" },
        { icon: "AutoAwesomeOutlined", label: "Distinctive custom scenes" },
        { icon: "InterestsOutlined", label: "Works across industries" },
      ],
      why: [
        "Illustration can adapt to nearly any subject, audience, or brand personality.",
        "The style balances clarity and creativity, making it useful for both marketing and personal projects.",
        "Characters, objects, and environments can be composed around QR structure in a deliberate way.",
      ],
      useCases: [
        "Brand campaigns",
        "Editorial and social content",
        "Events and invitations",
        "Packaging and merchandise",
      ],
      promptIdeas: [
        "garden picnic, fruit, flowers, patterned blanket, sunny afternoon",
        "roasted coffee beans, espresso cup, vintage grinder, burlap sack",
        "porcelain teacups, macarons, fresh flowers, lace tablecloth",
        "coconuts, mangoes, dragon fruit, monstera leaves",
        "busy neighborhood food market, colorful signs, friendly vendors",
        "creative desk, sketchbook, pencils, plants, coffee cup",
      ],
      perfectFor: [
        {
          title: "Brand Campaigns",
          description: "Custom artwork for launches and social storytelling",
          icon: "CampaignOutlined",
          imageUrl: "https://qrartimages.s3.us-west-1.amazonaws.com/product-placements/illustration-brand-campaigns.png",
        },
        {
          title: "Events & Invitations",
          description: "Memorable visuals for celebrations and gatherings",
          icon: "CelebrationOutlined",
          imageUrl: "https://qrartimages.s3.us-west-1.amazonaws.com/product-placements/illustration-events-invitations.png",
        },
        {
          title: "Packaging & Merch",
          description: "Flexible illustrated QR codes for physical products",
          icon: "Inventory2Outlined",
          imageUrl: "https://qrartimages.s3.us-west-1.amazonaws.com/product-placements/illustration-packaging-merch.png",
        },
      ],
    },
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

/**
 * Name to show in a style page's visible copy (headings, CTAs, alt text).
 * Falls back to the style's own title, but a style whose internal `title`
 * is trademark-sensitive (e.g. "Ghibli", kept for the Mongo style_title the
 * generation pipeline depends on) can set `landingPage.displayName` to a
 * safe public label ("Whimsical Anime") that the template renders instead.
 */
export function styleDisplayName(style) {
  return style?.landingPage?.displayName || style?.title;
}
