# Style Landing Pages Batch (QRAI-138) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `/styles/[slug]` landing pages for all 12 remaining generator styles (QRAI-139 through QRAI-150) by adding `landingPage` data entries to `src/_utils/ImageStyles.js`, following the existing Watercolor rich-template pattern. No new routes or components — `src/app/(marketing)/styles/[slug]/page.js` already renders any style with a populated `landingPage.promptIdeas`/`perfectFor`.

**Architecture:** Purely additive data (11 new entries + 1 upgrade of the existing Ukiyo-e entry), plus one small refactor: extract the page's inline icon map into its own module (`src/_utils/styleIcons.js`) so it can hold the ~41 new icons the 12 stories reference, and so a Jest test can validate every `icon` string in the data actually resolves (today a typo silently omits the icon with no error — `page.js`'s `{Icon && <Icon .../>}` guard swallows misses).

**Tech Stack:** Next.js 14 App Router (server components), MUI v5 icons, Jest + `next/jest` (`npm run test:frontend`), ESLint (`npm run lint`).

## Global Constraints

- Exact copy for every style comes from `docs/superpowers/specs/2026-07-16-style-landing-pages-batch-design.md` — do not paraphrase or improvise content; the spec content is what's below verbatim.
- Two meta titles are intentionally different from the original Jira drafts (SEO de-duplication): Chinese Art uses "Traditional Brush QR Art" (not "...Ink..."), and Ghibli/Whimsical Anime uses "Cozy Storybook QR Art" (not "...Illustrated...").
- The Ghibli style's internal `title` stays `"Ghibli"` in `ImageStyles.js` (matches the Mongo `style_title` used by the generation pipeline and by `getImages`) — only the landing page's **visible copy** uses "Whimsical Anime." No rendered string may contain "Ghibli" or "Studio Ghibli".
- Every rich `landingPage` needs exactly 3 `features` and at least 3 `perfectFor` cards (page.js renders `perfectFor.slice(0, 3)` — Watercolor's existing entry has 5, which is fine and out of scope to trim; new entries in this batch each get exactly 3).
- `perfectFor[].imageUrl` values must point at one of the 7 existing files in `public/product-placements/`: `apparel-merch.png`, `art-galleries.png`, `business-branding.png`, `events-exhibitions.png`, `music-nightlife.png`, `restaurants-food-trucks.png`, `weddings-stationery.png`.
- Do not add the `examples: [{title, imageUrl}]` field from the Jira drafts to any `landingPage` entry — it's not read anywhere in the codebase (`RichStyleLayout` fetches live examples from MongoDB instead) and would be dead data.
- Out of scope: QRAI-151 (Watercolor updates), curating more featured images for Cyberpunk/Ghibli, replacing generic `/product-placements/` images with real per-style photography, keyword-volume validation.

---

## File structure

- **Create:** `src/_utils/styleIcons.js` — exports `STYLE_ICONS`, a name → MUI-icon-component map covering all icons any style's `landingPage.features`/`perfectFor` can reference.
- **Modify:** `src/app/(marketing)/styles/[slug]/page.js` — replace the inline 8-icon `ICONS` map + its individual imports with a single import from `styleIcons.js`.
- **Modify:** `src/_utils/ImageStyles.js` — add/upgrade the 12 styles' `landingPage` entries.
- **Create:** `src/__tests__/styleIcons.test.js` — confirms the new module exports the icons the existing Watercolor entry depends on.
- **Create:** `src/__tests__/landingPages.test.js` — shape-invariant tests over every rich `landingPage`; guards all 12 data-entry tasks against typos (bad icon names, wrong slug pattern, wrong array lengths).

---

### Task 1: Extract the style icon map into its own module

**Files:**
- Create: `src/_utils/styleIcons.js`
- Modify: `src/app/(marketing)/styles/[slug]/page.js:1-31`
- Test: `src/__tests__/styleIcons.test.js`

**Interfaces:**
- Produces: `STYLE_ICONS` — a plain object exported from `src/_utils/styleIcons.js`, keyed by icon name string (e.g. `"BrushOutlined"`), valued by the imported MUI icon component. Every later task's `landingPage.features[].icon` / `perfectFor[].icon` strings must have a matching key here.

- [ ] **Step 1: Write the failing test**

Create `src/__tests__/styleIcons.test.js`:

```js
import { STYLE_ICONS } from '../_utils/styleIcons'

describe('STYLE_ICONS', () => {
  test('exports a truthy icon component for every icon key the existing Watercolor landingPage depends on', () => {
    const usedByWatercolor = [
      'BrushOutlined',
      'QrCode2Outlined',
      'LocalPrintshopOutlined',
      'FavoriteBorderOutlined',
      'LocalCafeOutlined',
      'CelebrationOutlined',
      'Inventory2Outlined',
      'ShareOutlined',
    ]
    for (const key of usedByWatercolor) {
      expect(STYLE_ICONS[key]).toBeTruthy()
    }
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:frontend -- src/__tests__/styleIcons.test.js`
Expected: FAIL with `Cannot find module '../_utils/styleIcons'`

- [ ] **Step 3: Create the styleIcons module**

Create `src/_utils/styleIcons.js`:

```js
import BrushOutlined from "@mui/icons-material/BrushOutlined";
import QrCode2Outlined from "@mui/icons-material/QrCode2Outlined";
import LocalPrintshopOutlined from "@mui/icons-material/LocalPrintshopOutlined";
import FavoriteBorderOutlined from "@mui/icons-material/FavoriteBorderOutlined";
import LocalCafeOutlined from "@mui/icons-material/LocalCafeOutlined";
import CelebrationOutlined from "@mui/icons-material/CelebrationOutlined";
import Inventory2Outlined from "@mui/icons-material/Inventory2Outlined";
import ShareOutlined from "@mui/icons-material/ShareOutlined";
import RestaurantOutlined from "@mui/icons-material/RestaurantOutlined";
import TravelExploreOutlined from "@mui/icons-material/TravelExploreOutlined";
import MuseumOutlined from "@mui/icons-material/MuseumOutlined";
import BoltOutlined from "@mui/icons-material/BoltOutlined";
import MemoryOutlined from "@mui/icons-material/MemoryOutlined";
import NightlifeOutlined from "@mui/icons-material/NightlifeOutlined";
import SportsEsportsOutlined from "@mui/icons-material/SportsEsportsOutlined";
import ViewInArOutlined from "@mui/icons-material/ViewInArOutlined";
import GridViewOutlined from "@mui/icons-material/GridViewOutlined";
import DevicesOutlined from "@mui/icons-material/DevicesOutlined";
import ArchitectureOutlined from "@mui/icons-material/ArchitectureOutlined";
import PaletteOutlined from "@mui/icons-material/PaletteOutlined";
import TextureOutlined from "@mui/icons-material/TextureOutlined";
import WineBarOutlined from "@mui/icons-material/WineBarOutlined";
import HotelOutlined from "@mui/icons-material/HotelOutlined";
import AutoAwesomeOutlined from "@mui/icons-material/AutoAwesomeOutlined";
import CampaignOutlined from "@mui/icons-material/CampaignOutlined";
import MusicNoteOutlined from "@mui/icons-material/MusicNoteOutlined";
import PhotoCameraOutlined from "@mui/icons-material/PhotoCameraOutlined";
import CenterFocusStrongOutlined from "@mui/icons-material/CenterFocusStrongOutlined";
import StorefrontOutlined from "@mui/icons-material/StorefrontOutlined";
import ShoppingBagOutlined from "@mui/icons-material/ShoppingBagOutlined";
import DrawOutlined from "@mui/icons-material/DrawOutlined";
import BrandingWatermarkOutlined from "@mui/icons-material/BrandingWatermarkOutlined";
import PrintOutlined from "@mui/icons-material/PrintOutlined";
import CheckroomOutlined from "@mui/icons-material/CheckroomOutlined";
import GestureOutlined from "@mui/icons-material/GestureOutlined";
import SentimentSatisfiedAltOutlined from "@mui/icons-material/SentimentSatisfiedAltOutlined";
import ChildCareOutlined from "@mui/icons-material/ChildCareOutlined";
import SchoolOutlined from "@mui/icons-material/SchoolOutlined";
import ContrastOutlined from "@mui/icons-material/ContrastOutlined";
import MenuBookOutlined from "@mui/icons-material/MenuBookOutlined";
import DesignServicesOutlined from "@mui/icons-material/DesignServicesOutlined";
import LandscapeOutlined from "@mui/icons-material/LandscapeOutlined";
import SpaOutlined from "@mui/icons-material/SpaOutlined";
import EmojiFoodBeverageOutlined from "@mui/icons-material/EmojiFoodBeverageOutlined";
import FestivalOutlined from "@mui/icons-material/FestivalOutlined";
import AutoStoriesOutlined from "@mui/icons-material/AutoStoriesOutlined";
import ForestOutlined from "@mui/icons-material/ForestOutlined";
import FamilyRestroomOutlined from "@mui/icons-material/FamilyRestroomOutlined";
import BakeryDiningOutlined from "@mui/icons-material/BakeryDiningOutlined";
import InterestsOutlined from "@mui/icons-material/InterestsOutlined";

export const STYLE_ICONS = {
  BrushOutlined,
  QrCode2Outlined,
  LocalPrintshopOutlined,
  FavoriteBorderOutlined,
  LocalCafeOutlined,
  CelebrationOutlined,
  Inventory2Outlined,
  ShareOutlined,
  RestaurantOutlined,
  TravelExploreOutlined,
  MuseumOutlined,
  BoltOutlined,
  MemoryOutlined,
  NightlifeOutlined,
  SportsEsportsOutlined,
  ViewInArOutlined,
  GridViewOutlined,
  DevicesOutlined,
  ArchitectureOutlined,
  PaletteOutlined,
  TextureOutlined,
  WineBarOutlined,
  HotelOutlined,
  AutoAwesomeOutlined,
  CampaignOutlined,
  MusicNoteOutlined,
  PhotoCameraOutlined,
  CenterFocusStrongOutlined,
  StorefrontOutlined,
  ShoppingBagOutlined,
  DrawOutlined,
  BrandingWatermarkOutlined,
  PrintOutlined,
  CheckroomOutlined,
  GestureOutlined,
  SentimentSatisfiedAltOutlined,
  ChildCareOutlined,
  SchoolOutlined,
  ContrastOutlined,
  MenuBookOutlined,
  DesignServicesOutlined,
  LandscapeOutlined,
  SpaOutlined,
  EmojiFoodBeverageOutlined,
  FestivalOutlined,
  AutoStoriesOutlined,
  ForestOutlined,
  FamilyRestroomOutlined,
  BakeryDiningOutlined,
  InterestsOutlined,
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:frontend -- src/__tests__/styleIcons.test.js`
Expected: PASS

- [ ] **Step 5: Refactor page.js to use the new module**

In `src/app/(marketing)/styles/[slug]/page.js`, replace lines 1-31 (everything from the top imports through the end of the inline `const ICONS = {...}` block) with:

```js
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Box, Typography, Button } from "@mui/material";
import ArrowOutwardOutlined from "@mui/icons-material/ArrowOutwardOutlined";
import {
  stylesWithLandingPage,
  findStyleByLandingSlug,
  isRichLandingPage,
} from "@/_utils/ImageStyles";
import { getImages } from "@/_utils/ImagesUtils";
import { STYLE_ICONS as ICONS } from "@/_utils/styleIcons";
import ExamplesCarousel from "./ExamplesCarousel";
```

This removes the 8 individual per-icon imports and the inline `const ICONS = {...}` object, replacing both with the single `STYLE_ICONS` import. Nothing else in the file changes — `ICONS[f.icon]` lookups later in the file work identically since the imported binding is still named `ICONS`.

- [ ] **Step 6: Verify the app still builds and lints**

Run: `npm run lint`
Expected: no errors (in particular, no "defined but never used" warnings for the old icon imports, since they're gone)

- [ ] **Step 7: Commit**

```bash
git add src/_utils/styleIcons.js src/app/\(marketing\)/styles/\[slug\]/page.js src/__tests__/styleIcons.test.js
git commit -m "refactor: extract style page icon map into styleIcons.js, add remaining icons for QRAI-138"
```

---

### Task 2: Add landing-page shape-invariant tests

**Files:**
- Create: `src/__tests__/landingPages.test.js`

**Interfaces:**
- Consumes: `styles`, `isRichLandingPage` from `src/_utils/ImageStyles.js`; `STYLE_ICONS` from `src/_utils/styleIcons.js` (Task 1).
- Produces: nothing new — this is a regression guard that every subsequent data task (Tasks 3-14) must keep passing.

- [ ] **Step 1: Write the test suite**

Create `src/__tests__/landingPages.test.js`:

```js
import { styles, isRichLandingPage } from '../_utils/ImageStyles'
import { STYLE_ICONS } from '../_utils/styleIcons'

const richStyles = () =>
  styles.filter((s) => s.landingPage && isRichLandingPage(s.landingPage))

describe('rich style landing pages — shape invariants', () => {
  test('every rich landingPage has exactly 3 features, each with a resolvable icon and non-empty label', () => {
    for (const s of richStyles()) {
      const lp = s.landingPage
      expect(lp.features).toHaveLength(3)
      for (const f of lp.features) {
        expect(STYLE_ICONS[f.icon]).toBeTruthy()
        expect(typeof f.label).toBe('string')
        expect(f.label.length).toBeGreaterThan(0)
      }
    }
  })

  test('every rich landingPage has at least 3 perfectFor cards, each with a resolvable icon and a product-placements imageUrl', () => {
    for (const s of richStyles()) {
      const lp = s.landingPage
      expect(lp.perfectFor.length).toBeGreaterThanOrEqual(3)
      for (const card of lp.perfectFor) {
        expect(STYLE_ICONS[card.icon]).toBeTruthy()
        expect(typeof card.title).toBe('string')
        expect(card.title.length).toBeGreaterThan(0)
        expect(typeof card.description).toBe('string')
        expect(card.description.length).toBeGreaterThan(0)
        expect(card.imageUrl.startsWith('/product-placements/')).toBe(true)
      }
    }
  })

  test('every rich landingPage has exactly 6 promptIdeas and a non-empty exampleCaption', () => {
    for (const s of richStyles()) {
      const lp = s.landingPage
      expect(lp.promptIdeas).toHaveLength(6)
      expect(typeof lp.exampleCaption).toBe('string')
      expect(lp.exampleCaption.length).toBeGreaterThan(0)
    }
  })

  test('every rich landingPage has a 2-line headingLines array whose second line contains headingAccent', () => {
    for (const s of richStyles()) {
      const lp = s.landingPage
      expect(lp.headingLines).toHaveLength(2)
      expect(lp.headingLines[1]).toContain(lp.headingAccent)
    }
  })

  test('every landingPage slug is unique and follows the "<words>-qr-code" convention', () => {
    const slugs = styles.filter((s) => s.landingPage).map((s) => s.landingPage.slug)
    expect(new Set(slugs).size).toBe(slugs.length)
    for (const slug of slugs) {
      expect(slug).toMatch(/^[a-z0-9-]+-qr-code$/)
    }
  })

  test('no landingPage carries the unused examples field', () => {
    for (const s of styles) {
      if (s.landingPage) {
        expect(s.landingPage.examples).toBeUndefined()
      }
    }
  })
})
```

- [ ] **Step 2: Run the tests and confirm they pass on the current codebase**

Run: `npm run test:frontend -- src/__tests__/landingPages.test.js`
Expected: PASS — 6 tests pass, all currently exercised against Watercolor (the only rich style right now). This suite now guards every style added in Tasks 3-14: if any of those tasks introduces a bad icon name, wrong array length, or malformed slug, this suite catches it.

- [ ] **Step 3: Commit**

```bash
git add src/__tests__/landingPages.test.js
git commit -m "test: add shape-invariant tests for rich style landing pages"
```

---

### Task 3: Upgrade Ukiyo-e to the rich template (QRAI-139)

**Files:**
- Modify: `src/_utils/ImageStyles.js` (the `"Ukiyo-e"` style object)

- [ ] **Step 1: Replace the Ukiyo-e style object**

In `src/_utils/ImageStyles.js`, find the style object with `title: "Ukiyo-e"` (currently lines 10-39, starting `id: "6a4cfaec4021f21026e477ed"` and ending with the `landingPage` object's closing `},`). Replace the whole object with:

```js
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
```

Note the previous `heading: "Ukiyo-e QR Code Generator"` field is gone — it was only read by the simple template, which this style no longer uses.

- [ ] **Step 2: Run the full frontend test suite**

Run: `npm run test:frontend`
Expected: PASS — `imageStyles.test.js` (unaffected, doesn't check `landingPage` shape) and `landingPages.test.js` (now covers Ukiyo-e too, since `isRichLandingPage` flips to `true` once `promptIdeas` is populated) both pass.

- [ ] **Step 3: Commit**

```bash
git add src/_utils/ImageStyles.js
git commit -m "feat(seo): upgrade Ukiyo-e style page to the rich template (QRAI-139)"
```

---

### Task 4: Add Cyberpunk landing page (QRAI-140)

**Files:**
- Modify: `src/_utils/ImageStyles.js` (the `"Cyberpunk"` style object)

- [ ] **Step 1: Add the landingPage entry**

In `src/_utils/ImageStyles.js`, find the style object with `title: "Cyberpunk"` (`id: "6a4cfaee4021f21026e477f8"`). It currently has no `landingPage` key. Replace it with:

```js
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
```

- [ ] **Step 2: Run the full frontend test suite**

Run: `npm run test:frontend`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/_utils/ImageStyles.js
git commit -m "feat(seo): add Cyberpunk style landing page (QRAI-140)"
```

---

### Task 5: Add Low Poly Art landing page (QRAI-141)

**Files:**
- Modify: `src/_utils/ImageStyles.js` (the `"Low Poly Art"` style object)

- [ ] **Step 1: Add the landingPage entry**

Find the style object with `title: "Low Poly Art"` (`id: "6a4cfaed4021f21026e477ef"`). Replace it with:

```js
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
```

- [ ] **Step 2: Run the full frontend test suite**

Run: `npm run test:frontend`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/_utils/ImageStyles.js
git commit -m "feat(seo): add Low Poly Art style landing page (QRAI-141)"
```

---

### Task 6: Add Oil Painting landing page (QRAI-142)

**Files:**
- Modify: `src/_utils/ImageStyles.js` (the `"Oil Painting"` style object)

- [ ] **Step 1: Add the landingPage entry**

Find the style object with `title: "Oil Painting"` (`id: "6a4cfaee4021f21026e477f4"`). Replace it with:

```js
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
```

- [ ] **Step 2: Run the full frontend test suite**

Run: `npm run test:frontend`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/_utils/ImageStyles.js
git commit -m "feat(seo): add Oil Painting style landing page (QRAI-142)"
```

---

### Task 7: Add Expressionism landing page (QRAI-143)

**Files:**
- Modify: `src/_utils/ImageStyles.js` (the `"Expressionism"` style object)

- [ ] **Step 1: Add the landingPage entry**

Find the style object with `title: "Expressionism"` (`id: "6a4cfaed4021f21026e477ee"`). Replace it with:

```js
  {
    id: "6a4cfaed4021f21026e477ee",
    title: "Expressionism",
    image_url:
      "https://qrartimages.s3.us-west-1.amazonaws.com/6a498f50dbeee01fccc37bc6.png",
    landingPage: {
      slug: "expressionism-qr-code",
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
          imageUrl: "/product-placements/music-nightlife.png",
        },
        {
          title: "Creative Campaigns",
          description: "Expressive visuals for brands with personality",
          icon: "CampaignOutlined",
          imageUrl: "/product-placements/business-branding.png",
        },
        {
          title: "Exhibitions",
          description: "Art-led signage and interactive gallery material",
          icon: "MuseumOutlined",
          imageUrl: "/product-placements/art-galleries.png",
        },
      ],
    },
  },
```

- [ ] **Step 2: Run the full frontend test suite**

Run: `npm run test:frontend`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/_utils/ImageStyles.js
git commit -m "feat(seo): add Expressionism style landing page (QRAI-143)"
```

---

### Task 8: Add Photography landing page (QRAI-144)

**Files:**
- Modify: `src/_utils/ImageStyles.js` (the `"Photography"` style object)

- [ ] **Step 1: Add the landingPage entry**

Find the style object with `title: "Photography"` (`id: "6a4cfaee4021f21026e477f0"`). Replace it with:

```js
  {
    id: "6a4cfaee4021f21026e477f0",
    title: "Photography",
    image_url:
      "https://qrartimages.s3.us-west-1.amazonaws.com/6a4abe9e2164b64ac00f0758.png",
    landingPage: {
      slug: "photography-qr-code",
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
          imageUrl: "/product-placements/restaurants-food-trucks.png",
        },
        {
          title: "Travel & Property",
          description: "Destination, hotel, and real-estate marketing",
          icon: "TravelExploreOutlined",
          imageUrl: "/product-placements/events-exhibitions.png",
        },
        {
          title: "Product Advertising",
          description: "Lifestyle imagery that makes products feel tangible",
          icon: "ShoppingBagOutlined",
          imageUrl: "/product-placements/business-branding.png",
        },
      ],
    },
  },
```

- [ ] **Step 2: Run the full frontend test suite**

Run: `npm run test:frontend`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/_utils/ImageStyles.js
git commit -m "feat(seo): add Photography style landing page (QRAI-144)"
```

---

### Task 9: Add Vector Art landing page (QRAI-145)

**Files:**
- Modify: `src/_utils/ImageStyles.js` (the `"Vector Art"` style object)

- [ ] **Step 1: Add the landingPage entry**

Find the style object with `title: "Vector Art"` (`id: "6a4cfaee4021f21026e477f1"`). Replace it with:

```js
  {
    id: "6a4cfaee4021f21026e477f1",
    title: "Vector Art",
    image_url:
      "https://qrartimages.s3.us-west-1.amazonaws.com/65cc123c7b729925fcced038.png",
    landingPage: {
      slug: "vector-art-qr-code",
      metaTitle:
        "Vector Art QR Code Generator — Clean Graphic QR Designs | QR AI",
      metaDescription:
        "Create clean vector-style QR codes with bold shapes, crisp edges, and modern graphic character using QR AI.",
      badge: "Vector Art Style",
      headingLines: ["Vector Art", "QR Codes"],
      headingAccent: "QR",
      intro:
        "Clean shapes, crisp edges, and confident color turn your QR code into polished graphic artwork built for modern brands.",
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
      useCases: [
        "Brand and marketing campaigns",
        "Packaging and labels",
        "Apparel and merchandise",
        "Infographics and digital products",
      ],
      promptIdeas: [
        "modern café counter, espresso machine, pastries, bold flat shapes",
        "lemons, oranges, olive branches, linen cloth, clean vector illustration",
        "coconuts, mangoes, dragon fruit, monstera leaves, bright vector art",
        "ceramic teapot, matcha bowl, bamboo whisk, cherry blossoms",
        "wildflowers in a simple vase, geometric leaves, flat color",
        "city skyline, bicycles, trees, clouds, contemporary graphic illustration",
      ],
      perfectFor: [
        {
          title: "Branding",
          description: "Polished graphics for campaigns and identity systems",
          icon: "BrandingWatermarkOutlined",
          imageUrl: "/product-placements/business-branding.png",
        },
        {
          title: "Packaging",
          description: "Clean QR artwork for labels, boxes, and inserts",
          icon: "Inventory2Outlined",
          imageUrl: "/product-placements/restaurants-food-trucks.png",
        },
        {
          title: "Merchandise",
          description: "Bold designs for apparel, stickers, and accessories",
          icon: "CheckroomOutlined",
          imageUrl: "/product-placements/apparel-merch.png",
        },
      ],
    },
  },
```

- [ ] **Step 2: Run the full frontend test suite**

Run: `npm run test:frontend`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/_utils/ImageStyles.js
git commit -m "feat(seo): add Vector Art style landing page (QRAI-145)"
```

---

### Task 10: Add Doodle Art landing page (QRAI-146)

**Files:**
- Modify: `src/_utils/ImageStyles.js` (the `"Doodle Art"` style object)

- [ ] **Step 1: Add the landingPage entry**

Find the style object with `title: "Doodle Art"` (`id: "6a4cfaee4021f21026e477f2"`). Replace it with:

```js
  {
    id: "6a4cfaee4021f21026e477f2",
    title: "Doodle Art",
    image_url:
      "https://qrartimages.s3.us-west-1.amazonaws.com/65a19822d076ab86bf56acab.png",
    landingPage: {
      slug: "doodle-art-qr-code",
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
          imageUrl: "/product-placements/business-branding.png",
        },
        {
          title: "Creators",
          description: "Playful portfolio, profile, and social links",
          icon: "BrushOutlined",
          imageUrl: "/product-placements/art-galleries.png",
        },
        {
          title: "Family Events",
          description: "Invitations, activities, and celebration signage",
          icon: "CelebrationOutlined",
          imageUrl: "/product-placements/weddings-stationery.png",
        },
      ],
    },
  },
```

- [ ] **Step 2: Run the full frontend test suite**

Run: `npm run test:frontend`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/_utils/ImageStyles.js
git commit -m "feat(seo): add Doodle Art style landing page (QRAI-146)"
```

---

### Task 11: Add Ink landing page (QRAI-147)

**Files:**
- Modify: `src/_utils/ImageStyles.js` (the `"Ink"` style object)

- [ ] **Step 1: Add the landingPage entry**

Find the style object with `title: "Ink"` (`id: "6a4cfaee4021f21026e477f3"`). Replace it with:

```js
  {
    id: "6a4cfaee4021f21026e477f3",
    title: "Ink",
    image_url:
      "https://qrartimages.s3.us-west-1.amazonaws.com/6595dd1fd3f4c7d50f757b65.png",
    landingPage: {
      slug: "ink-qr-code",
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
          imageUrl: "/product-placements/events-exhibitions.png",
        },
        {
          title: "Editorial Design",
          description: "Refined QR art for books, magazines, and prints",
          icon: "MenuBookOutlined",
          imageUrl: "/product-placements/art-galleries.png",
        },
        {
          title: "Art & Fashion",
          description: "Distinctive material for studios and exhibitions",
          icon: "DesignServicesOutlined",
          imageUrl: "/product-placements/apparel-merch.png",
        },
      ],
    },
  },
