# Generate Page Styles Showcase Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Find Your Style" grid section to `/generate` that shows all 13 styles with a landing page and links each one to its `/styles/[slug]` marketing page.

**Architecture:** Add a `tagline` field to each style's `landingPage` object in `src/_utils/ImageStyles.js` (new marketing copy, no existing field to reuse). Build a new server component `StylesShowcase.js` that reads `stylesWithLandingPage()` and renders a responsive CSS grid of link-cards, reusing the existing `style.image_url` (QR-blend image) as a placeholder. Wire it into `generate/page.js` directly after the existing `UseCasesCarousel`.

**Tech Stack:** Next.js 14 App Router, React 18 (server components), MUI v5 (`Box`/`Typography`, `sx` prop), `next/link`, `next/image`, Jest + `@testing-library/react` for frontend tests.

## Global Constraints

- No new npm dependencies — use only `next/link`, `next/image`, MUI components, and `@mui/icons-material/ArrowOutwardOutlined` (already used elsewhere in the codebase).
- Card titles must use `styleDisplayName(style)`, never `style.title` directly — the Ghibli style must always render as "Whimsical Anime" (trademark rule, enforced by existing tests in `src/__tests__/landingPages.test.js`).
- Images use `style.image_url` (existing QR-blend hero image) as an explicit placeholder — do not introduce new image assets or fields for this plan.
- Follow the existing heading style already used by `UseCasesCarousel` (`fontSize: { xs: "2rem", sm: "2.75rem", md: "3.5rem" }` for the `h2`, `text.secondary` subtitle) so the new section feels consistent with the section above it.
- Frontend tests run via `npm run test:frontend` (Jest, config at `jest.config.js`, tests live in `src/__tests__/**/*.test.js`).

---

## File Structure

- **Modify** `src/_utils/ImageStyles.js` — add `tagline` to each of the 13 `landingPage` objects.
- **Modify** `src/__tests__/landingPages.test.js` — extend the Ghibli trademark check to cover `tagline`; add a new shape-invariant test for `tagline`.
- **Create** `src/app/(main_pages)/generate/StylesShowcase.js` — the new grid section component.
- **Create** `src/__tests__/StylesShowcase.test.js` — render tests for the new component.
- **Modify** `src/app/(main_pages)/generate/page.js` — render `<StylesShowcase />` after `<UseCasesCarousel />`.

---

## Task 1: Add `tagline` copy to all 13 style landing pages

**Files:**
- Modify: `src/_utils/ImageStyles.js`
- Modify: `src/__tests__/landingPages.test.js`
- Test: `src/__tests__/landingPages.test.js`

**Interfaces:**
- Produces: `style.landingPage.tagline` — a non-empty string on every style returned by `stylesWithLandingPage()`. Task 2's `StylesShowcase` component reads this field directly (`style.landingPage.tagline`).

- [ ] **Step 1: Write the failing tests**

Open `src/__tests__/landingPages.test.js`. Add a new test inside the `describe('rich style landing pages — shape invariants', ...)` block (place it after the `'no landingPage carries the unused examples field'` test):

```js
  test('every landingPage has a non-empty tagline', () => {
    for (const s of styles) {
      if (s.landingPage) {
        expect(typeof s.landingPage.tagline).toBe('string')
        expect(s.landingPage.tagline.length).toBeGreaterThan(0)
      }
    }
  })
```

Then update the existing Ghibli trademark test to also cover the new field — change:

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
      lp.promptIdeas,
      lp.perfectFor,
    ]).toLowerCase()
    expect(rendered).not.toContain('ghibli')
  })
```

to:

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
      lp.promptIdeas,
      lp.perfectFor,
      lp.tagline,
    ]).toLowerCase()
    expect(rendered).not.toContain('ghibli')
  })
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test:frontend -- landingPages.test.js`
Expected: FAIL — `every landingPage has a non-empty tagline` fails because `s.landingPage.tagline` is `undefined` (`typeof undefined` is `"undefined"`, not `"string"`).

- [ ] **Step 3: Add `tagline` to each style's `landingPage` object**

In `src/_utils/ImageStyles.js`, insert a `tagline` line immediately after each style's `slug` line. Each edit below is anchored on that style's unique `slug` value.

Ukiyo-e — find:
```js
      slug: "ukiyo-e-qr-code",
```
replace with:
```js
      slug: "ukiyo-e-qr-code",
      tagline: "Classic Japanese woodblock prints.",
```

Expressionism — find:
```js
      slug: "expressionism-qr-code",
```
replace with:
```js
      slug: "expressionism-qr-code",
      tagline: "Bold brushstrokes and emotional energy.",
```

Low Poly Art — find:
```js
      slug: "low-poly-qr-code",
```
replace with:
```js
      slug: "low-poly-qr-code",
      tagline: "Geometric shapes with modern depth.",
```

Photography — find:
```js
      slug: "photography-qr-code",
```
replace with:
```js
      slug: "photography-qr-code",
      tagline: "Realistic scenes with rich detail.",
```

