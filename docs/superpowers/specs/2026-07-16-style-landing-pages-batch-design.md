# Style landing pages — batch build (QRAI-138)

**Date:** 2026-07-16
**Epic:** [QRAI-138](https://biedermannchris.atlassian.net/browse/QRAI-138)
**Stories:** QRAI-139 (Ukiyo-e upgrade) through QRAI-150 (Illustration) — 12 stories, all in "Idea" status, none started.

## Goal

Build out `/styles/[slug]` landing pages for every remaining generator style, following the Watercolor reference implementation (architecture documented in `growth/seo/keyword-map.md`, "2026-07-16 update"). Each of the 12 stories already has a well-developed `landingPage` content draft written directly into its Jira description — this spec locks in that content with a small number of SEO and technical adjustments, so implementation is a mechanical data-entry pass, not a copywriting exercise.

## Architecture — no new components

Purely additive:
- 11 new `landingPage` entries in `src/_utils/ImageStyles.js` (Cyberpunk, Low Poly Art, Oil Painting, Expressionism, Photography, Vector Art, Doodle Art, Ink, Chinese art, Illustration, Ghibli).
- 1 upgrade: Ukiyo-e's existing `landingPage` entry gains the rich-template fields (`badge`, `headingLines`, `headingAccent`, `features`, `exampleCaption`, `promptIdeas`, `perfectFor`) so `isRichLandingPage()` flips it from the simple to the rich template.
- One real code change: `src/app/(marketing)/styles/[slug]/page.js`'s `ICONS` map currently only has 8 icons wired up (from Watercolor). The 12 stories' content references ~41 additional MUI icons. Add the imports and register them in `ICONS` — see "New icon imports" below. No other changes to `page.js`, `ExamplesCarousel.js`, or `HorizontalScroller.js`.

`generateStaticParams` already derives routes from `stylesWithLandingPage()`, so all 12 pages go live automatically once their data entries exist — no route/build config changes needed.

## Ghibli → "Whimsical Anime" (trademark)

The generator style is internally still called "Ghibli" (`style_title: "Ghibli"` in Mongo, `title: "Ghibli"` in `ImageStyles.js` — unchanged, since the generation pipeline and DB queries depend on it). Only the **public-facing landing page** uses a generic descriptor: slug `ghibli-qr-code` stays as the URL (already decided, matches real search behavior), but all visible copy (`badge`, `headingLines`, `intro`, meta tags) says "Whimsical Anime," never "Ghibli" or "Studio Ghibli" — avoids implying official affiliation while still ranking for the anime-art-style search intent.

## SEO adjustments from the Jira drafts

Two meta titles as originally drafted would have this site's own pages competing against each other for the same keyword:

| Style | Drafted title | Problem | Fixed title |
|---|---|---|---|
| Chinese Art | "...Traditional **Ink** QR Art \| QR AI" | Collides with the separate **Ink** style page | "...Traditional **Brush** QR Art \| QR AI" |
| Whimsical Anime (Ghibli) | "...Cozy **Illustrated** QR Art \| QR AI" | Collides with the separate **Illustration** style page | "...Cozy **Storybook** QR Art \| QR AI" |

All other titles/descriptions are used as drafted — they're already differentiated and on-brand.

**Unvalidated keywords (per the stories' own caveats):** Expressionism, Photography, Vector Art, Doodle Art, Ink, Chinese Art, Ghibli, and Illustration don't have Google Keyword Planner / Search Console validation yet (only Cyberpunk, Low Poly, and Oil Painting do, from the growth doc's Cluster B research). Copy proceeds on the stories' own reasonable-intent judgment; actual demand gets validated once Search Console has data on these pages (existing standing item in `keyword-map.md`'s "To validate later" section).

## Dropped field: `examples`

Every story's initial input includes an `examples: [{title, imageUrl: "TBD"}]` array (6 titled shot ideas per style). **This field is not read by any code** — `RichStyleLayout` fetches live Examples from MongoDB (`getImages({image_style, featured: true})`), it doesn't use static data. Adding it to `ImageStyles.js` would be dead data shipped to production. Instead, the shot lists are preserved below as a **shot-list appendix** — a curation checklist for when you generate fresh example images per style (per your note that you'll refresh examples/placements before publishing).

## Perfect For image placeholders

`perfectFor.imageUrl` was `"TBD"` in every story. Filled with best-fit matches from the 7 existing generic images in `public/product-placements/` (same placeholder approach as Watercolor — swap for real per-style imagery later, per your note). Fits are approximate by design; see per-style tables below.

## New icon imports needed in `page.js`

Existing 8 (already imported, keep): `BrushOutlined`, `QrCode2Outlined`, `LocalPrintshopOutlined`, `FavoriteBorderOutlined`, `LocalCafeOutlined`, `CelebrationOutlined`, `Inventory2Outlined`, `ShareOutlined`.

Add these 41, all from `@mui/icons-material`:
`RestaurantOutlined`, `TravelExploreOutlined`, `MuseumOutlined`, `BoltOutlined`, `MemoryOutlined`, `NightlifeOutlined`, `SportsEsportsOutlined`, `ViewInArOutlined`, `GridViewOutlined`, `DevicesOutlined`, `ArchitectureOutlined`, `PaletteOutlined`, `TextureOutlined`, `WineBarOutlined`, `HotelOutlined`, `AutoAwesomeOutlined`, `CampaignOutlined`, `MusicNoteOutlined`, `PhotoCameraOutlined`, `CenterFocusStrongOutlined`, `StorefrontOutlined`, `ShoppingBagOutlined`, `DrawOutlined`, `BrandingWatermarkOutlined`, `PrintOutlined`, `CheckroomOutlined`, `GestureOutlined`, `SentimentSatisfiedAltOutlined`, `ChildCareOutlined`, `SchoolOutlined`, `ContrastOutlined`, `MenuBookOutlined`, `DesignServicesOutlined`, `LandscapeOutlined`, `SpaOutlined`, `EmojiFoodBeverageOutlined`, `FestivalOutlined`, `AutoStoriesOutlined`, `ForestOutlined`, `FamilyRestroomOutlined`, `BakeryDiningOutlined`, `InterestsOutlined`.

## Real example-image counts (as of 2026-07-16, before your refresh)

| Style | Total | Featured |
|---|---|---|
| Low Poly Art | 112 | 10 |
| Photography | 97 | 8 |
| Ukiyo-e | 88 | 7 |
| Expressionism | 67 | 3 |
| Doodle Art | 46 | 5 |
| Vector Art | 42 | 6 |
| Ink | 38 | 2 |
| Oil Painting | 26 | 3 |
| Illustration | 26 | 2 |
| Chinese art | 27 | 3 |
| Ghibli | 16 | 1 |
| Cyberpunk | 12 | 1 |

Cyberpunk and Ghibli will render a very thin (1-card) Examples strip until you generate + feature more. Not blocking — the "Examples coming soon" fallback only triggers at zero, and you've said you'll refresh these before publish.

---

## Per-style content

Each block below is the final `landingPage` object to add to `src/_utils/ImageStyles.js`, keyed to the existing `styles` array entry by `title`. Content is the Jira draft as-is except where marked **[ADJUSTED]**.

### 1. Ukiyo-e (upgrade existing entry) — QRAI-139

Existing entry keeps its current `slug`, `metaTitle`, `metaDescription`, `intro`, `why`, `useCases`. **Remove** the existing `heading` field — `RichStyleLayout` never reads it (only `SimpleStyleLayout` does), so it becomes dead data once `headingLines`/`headingAccent` are added below. **Add:**

```js
badge: "Ukiyo-e Style",
headingLines: ["Ukiyo-e", "QR Codes"],
headingAccent: "QR",
exampleCaption: "Real, scannable Ukiyo-e QR code — made with QR AI",
features: [
  { icon: "BrushOutlined", label: "Bold woodblock aesthetic" },
  { icon: "QrCode2Outlined", label: "Strong visual structure" },
  { icon: "LocalPrintshopOutlined", label: "Made for posters & menus" },
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
  { title: "Japanese Restaurants", description: "Distinctive menus, table cards, and takeaway packaging", icon: "RestaurantOutlined", imageUrl: "/product-placements/restaurants-food-trucks.png" },
  { title: "Travel & Hospitality", description: "Memorable guides, posters, and guest experiences", icon: "TravelExploreOutlined", imageUrl: "/product-placements/events-exhibitions.png" },
  { title: "Art & Culture", description: "Gallery signage, exhibitions, and cultural events", icon: "MuseumOutlined", imageUrl: "/product-placements/art-galleries.png" },
],
```

Shot list (for future curation, not shipped in code): Great Wave, Mount Fuji, Koi Garden, Lantern Alley, Sushi Still Life, Cherry Blossoms.

### 2. Cyberpunk — QRAI-140

```js
landingPage: {
  slug: "cyberpunk-qr-code",
  metaTitle: "Cyberpunk QR Code Generator — Neon Futuristic QR Art | QR AI",
  metaDescription: "Create neon cyberpunk QR codes with futuristic cities, glowing signs, and high-tech atmosphere using QR AI.",
  badge: "Cyberpunk Style",
  headingLines: ["Cyberpunk", "QR Codes"],
  headingAccent: "QR",
  intro: "Neon light, futuristic cityscapes, and high-tech atmosphere turn your QR code into a vivid portal to another world.",
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
  useCases: ["Gaming and esports", "Nightclubs and music events", "Technology products", "Web3 and digital communities"],
  promptIdeas: [
    "rainy neon alley, holographic signs, crowded futuristic city",
    "female DJ in a cyberpunk club, lasers, glowing control panels",
    "ramen bowl, chopsticks, neon bottles, metallic counter, pink and blue light",
    "energy drink cans, headphones, circuit boards, holographic reflections",
    "futuristic coffee bar, chrome espresso machine, glowing steam",
    "cybernetic flowers in glass vessels, dark laboratory table",
  ],
  perfectFor: [
    { title: "Gaming & Esports", description: "Neon QR art for launches, tournaments, and communities", icon: "SportsEsportsOutlined", imageUrl: "/product-placements/apparel-merch.png" },
    { title: "Music & Nightlife", description: "High-energy posters, screens, and venue signage", icon: "NightlifeOutlined", imageUrl: "/product-placements/music-nightlife.png" },
    { title: "Technology", description: "Futuristic QR visuals for products and events", icon: "MemoryOutlined", imageUrl: "/product-placements/business-branding.png" },
  ],
},
```

Shot list: Neon Alley, Future DJ, Cyber City, Hologram Bar, Neon Noodles, Tech Still Life.

### 3. Low Poly Art — QRAI-141

```js
landingPage: {
  slug: "low-poly-qr-code",
  metaTitle: "Low Poly QR Code Generator — Geometric 3D QR Art | QR AI",
  metaDescription: "Create geometric low-poly QR codes with faceted shapes and modern 3D character. Generate scannable QR art with QR AI.",
  badge: "Low Poly Style",
  headingLines: ["Low Poly", "QR Codes"],
  headingAccent: "QR",
  intro: "Faceted geometry and crisp polygonal forms give your QR code a modern, dimensional look with unmistakable digital character.",
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
  useCases: ["Gaming and esports", "Technology campaigns", "Architecture and real estate", "Product launches"],
  promptIdeas: [
    "faceted fox in a geometric forest, low poly mountains",
    "futuristic city skyline made from angular polygonal forms",
    "crystal mountains beneath a glowing sunset",
    "lemons, oranges, olive branches, folded cloth, geometric still life",
    "coffee grinder, espresso cup, roasted beans, faceted geometry",
    "coconuts, mangoes, dragon fruit, monstera leaves, polygonal forms",
  ],
  perfectFor: [
    { title: "Gaming & Esports", description: "Distinctive graphics for communities and events", icon: "SportsEsportsOutlined", imageUrl: "/product-placements/apparel-merch.png" },
    { title: "Tech Products", description: "Modern launch assets, packaging, and demos", icon: "DevicesOutlined", imageUrl: "/product-placements/business-branding.png" },
    { title: "Architecture", description: "Geometric QR artwork for properties and studios", icon: "ArchitectureOutlined", imageUrl: "/product-placements/art-galleries.png" },
  ],
},
```

Shot list: Polygon Fox, Crystal Mountains, Futuristic City, Geometric Fruit, Robot Head, Faceted Forest.

### 4. Oil Painting — QRAI-142

```js
landingPage: {
  slug: "oil-painting-qr-code",
  metaTitle: "Oil Painting QR Code Generator — Rich Painted QR Art | QR AI",
  metaDescription: "Create richly colored oil-painting QR codes with visible brushwork and gallery-like depth using QR AI.",
  badge: "Oil Painting Style",
  headingLines: ["Oil Painting", "QR Codes"],
  headingAccent: "QR",
  intro: "Rich pigment, visible brushwork, and luminous color transform your QR code into artwork with depth, warmth, and presence.",
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
  useCases: ["Wine and gourmet products", "Hotels and restaurants", "Art prints and exhibitions", "Luxury packaging"],
  promptIdeas: [
    "wine bottles, grapes, cheese, figs, candlelight, rich oil painting",
    "pumpkins, apples, pears, dried leaves, cinnamon sticks",
    "roasted coffee beans, espresso cup, vintage grinder, burlap sack",
    "sunflowers in a ceramic vase, dark background, defined golden color",
    "rustic Italian table, tomatoes, basil, olive oil, warm light",
    "mountain lodge terrace, wine glasses, sunset, expressive brushwork",
  ],
  perfectFor: [
    { title: "Wine & Gourmet", description: "Rich artwork for labels, menus, and tastings", icon: "WineBarOutlined", imageUrl: "/product-placements/restaurants-food-trucks.png" },
    { title: "Luxury Hospitality", description: "Elegant guest material for hotels and restaurants", icon: "HotelOutlined", imageUrl: "/product-placements/events-exhibitions.png" },
    { title: "Art Prints", description: "Decorative QR designs made to be displayed", icon: "MuseumOutlined", imageUrl: "/product-placements/art-galleries.png" },
  ],
},
```

Shot list: Vineyard Table, Floral Arrangement, Mediterranean Coast, Autumn Harvest, Mountain Lodge, Candlelit Dinner.

### 5. Expressionism — QRAI-143

```js
landingPage: {
  slug: "expressionism-qr-code",
  metaTitle: "Expressionist QR Code Generator — Bold Artistic QR Codes | QR AI",
  metaDescription: "Create expressive QR code art with energetic brushwork, vivid color, and emotional character. Free to try with QR AI.",
  badge: "Expressionism Style",
  headingLines: ["Expressionist", "QR Codes"],
  headingAccent: "QR",
  intro: "Energetic brushwork, exaggerated color, and emotional intensity turn every QR code into a bold visual statement.",
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
  useCases: ["Music and festival posters", "Creative brand campaigns", "Gallery and exhibition materials", "Editorial and cultural projects"],
  promptIdeas: [
    "stormy coastline, red sky, windswept trees, dramatic brushstrokes",
    "jazz musicians in a crowded club, glowing stage lights",
    "wildflowers in a ceramic vase, saturated colors, dark table",
    "oranges, blue bottle, folded cloth, expressive shadows",
    "coffee cup, scattered beans, vintage grinder, bold painted forms",
    "pumpkins, apples, dried leaves, cinnamon sticks, vivid autumn color",
  ],
  perfectFor: [
    { title: "Music & Nightlife", description: "High-impact posters, tickets, and venue graphics", icon: "MusicNoteOutlined", imageUrl: "/product-placements/music-nightlife.png" },
    { title: "Creative Campaigns", description: "Expressive visuals for brands with personality", icon: "CampaignOutlined", imageUrl: "/product-placements/business-branding.png" },
    { title: "Exhibitions", description: "Art-led signage and interactive gallery material", icon: "MuseumOutlined", imageUrl: "/product-placements/art-galleries.png" },
  ],
},
```

Shot list: Electric Portrait, City at Night, Stormy Coast, Wild Bouquet, Fruit and Color, Jazz Session.

### 6. Photography — QRAI-144

```js
landingPage: {
  slug: "photography-qr-code",
  metaTitle: "Photorealistic QR Code Generator — AI Photo QR Codes | QR AI",
  metaDescription: "Blend your QR code into a photorealistic scene. Create detailed, scannable AI photo QR codes with QR AI.",
  badge: "Photography Style",
  headingLines: ["Photorealistic", "QR Codes"],
  headingAccent: "QR",
  intro: "Natural light, realistic materials, and cinematic detail make your QR code feel embedded in a real photographed scene.",
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
  useCases: ["Food and beverage marketing", "Travel and destination campaigns", "Real estate and hospitality", "Product and lifestyle advertising"],
  promptIdeas: [
    "rustic Italian table, tomatoes, basil, olive oil, warm trattoria lighting",
    "roasted coffee beans, espresso cup, vintage grinder, burlap sack",
    "ceramic teapot, matcha bowl, bamboo whisk, cherry blossoms",
    "lemons, oranges, olive branches, linen cloth, soft window light",
    "luxury villa perched on a cliff at sunset, ocean view",
    "whisky tasting on a Swiss terrace, mountains, wooden table, golden hour",
  ],
  perfectFor: [
    { title: "Food & Beverage", description: "Realistic menus, campaigns, and product scenes", icon: "RestaurantOutlined", imageUrl: "/product-placements/restaurants-food-trucks.png" },
    { title: "Travel & Property", description: "Destination, hotel, and real-estate marketing", icon: "TravelExploreOutlined", imageUrl: "/product-placements/events-exhibitions.png" },
    { title: "Product Advertising", description: "Lifestyle imagery that makes products feel tangible", icon: "ShoppingBagOutlined", imageUrl: "/product-placements/business-branding.png" },
  ],
},
```

Shot list: Italian Table, Mountain Cabin, Luxury Villa, Coffee Bar, Skincare Flat Lay, Beach Festival.

### 7. Vector Art — QRAI-145

```js
landingPage: {
  slug: "vector-art-qr-code",
  metaTitle: "Vector Art QR Code Generator — Clean Graphic QR Designs | QR AI",
  metaDescription: "Create clean vector-style QR codes with bold shapes, crisp edges, and modern graphic character using QR AI.",
  badge: "Vector Art Style",
  headingLines: ["Vector Art", "QR Codes"],
  headingAccent: "QR",
  intro: "Clean shapes, crisp edges, and confident color turn your QR code into polished graphic artwork built for modern brands.",
  exampleCaption: "Real, scannable Vector Art QR code — made with QR AI",
  features: [
    { icon: "DrawOutlined", label: "Crisp graphic shapes" },
    { icon: "BrandingWatermarkOutlined", label: "Brand-friendly design" },
    { icon: "PrintOutlined", label: "Strong at any size" },
  ],
  why: [
    "Flat shapes and controlled color produce a clean, professional look suitable for brand systems.",
    "The style works equally well on screens, packaging, posters, and merchandise.",
    "Simplified forms keep compositions readable at a glance and support strong scan performance.",
  ],
  useCases: ["Brand and marketing campaigns", "Packaging and labels", "Apparel and merchandise", "Infographics and digital products"],
  promptIdeas: [
    "modern café counter, espresso machine, pastries, bold flat shapes",
    "lemons, oranges, olive branches, linen cloth, clean vector illustration",
    "coconuts, mangoes, dragon fruit, monstera leaves, bright vector art",
    "ceramic teapot, matcha bowl, bamboo whisk, cherry blossoms",
    "wildflowers in a simple vase, geometric leaves, flat color",
    "city skyline, bicycles, trees, clouds, contemporary graphic illustration",
  ],
  perfectFor: [
    { title: "Branding", description: "Polished graphics for campaigns and identity systems", icon: "BrandingWatermarkOutlined", imageUrl: "/product-placements/business-branding.png" },
    { title: "Packaging", description: "Clean QR artwork for labels, boxes, and inserts", icon: "Inventory2Outlined", imageUrl: "/product-placements/restaurants-food-trucks.png" },
    { title: "Merchandise", description: "Bold designs for apparel, stickers, and accessories", icon: "CheckroomOutlined", imageUrl: "/product-placements/apparel-merch.png" },
  ],
},
```

Shot list: Modern Café, Tropical Fruit, City Map, Geometric Flowers, Tech Workspace, Festival Shapes.

### 8. Doodle Art — QRAI-146

```js
landingPage: {
  slug: "doodle-art-qr-code",
  metaTitle: "Doodle QR Code Generator — Playful Hand-Drawn QR Art | QR AI",
  metaDescription: "Create playful doodle-style QR codes filled with hand-drawn charm. Generate fun, scannable QR art with QR AI.",
  badge: "Doodle Art Style",
  headingLines: ["Doodle Art", "QR Codes"],
  headingAccent: "QR",
  intro: "Loose lines, playful icons, and hand-drawn personality make every QR code feel friendly, spontaneous, and fun.",
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
  useCases: ["Kids and education", "Creator profiles", "Community events", "Casual cafés and small businesses"],
  promptIdeas: [
    "coffee cup, croissant, beans, tiny stars, playful hand-drawn doodles",
    "school books, pencils, ruler, backpack, cheerful doodle icons",
    "mushrooms, pinecones, moss, fern leaves, acorns, sketchy doodles",
    "teacups, macarons, flowers, lace tablecloth, whimsical line art",
    "camera, passport, map, sunglasses, travel doodle collection",
    "birthday cake, balloons, gifts, confetti, hand-drawn icons",
  ],
  perfectFor: [
    { title: "Education", description: "Friendly QR codes for classes and learning materials", icon: "SchoolOutlined", imageUrl: "/product-placements/business-branding.png" },
    { title: "Creators", description: "Playful portfolio, profile, and social links", icon: "BrushOutlined", imageUrl: "/product-placements/art-galleries.png" },
    { title: "Family Events", description: "Invitations, activities, and celebration signage", icon: "CelebrationOutlined", imageUrl: "/product-placements/weddings-stationery.png" },
  ],
},
```

Shot list: Happy Café, School Supplies, Travel Sketches, Garden Notes, Birthday Party, Creative Desk.

### 9. Ink — QRAI-147

```js
landingPage: {
  slug: "ink-qr-code",
  metaTitle: "Ink QR Code Generator — Elegant Black Ink QR Art | QR AI",
  metaDescription: "Create elegant ink-style QR codes with expressive linework and high-contrast detail. Generate scannable ink QR art with QR AI.",
  badge: "Ink Style",
  headingLines: ["Ink", "QR Codes"],
  headingAccent: "QR",
  intro: "Expressive linework, deep contrast, and organic brush marks give your QR code a refined, timeless visual presence.",
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
  useCases: ["Premium menus and packaging", "Editorial and publishing", "Gallery and museum signage", "Tattoo, fashion, and design studios"],
  promptIdeas: [
    "raven perched on a twisted branch, black ink wash",
    "misty mountains, pine trees, distant temple, expressive ink",
    "ceramic teapot, matcha bowl, bamboo whisk, cherry blossoms",
    "mushrooms, pinecones, moss, fern leaves, acorns, botanical ink study",
    "wine bottle, grapes, corkscrew, folded linen, ink illustration",
    "dried lavender bundles, candles, linen fabric, delicate linework",
  ],
  perfectFor: [
    { title: "Premium Hospitality", description: "Elegant menus, wine lists, and guest collateral", icon: "WineBarOutlined", imageUrl: "/product-placements/events-exhibitions.png" },
    { title: "Editorial Design", description: "Refined QR art for books, magazines, and prints", icon: "MenuBookOutlined", imageUrl: "/product-placements/art-galleries.png" },
    { title: "Art & Fashion", description: "Distinctive material for studios and exhibitions", icon: "DesignServicesOutlined", imageUrl: "/product-placements/apparel-merch.png" },
  ],
},
```

Shot list: Botanical Study, Raven and Branches, Mountain Mist, Architectural Lines, Tea Still Life, Wild Mushrooms.

### 10. Chinese art — QRAI-148 **[ADJUSTED: metaTitle]**

`style_title` in Mongo is `"Chinese art"` (lowercase "art") — query and `title` lookup must match exactly.

```js
landingPage: {
  slug: "chinese-art-qr-code",
  metaTitle: "Chinese Art QR Code Generator — Traditional Brush QR Art | QR AI", // [ADJUSTED] was "...Traditional Ink QR Art..." — collided with the Ink style page
  metaDescription: "Create Chinese-art-inspired QR codes with elegant brushwork, natural motifs, and traditional visual character using QR AI.",
  badge: "Chinese Art Style",
  headingLines: ["Chinese Art", "QR Codes"],
  headingAccent: "QR",
  intro: "Graceful brushwork, poetic landscapes, and symbolic natural motifs give your QR code a calm, culturally distinctive character.",
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
  useCases: ["Tea and food packaging", "Cultural events", "Hospitality and wellness", "Galleries and museums"],
  promptIdeas: [
    "misty mountains, pine trees, pavilion, waterfall, traditional brush painting",
    "red-crowned cranes among bamboo and plum blossoms",
    "ceramic teapot, tea cups, bamboo tray, loose tea leaves",
    "peaches, porcelain bowl, silk cloth, flowering branches",
    "lotus flowers and koi fish in a quiet garden pond",
    "moon gate, stone path, bamboo grove, distant mountains",
  ],
  perfectFor: [
    { title: "Tea & Culinary", description: "Elegant packaging, menus, and tasting experiences", icon: "EmojiFoodBeverageOutlined", imageUrl: "/product-placements/restaurants-food-trucks.png" },
    { title: "Cultural Events", description: "Distinctive signage and printed event material", icon: "FestivalOutlined", imageUrl: "/product-placements/events-exhibitions.png" },
    { title: "Wellness & Hospitality", description: "Calm, premium visuals for guest experiences", icon: "SpaOutlined", imageUrl: "/product-placements/art-galleries.png" },
  ],
},
```

Shot list: Mountain Pavilion, Bamboo and Cranes, Tea Ceremony, Plum Blossoms, Koi Pond, Moon Gate.

### 11. Ghibli → "Whimsical Anime" — QRAI-149 **[ADJUSTED: metaTitle]**

Internal `title` in `ImageStyles.js` stays `"Ghibli"` (matches DB `style_title`, drives generation). Slug stays `ghibli-qr-code`. All visible copy uses "Whimsical Anime" — no "Ghibli"/"Studio Ghibli" wording anywhere in rendered content.

```js
landingPage: {
  slug: "ghibli-qr-code",
  metaTitle: "Whimsical Anime QR Code Generator — Cozy Storybook QR Art | QR AI", // [ADJUSTED] was "...Cozy Illustrated QR Art..." — collided with the Illustration style page
  metaDescription: "Create whimsical hand-painted anime QR codes featuring cozy fantasy worlds, nature, and everyday wonder with QR AI.",
  badge: "Whimsical Anime Style",
  headingLines: ["Whimsical Anime", "QR Codes"],
  headingAccent: "QR",
  intro: "Warm light, storybook landscapes, and cozy everyday details turn your QR code into a scene filled with imagination and wonder.",
  exampleCaption: "Real, scannable whimsical anime QR code — made with QR AI",
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
  useCases: ["Family and children's events", "Cafés and bakeries", "Travel and nature experiences", "Creator and fan communities"],
  promptIdeas: [
    "cozy bakery at sunrise, bread baskets, flowers, warm painted light",
    "small cottage in a lush forest, moss, lanterns, winding path",
    "ceramic teapot, pastries, fresh flowers, lace tablecloth",
    "mushrooms, pinecones, moss, fern leaves, acorns, magical forest table",
    "train crossing a green valley beneath a bright summer sky",
    "seaside town, bicycles, laundry lines, distant islands",
  ],
  perfectFor: [
    { title: "Family Events", description: "Warm invitations, activities, and celebration material", icon: "FamilyRestroomOutlined", imageUrl: "/product-placements/weddings-stationery.png" },
    { title: "Cafés & Bakeries", description: "Cozy menus and packaging with storybook charm", icon: "BakeryDiningOutlined", imageUrl: "/product-placements/restaurants-food-trucks.png" },
    { title: "Travel & Nature", description: "Whimsical guides, maps, and destination content", icon: "ForestOutlined", imageUrl: "/product-placements/events-exhibitions.png" },
  ],
},
```

Shot list: Forest Cottage, Cozy Bakery, Flying Adventure, Rainy Train, Garden Tea, Seaside Town.

### 12. Illustration — QRAI-150

```js
landingPage: {
  slug: "illustration-qr-code",
  metaTitle: "Illustration QR Code Generator — Custom Illustrated QR Art | QR AI",
  metaDescription: "Create custom illustrated QR codes with expressive characters, scenes, and colorful graphic storytelling using QR AI.",
  badge: "Illustration Style",
  headingLines: ["Illustrated", "QR Codes"],
  headingAccent: "QR",
  intro: "Expressive characters, polished scenes, and flexible visual storytelling make illustration one of the most versatile ways to transform a QR code.",
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
  useCases: ["Brand campaigns", "Editorial and social content", "Events and invitations", "Packaging and merchandise"],
  promptIdeas: [
    "garden picnic, fruit, flowers, patterned blanket, sunny afternoon",
    "roasted coffee beans, espresso cup, vintage grinder, burlap sack",
    "porcelain teacups, macarons, fresh flowers, lace tablecloth",
    "coconuts, mangoes, dragon fruit, monstera leaves",
    "busy neighborhood food market, colorful signs, friendly vendors",
    "creative desk, sketchbook, pencils, plants, coffee cup",
  ],
  perfectFor: [
    { title: "Brand Campaigns", description: "Custom artwork for launches and social storytelling", icon: "CampaignOutlined", imageUrl: "/product-placements/business-branding.png" },
    { title: "Events & Invitations", description: "Memorable visuals for celebrations and gatherings", icon: "CelebrationOutlined", imageUrl: "/product-placements/weddings-stationery.png" },
    { title: "Packaging & Merch", description: "Flexible illustrated QR codes for physical products", icon: "Inventory2Outlined", imageUrl: "/product-placements/apparel-merch.png" },
  ],
},
```

Shot list: Creative Studio, Garden Picnic, City Adventure, Food Market, Botanical Shelf, Music Festival.

---

## Testing / verification plan

- `npm run lint` after edits (icon imports, data shape).
- Manually load each of the 12 new routes in dev (`/styles/<slug>`) and confirm: rich template renders (not simple), hero image loads, all `features` icons render (catches any icon-name typo — `ICONS[f.icon]` silently omits on a miss rather than erroring), Examples strip shows the real count or the "coming soon" fallback for zero, prompt-idea pills deep-link correctly, Perfect For shows exactly 3 cards with images.
- Confirm `generateStaticParams` picks up all 12 new slugs (check `/sitemap.xml` or build output).
- Spot-check `findStyleByLandingSlug("chinese-art-qr-code")` resolves the `"Chinese art"` (lowercase) title correctly, since Mongo/`ImageStyles.js` casing is inconsistent with the "Chinese Art" display copy.

## Out of scope

- QRAI-151 ("UPDATE Watercolor sections") — separate story, not part of this batch.
- Curating more featured images for Cyberpunk/Ghibli, and replacing generic `/product-placements/` images with real per-style photography — you're handling both before publish.
- Keyword volume validation for the 8 unresearched styles — deferred to post-launch Search Console data per the growth doc.