```

- [ ] **Step 2: Run the full frontend test suite**

Run: `npm run test:frontend`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/_utils/ImageStyles.js
git commit -m "feat(seo): add Ink style landing page (QRAI-147)"
```

---

### Task 12: Add Chinese art landing page (QRAI-148)

**Files:**
- Modify: `src/_utils/ImageStyles.js` (the `"Chinese art"` style object)

- [ ] **Step 1: Add the landingPage entry**

Find the style object with `title: "Chinese art"` (`id: "6a4cfaee4021f21026e477f5"` — note lowercase "art", must match the Mongo `style_title` exactly). Replace it with:

```js
  {
    id: "6a4cfaee4021f21026e477f5",
    title: "Chinese art",
    image_url:
      "https://qrartimages.s3.us-west-1.amazonaws.com/65e243349c04d23c99e86494.png",
    landingPage: {
      slug: "chinese-art-qr-code",
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
          imageUrl: "/product-placements/restaurants-food-trucks.png",
        },
        {
          title: "Cultural Events",
          description: "Distinctive signage and printed event material",
          icon: "FestivalOutlined",
          imageUrl: "/product-placements/events-exhibitions.png",
        },
        {
          title: "Wellness & Hospitality",
          description: "Calm, premium visuals for guest experiences",
          icon: "SpaOutlined",
          imageUrl: "/product-placements/art-galleries.png",
        },
      ],
    },
  },
```