Vector Art — find:
```js
      slug: "vector-art-qr-code",
```
replace with:
```js
      slug: "vector-art-qr-code",
      tagline: "Clean lines, bold shapes, vibrant and scalable.",
```

Doodle Art — find:
```js
      slug: "doodle-art-qr-code",
```
replace with:
```js
      slug: "doodle-art-qr-code",
      tagline: "Playful hand-drawn doodles and icons.",
```

Ink — find:
```js
      slug: "ink-qr-code",
```
replace with:
```js
      slug: "ink-qr-code",
      tagline: "Elegant ink wash and expressive linework.",
```

Oil Painting — find:
```js
      slug: "oil-painting-qr-code",
```
replace with:
```js
      slug: "oil-painting-qr-code",
      tagline: "Rich textures and painterly strokes.",
```

Chinese art — find:
```js
      slug: "chinese-art-qr-code",
```
replace with:
```js
      slug: "chinese-art-qr-code",
      tagline: "Traditional brushwork and timeless beauty.",
```

Watercolor — find:
```js
      slug: "watercolor-qr-code",
```
replace with:
```js
      slug: "watercolor-qr-code",
      tagline: "Soft washes and delicate painterly blends.",
```

Ghibli — find:
```js
      slug: "ghibli-qr-code",
```
replace with:
```js
      slug: "ghibli-qr-code",
      tagline: "Whimsical anime scenes full of charm.",
```

Cyberpunk — find:
```js
      slug: "cyberpunk-qr-code",
```
replace with:
```js
      slug: "cyberpunk-qr-code",
      tagline: "Neon lights and futuristic urban vibes.",
```

Illustration — find:
```js
      slug: "illustration-qr-code",
```
replace with:
```js
      slug: "illustration-qr-code",
      tagline: "Creative illustrated scenes for any idea.",
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test:frontend -- landingPages.test.js`
Expected: PASS (all tests in the file green, including the two touched in Step 1).

- [ ] **Step 5: Commit**

```bash
git add src/_utils/ImageStyles.js src/__tests__/landingPages.test.js
git commit -m "feat(generate): add tagline copy to all style landing pages"
```

---

## Task 2: Build the `StylesShowcase` grid component

**Files:**
- Create: `src/app/(main_pages)/generate/StylesShowcase.js`
- Test: `src/__tests__/StylesShowcase.test.js`

**Interfaces:**
- Consumes: `stylesWithLandingPage()` and `styleDisplayName(style)` from `src/_utils/ImageStyles.js` (existing exports); `style.image_url` (existing); `style.landingPage.slug` and `style.landingPage.tagline` (from Task 1).
- Produces: `export default function StylesShowcase()` — a zero-prop React component. Task 3 imports it as `import StylesShowcase from "./StylesShowcase"` and renders `<StylesShowcase />`.

- [ ] **Step 1: Write the failing test**

Create `src/__tests__/StylesShowcase.test.js`:

```js
import React from 'react'
import { render, screen } from '@testing-library/react'
import StylesShowcase from '../app/(main_pages)/generate/StylesShowcase'

test('renders the section heading and subtitle', () => {
  render(<StylesShowcase />)
  expect(screen.getByText('Find Your Style')).toBeInTheDocument()
  expect(
    screen.getByText(
      'Each style is crafted to be beautiful and scannable. Pick one and start creating.'
    )
  ).toBeInTheDocument()
})

test('renders one card per style with a landing page (13 total)', () => {
  render(<StylesShowcase />)
  expect(screen.getAllByRole('link')).toHaveLength(13)
})

test('each card links to its /styles/[slug] landing page', () => {
  render(<StylesShowcase />)
  const title = screen.getByText('Ukiyo-e')
  expect(title.closest('a')).toHaveAttribute('href', '/styles/ukiyo-e-qr-code')
})

test('renders each style tagline', () => {
  render(<StylesShowcase />)
  expect(screen.getByText('Classic Japanese woodblock prints.')).toBeInTheDocument()
  expect(screen.getByText('Neon lights and futuristic urban vibes.')).toBeInTheDocument()
})

test('the Ghibli card shows "Whimsical Anime", never "Ghibli"', () => {
  render(<StylesShowcase />)
  const title = screen.getByText('Whimsical Anime')
  expect(title.closest('a')).toHaveAttribute('href', '/styles/ghibli-qr-code')
  expect(screen.queryByText('Ghibli')).not.toBeInTheDocument()
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test:frontend -- StylesShowcase.test.js`
Expected: FAIL with a module-not-found error for `../app/(main_pages)/generate/StylesShowcase` (the file doesn't exist yet).

- [ ] **Step 3: Implement `StylesShowcase.js`**

Create `src/app/(main_pages)/generate/StylesShowcase.js`:

```jsx
import Link from "next/link";
import Image from "next/image";
import { Box, Typography } from "@mui/material";
import ArrowOutwardOutlined from "@mui/icons-material/ArrowOutwardOutlined";
import { stylesWithLandingPage, styleDisplayName } from "@/_utils/ImageStyles";

export default function StylesShowcase() {
  const styleList = stylesWithLandingPage();

  return (
    <Box component="section" sx={{ mt: { xs: 8, lg: 12 }, width: "100%" }}>
      {/* Heading */}
      <Box sx={{ textAlign: "center", px: 2, mb: { xs: 5, lg: 6 } }}>
        <Typography
          variant="overline"
          sx={{ color: "primary.main", fontWeight: 700, letterSpacing: "0.08em" }}
        >
          Styles
        </Typography>
        <Typography
          variant="h2"
          sx={{ fontSize: { xs: "2rem", sm: "2.75rem", md: "3.5rem" }, lineHeight: 1.1 }}
        >
          Find Your Style
        </Typography>
        <Typography
          variant="subtitle1"
          sx={{ mt: 2, color: "text.secondary", maxWidth: 480, mx: "auto" }}
        >
          Each style is crafted to be beautiful and scannable. Pick one and start creating.
        </Typography>
      </Box>

      {/* Grid */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "repeat(2, 1fr)", md: "repeat(4, 1fr)" },
          gap: 2,
          px: { xs: 2, lg: 0 },
        }}
      >
        {styleList.map((style) => {
          const displayTitle = styleDisplayName(style);
          const { slug, tagline } = style.landingPage;
          return (
            <Link
              key={slug}
              href={`/styles/${slug}`}
              style={{ textDecoration: "none", color: "inherit" }}
            >
              <Box
                sx={{
                  borderRadius: 2,
                  overflow: "hidden",
                  border: "1px solid",
                  borderColor: "divider",
                  backgroundColor: "background.paper",
                  height: "100%",
                  transition: "border-color 0.15s ease",
                  "&:hover": { borderColor: "primary.main" },
                }}
              >
                <Box sx={{ position: "relative", width: "100%", aspectRatio: "1/1" }}>
                  <Image
                    src={style.image_url}
                    alt={`${displayTitle} style example`}
                    fill
                    sizes="(max-width: 900px) 50vw, 25vw"
                    style={{ objectFit: "cover" }}
                  />
                </Box>
                <Box sx={{ p: 2 }}>
                  <Typography sx={{ fontWeight: 600, fontSize: "1rem", mb: 0.5 }}>
                    {displayTitle}
                  </Typography>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "flex-end",
                      justifyContent: "space-between",
                      gap: 1,
                    }}
                  >
                    <Typography
                      sx={{ fontSize: "0.85rem", color: "text.secondary", lineHeight: 1.4 }}
                    >
                      {tagline}
                    </Typography>
                    <Box
                      sx={{
                        flexShrink: 0,
                        width: 28,
                        height: 28,
                        borderRadius: "50%",
                        border: "1px solid",
                        borderColor: "divider",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <ArrowOutwardOutlined sx={{ fontSize: 14, color: "text.secondary" }} />
                    </Box>
                  </Box>
                </Box>
              </Box>
            </Link>
          );
        })}
      </Box>
    </Box>
  );
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm run test:frontend -- StylesShowcase.test.js`
Expected: PASS (all 5 tests green).

- [ ] **Step 5: Commit**

```bash
git add src/app/\(main_pages\)/generate/StylesShowcase.js src/__tests__/StylesShowcase.test.js
git commit -m "feat(generate): add StylesShowcase grid component"
```

---

## Task 3: Wire `StylesShowcase` into the generate page

**Files:**
- Modify: `src/app/(main_pages)/generate/page.js`

**Interfaces:**
- Consumes: `export default function StylesShowcase()` from `./StylesShowcase` (Task 2).

- [ ] **Step 1: Add the import**

In `src/app/(main_pages)/generate/page.js`, find:

```js
import GenerateForm from "./GenerateForm";
import UseCasesCarousel from "./UseCasesCarousel";
```

replace with:

```js
import GenerateForm from "./GenerateForm";
import UseCasesCarousel from "./UseCasesCarousel";
import StylesShowcase from "./StylesShowcase";
```

- [ ] **Step 2: Render the component after `UseCasesCarousel`**

Find:

```js
      {/* Use cases carousel — marketing section showing product placement examples */}
      <UseCasesCarousel />


</Box>
```

replace with:

```js
      {/* Use cases carousel — marketing section showing product placement examples */}
      <UseCasesCarousel />

      {/* Styles showcase — links out to each style's /styles/[slug] landing page */}
      <StylesShowcase />
    </Box>
```

- [ ] **Step 3: Run the full frontend test suite**

Run: `npm run test:frontend`
Expected: PASS — all existing suites plus `StylesShowcase.test.js` and the updated `landingPages.test.js` green, no regressions.

- [ ] **Step 4: Manually verify in the browser**

Run: `npm run dev` (or `npm run next-dev`), then open `http://localhost:3000/generate`.

Confirm:
- The "Find Your Style" section renders below the "Made to inspire" carousel with 13 cards.
- Clicking the Ukiyo-e card navigates to `/styles/ukiyo-e-qr-code`.
- The card for the Ghibli style shows "Whimsical Anime", not "Ghibli".
- Resizing the browser to a mobile width (e.g. 390px) reflows the grid to 2 columns.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(main_pages)/generate/page.js"
git commit -m "feat(generate): render StylesShowcase on the generate page"
```
