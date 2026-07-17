# Generate page: "Find Your Style" styles showcase section

## Problem

`/generate` has no way to browse styles from the page itself — a visitor has
to open the generate form's style picker to see what's available, and there's
no path from `/generate` into the individual `/styles/[slug]` marketing pages
(which carry richer per-style SEO content, examples, and prompt ideas). The
user supplied a mockup: a "Find Your Style" grid of cards, one per style,
each linking out to its landing page.

## Scope

- New static grid section on `/generate`, placed directly after the existing
  `UseCasesCarousel` ("Made to be seen... Made to inspire.") section.
- One card per style that has a `/styles/[slug]` landing page.
- Each card links to that style's landing page.
- Add short tagline copy per style (new data, doesn't exist today).
- Explicitly out of scope: new non-QR "pure style" preview images. Cards use
  the existing `style.image_url` (the QR-blended hero image already used
  elsewhere) as a placeholder — no image-generation tooling is available in
  this session. Swapping in dedicated non-QR photography/art per style is a
  later, separate pass.

## Design

### 1. Data: taglines in `ImageStyles.js`

Add a `tagline` field to each style's `landingPage` object in
`src/_utils/ImageStyles.js` — one short, on-brand line per style (matching
the tone/length of the user's mockup). All 13 styles that currently have a
`landingPage` get one:

| Style (internal title) | Tagline |
|---|---|
| Ukiyo-e | Classic Japanese woodblock prints. |
| Expressionism | Bold brushstrokes and emotional energy. |
| Low Poly Art | Geometric shapes with modern depth. |
| Photography | Realistic scenes with rich detail. |
| Vector Art | Clean lines, bold shapes, vibrant and scalable. |
| Doodle Art | Playful hand-drawn doodles and icons. |
| Ink | Elegant ink wash and expressive linework. |
| Oil Painting | Rich textures and painterly strokes. |
| Chinese art | Traditional brushwork and timeless beauty. |
| Watercolor | Soft washes and delicate painterly blends. |
| Ghibli (displays "Whimsical Anime") | Whimsical anime scenes full of charm. |
| Cyberpunk | Neon lights and futuristic urban vibes. |
| Illustration | Creative illustrated scenes for any idea. |

No other `ImageStyles.js` exports change. `stylesWithLandingPage()` already
returns exactly these 13 entries (it filters on `s.landingPage`, and
`Random` has none) — the showcase component needs no new filtering logic.

### 2. Component: `StylesShowcase.js`

New file: `src/app/(main_pages)/generate/StylesShowcase.js`. Server
component (no `"use client"` — no state, no handlers beyond plain `<Link>`
navigation), following the same pattern as the "Perfect For" grid in
`src/app/(marketing)/styles/[slug]/page.js`.

Renders:
- A centered heading block: small uppercase "STYLES" eyebrow in
  `primary.main`, an `h2` "Find Your Style", and a `subtitle1` description
  ("Each style is crafted to be beautiful and scannable. Pick one and start
  creating.") — sized/weighted consistent with `UseCasesCarousel`'s existing
  heading treatment (`fontSize: { xs: "2rem", sm: "2.75rem", md: "3.5rem" }`
  for the h2, `text.secondary` for the subtitle).
- A CSS grid of cards, one per `stylesWithLandingPage()` entry:
  `gridTemplateColumns: { xs: "repeat(2, 1fr)", md: "repeat(4, 1fr)" }`. No
  manual row-splitting — 13 items auto-wrap into 4/4/4/1 rather than the
  mockup's 4/4/5, which is an acceptable difference given the count is
  data-driven, not hardcoded.

Each card:
- Wrapped in `<Link href={`/styles/${style.landingPage.slug}`}>`.
- `next/image` using `style.image_url`, `fill`, `sizes` tuned for a
  4-column grid, `aspectRatio: "1/1"` (matches the source images, which are
  the square generation outputs).
- Below the image: `styleDisplayName(style)` as the title (handles the
  Ghibli → "Whimsical Anime" swap already used on the landing pages —
  without this the card would leak the trademark-sensitive internal title),
  the new `tagline` as secondary text, and a small circular
  `ArrowOutwardOutlined` icon in the bottom-right of the text area (same
  icon already used for the "Generate with this style" CTA on
  `/styles/[slug]`).
- Card container: `background.paper` fill, `1px solid divider` border,
  rounded corners (`borderRadius: 2`, matching the "Perfect For" cards),
  `overflow: hidden`. On hover, border color shifts to `primary.main` — the
  only interactive affordance, since the whole card is a link.

### 3. Wiring into `page.js`

In `src/app/(main_pages)/generate/page.js`, import `StylesShowcase` and
render it immediately after `<UseCasesCarousel />`, before the closing
`</Box>`.

## Testing

This is a static marketing section with no business logic, but the codebase
already has render-test precedent for comparable sections (e.g.
`UseCasesCarousel.test.js`), so the new component and the new `tagline` data
get the same treatment:
- `src/__tests__/landingPages.test.js` gains a shape-invariant test asserting
  every `landingPage.tagline` is a non-empty string, and the existing Ghibli
  trademark test is extended to cover `tagline`.
- A new `src/__tests__/StylesShowcase.test.js` renders the component and
  asserts: the heading text, exactly 13 cards, each card's href points at
  the right `/styles/[slug]`, taglines render, and the Ghibli card shows
  "Whimsical Anime" (never "Ghibli").

On top of the automated tests, manual verification: run the dev server,
load `/generate`, confirm:
- 13 cards render, each linking to the correct `/styles/[slug]`.
- The Ghibli card shows "Whimsical Anime", not "Ghibli".
- Grid reflows to 2 columns on mobile widths.

## Out of scope

- Generating or sourcing new non-QR "pure style" preview images — ship with
  the existing `image_url` placeholders (see Scope).
- Any change to the `/styles/[slug]` pages themselves.
- Any change to the style picker inside `GenerateForm`/`StylesModal`.