- [ ] **Step 2: Run the full frontend test suite**

Run: `npm run test:frontend`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/_utils/ImageStyles.js
git commit -m "feat(seo): add Chinese Art style landing page (QRAI-148)"
```

---

### Task 13: Add Ghibli ("Whimsical Anime") landing page + trademark test (QRAI-149)

**Files:**
- Modify: `src/_utils/ImageStyles.js` (the `"Ghibli"` style object)
- Modify: `src/__tests__/landingPages.test.js`

- [ ] **Step 1: Write the failing trademark test**

Append to `src/__tests__/landingPages.test.js`, inside the existing `describe('rich style landing pages — shape invariants', ...)` block (add as a new `test(...)` alongside the others):

```js
  test('the Ghibli style landing page never mentions "Ghibli" or "Studio Ghibli" in rendered copy (trademark)', () => {
    const ghibli = styles.find((s) => s.title === 'Ghibli')
    const lp = ghibli.landingPage
    const rendered = JSON.stringify([
      lp.badge,
      lp.headingLines,
      lp.intro,
      lp.metaTitle,
      lp.metaDescription,
      lp.exampleCaption,
      lp.features,
      lp.why,
      lp.useCases,
    ]).toLowerCase()
    expect(rendered).not.toContain('ghibli')
  })
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:frontend -- src/__tests__/landingPages.test.js`
Expected: FAIL — `TypeError: Cannot read properties of undefined (reading 'badge')`, since the Ghibli style has no `landingPage` yet.

- [ ] **Step 3: Add the landingPage entry**

In `src/_utils/ImageStyles.js`, find the style object with `title: "Ghibli"` (`id: "6a4cfaee4021f21026e477f7"`). Replace it with:

```js
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
          imageUrl: "/product-placements/weddings-stationery.png",
        },
        {
          title: "Cafés & Bakeries",
          description: "Cozy menus and packaging with storybook charm",
          icon: "BakeryDiningOutlined",
          imageUrl: "/product-placements/restaurants-food-trucks.png",
        },
        {
          title: "Travel & Nature",
          description: "Whimsical guides, maps, and destination content",
          icon: "ForestOutlined",
          imageUrl: "/product-placements/events-exhibitions.png",
        },
      ],
    },
  },
```

- [ ] **Step 4: Run the full frontend test suite**

Run: `npm run test:frontend`
Expected: PASS — including the trademark test from Step 1

- [ ] **Step 5: Commit**

```bash
git add src/_utils/ImageStyles.js src/__tests__/landingPages.test.js
git commit -m "feat(seo): add Whimsical Anime (Ghibli) style landing page (QRAI-149)"
```

---

### Task 14: Add Illustration landing page (QRAI-150)

**Files:**
- Modify: `src/_utils/ImageStyles.js` (the `"Illustration"` style object)

- [ ] **Step 1: Add the landingPage entry**

Find the style object with `title: "Illustration"` (`id: "6a4cfaef4021f21026e477f9"`). Replace it with:

```js
  {
    id: "6a4cfaef4021f21026e477f9",
    title: "Illustration",
    image_url:
      "https://qrartimages.s3.us-west-1.amazonaws.com/6a4bb59e2cfa329e8d58854c.png",
    landingPage: {
      slug: "illustration-qr-code",
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
          imageUrl: "/product-placements/business-branding.png",
        },
        {
          title: "Events & Invitations",
          description: "Memorable visuals for celebrations and gatherings",
          icon: "CelebrationOutlined",
          imageUrl: "/product-placements/weddings-stationery.png",
        },
        {
          title: "Packaging & Merch",
          description: "Flexible illustrated QR codes for physical products",
          icon: "Inventory2Outlined",
          imageUrl: "/product-placements/apparel-merch.png",
        },
      ],
    },
  },
```

- [ ] **Step 2: Run the full frontend test suite**

Run: `npm run test:frontend`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/_utils/ImageStyles.js
git commit -m "feat(seo): add Illustration style landing page (QRAI-150)"
```

---

### Task 15: Acceptance test + manual browser verification

**Files:**
- Modify: `src/__tests__/landingPages.test.js`

- [ ] **Step 1: Add the batch-completion acceptance test**

Append to `src/__tests__/landingPages.test.js` (new top-level `describe` block, after the existing one):

```js
import { RANDOM_STYLE_ID } from '../_utils/ImageStyles'

describe('QRAI-138 batch completion', () => {
  test('every non-Random style now has a rich landingPage', () => {
    const nonRandom = styles.filter((s) => s.id !== RANDOM_STYLE_ID)
    expect(nonRandom).toHaveLength(13)
    for (const s of nonRandom) {
      expect(s.landingPage).toBeDefined()
      expect(isRichLandingPage(s.landingPage)).toBe(true)
    }
  })
})
```

Add `RANDOM_STYLE_ID` to the existing `import { styles, isRichLandingPage } from '../_utils/ImageStyles'` line at the top of the file instead of a second import statement:

```js
import { styles, isRichLandingPage, RANDOM_STYLE_ID } from '../_utils/ImageStyles'
```

- [ ] **Step 2: Run the full frontend test suite**

Run: `npm run test:frontend`
Expected: PASS — all tests in `imageStyles.test.js`, `styleIcons.test.js`, and `landingPages.test.js` pass, including the new 13-style acceptance check.

- [ ] **Step 3: Run lint**

Run: `npm run lint`
Expected: no errors

- [ ] **Step 4: Manual browser verification**

Start the dev server and, for each of the 12 slugs below, load `http://localhost:3000/styles/<slug>` and confirm: the rich template renders (hero badge + two-line heading, not the thin simple layout), all 3 feature icons in the hero render (a blank space next to a feature label means an icon-name typo slipped through — check that string against `STYLE_ICONS` in `src/_utils/styleIcons.js`), the Examples strip shows real cards or "Examples coming soon" (never a broken image), the 6 prompt-idea pills render and link to `/generate?style=<slug>&prompt=...`, and exactly 3 Perfect For cards render with images.

Slugs: `ukiyo-e-qr-code`, `cyberpunk-qr-code`, `low-poly-qr-code`, `oil-painting-qr-code`, `expressionism-qr-code`, `photography-qr-code`, `vector-art-qr-code`, `doodle-art-qr-code`, `ink-qr-code`, `chinese-art-qr-code`, `ghibli-qr-code`, `illustration-qr-code`.

Additionally confirm `chinese-art-qr-code` resolves at all (this one has the `title: "Chinese art"` lowercase-"art" mismatch risk called out in Task 12 — a typo there would 404 silently until manually checked), and check `http://localhost:3000/sitemap.xml` (or `next build` output) lists all 12 new `/styles/<slug>` URLs, confirming `generateStaticParams` picked them up.

- [ ] **Step 5: Commit**

```bash
git add src/__tests__/landingPages.test.js
git commit -m "test: add QRAI-138 batch-completion acceptance test"
```

---

## Post-implementation (not part of this plan's tasks)

- Transition all 12 Jira stories (QRAI-139 through QRAI-150) to Done per [[ticket-completion-workflow]] — commit to master (already done per-task above), transition each issue, add an outcome comment referencing the commit(s).
- Christoph will generate fresh example images for Cyberpunk/Ghibli and mark them `featured: true` in MongoDB, and will replace the generic `/product-placements/` images used above with real per-style photography — both explicitly deferred, not blocking this plan.
