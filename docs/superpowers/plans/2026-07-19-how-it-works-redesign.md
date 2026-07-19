# How It Works Page Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the text-only `/how-it-works` page with a visual, screenshot-driven walkthrough (hero + step-badge strip + 3 image/checklist step sections + trimmed tips + existing CTA).

**Architecture:** A new `content.js` data file holds the step/tip copy and an icon-name → component map (same convention as `ImageStyles.js`/`styleIcons.js`). `page.js` (still a server component, no new client boundary) imports that data and renders the layout inline — matching the existing pattern in `styles/[slug]/page.js`, which keeps page-specific render helpers as local functions in the page file rather than splitting into many small component files.

**Tech Stack:** Next.js 14 App Router, MUI v5, `next/image`, Jest + React Testing Library.

## Global Constraints

- Reuse color tokens from `src/_styles/palette.js` (`primary.main`/`primary.light`, `text.secondary`, `divider`) — never hardcode hex values.
- Icons come from `@mui/icons-material/*Outlined` variants, resolved through a name→component map, matching the `STYLE_ICONS` convention in `src/_utils/styleIcons.js`.
- `metadata` export in `page.js` (title/description/`alternates.canonical`) must stay byte-identical to what's there today — no SEO reason to touch it.
- Container width for the page body is `1120px` (`maxWidth`, `mx: "auto"`), matching the precedent in `src/app/(marketing)/styles/[slug]/page.js:250`.
- The 3 screenshot assets already exist at `public/how-it-works/describe-idea.png` (1400×970), `public/how-it-works/review-result.png` (1400×847), `public/how-it-works/fine-tune.png` (1256×1402) — do not regenerate or re-crop them.
- Spec: `docs/superpowers/specs/2026-07-19-how-it-works-redesign-design.md`.

---

### Task 1: Step/tip content data (`content.js`)

**Files:**
- Create: `src/app/(marketing)/how-it-works/content.js`
- Test: `src/__tests__/howItWorksContent.test.js`

**Interfaces:**
- Produces: `ICONS` (object, name string → MUI icon component), `heroSteps` (array of 4 strings), `steps` (array of `{ number: string, title: string, image: string, imageWidth: number, imageHeight: number, imageAlt: string, description: string, checklist: Array<{ icon: string, label: string }> }`), `tips` (array of `{ title: string, body: string }`). Task 2 imports all four named exports from `./content`.

- [ ] **Step 1: Write the failing test**

Create `src/__tests__/howItWorksContent.test.js`:

```js
import { ICONS, heroSteps, steps, tips } from '../app/(marketing)/how-it-works/content'

test('heroSteps has exactly 4 labels', () => {
  expect(heroSteps).toEqual(['Describe', 'Generate', 'Refine', 'Unlock'])
})

test('every step has a resolvable image, non-empty title/description, and a checklist with resolvable icons', () => {
  expect(steps).toHaveLength(3)
  for (const step of steps) {
    expect(typeof step.number).toBe('string')
    expect(step.title.length).toBeGreaterThan(0)
    expect(step.description.length).toBeGreaterThan(0)
    expect(step.image.startsWith('/how-it-works/')).toBe(true)
    expect(step.imageWidth).toBeGreaterThan(0)
    expect(step.imageHeight).toBeGreaterThan(0)
    expect(step.imageAlt.length).toBeGreaterThan(0)
    expect(step.checklist.length).toBeGreaterThan(0)
    for (const item of step.checklist) {
      expect(ICONS[item.icon]).toBeTruthy()
      expect(item.label.length).toBeGreaterThan(0)
    }
  }
})

test('steps are numbered 1 through 3 in order', () => {
  expect(steps.map((s) => s.number)).toEqual(['1', '2', '3'])
})

test('tips has exactly 2 entries, each with a title and body', () => {
  expect(tips).toHaveLength(2)
  for (const tip of tips) {
    expect(tip.title.length).toBeGreaterThan(0)
    expect(tip.body.length).toBeGreaterThan(0)
  }
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:frontend -- howItWorksContent`
Expected: FAIL — `Cannot find module '../app/(marketing)/how-it-works/content'`

- [ ] **Step 3: Write the implementation**

Create `src/app/(marketing)/how-it-works/content.js`:

```js
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:frontend -- howItWorksContent`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add src/app/\(marketing\)/how-it-works/content.js src/__tests__/howItWorksContent.test.js public/how-it-works/
git commit -m "feat(how-it-works): add step/tip content data and screenshot assets"
```

---

### Task 2: Rewrite the page around the new content

**Files:**
- Modify: `src/app/(marketing)/how-it-works/page.js` (full rewrite of the body; `metadata` export unchanged)
- Test: `src/__tests__/HowItWorksPage.test.js`

**Interfaces:**
- Consumes: `ICONS`, `heroSteps`, `steps`, `tips` from `./content` (Task 1).

- [ ] **Step 1: Write the failing test**

Create `src/__tests__/HowItWorksPage.test.js`:

```js
import React from 'react'
import { render, screen } from '@testing-library/react'
import HowItWorksPage from '../app/(marketing)/how-it-works/page'

test('renders the hero heading and subtitle', () => {
  render(<HowItWorksPage />)
  expect(screen.getByRole('heading', { level: 1, name: /How it works/i })).toBeInTheDocument()
  expect(
    screen.getByText('Create scannable QR artwork in a few simple steps.')
  ).toBeInTheDocument()
})

test('renders all 4 step-badge labels', () => {
  render(<HowItWorksPage />)
  for (const label of ['Describe', 'Generate', 'Refine', 'Unlock']) {
    expect(screen.getByText(label)).toBeInTheDocument()
  }
})

test('renders each step title, description, and checklist items', () => {
  render(<HowItWorksPage />)
  expect(screen.getByText('Describe your idea')).toBeInTheDocument()
  expect(screen.getByText('Review your result')).toBeInTheDocument()
  expect(screen.getByText('Fine-tune your result')).toBeInTheDocument()
  expect(screen.getByText('Enter your website')).toBeInTheDocument()
  expect(screen.getByText('Check scannability score')).toBeInTheDocument()
  expect(screen.getByText('Edit prompt')).toBeInTheDocument()
})

test('renders the 3 step screenshots with their alt text', () => {
  render(<HowItWorksPage />)
  expect(
    screen.getByAltText(
      'QR AI generate form filled in with a website URL, an image description, and the Ukiyo-e style selected'
    )
  ).toBeInTheDocument()
  expect(
    screen.getByAltText('The iterate panel with prompt, style, and QR code weight slider')
  ).toBeInTheDocument()
})

test('does not render the old "under the hood" pipeline section', () => {
  render(<HowItWorksPage />)
  expect(screen.queryByText(/Under the hood/i)).not.toBeInTheDocument()
})

test('renders the trimmed tips', () => {
  render(<HowItWorksPage />)
  expect(screen.getByText('Use a short URL.')).toBeInTheDocument()
  expect(screen.getByText('Raise QR weight for high-stakes uses.')).toBeInTheDocument()
})

test('CTA links to /generate', () => {
  render(<HowItWorksPage />)
  const cta = screen.getByRole('link', { name: /Try it free/i })
  expect(cta).toHaveAttribute('href', '/generate')
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:frontend -- HowItWorksPage`
Expected: FAIL — the current page renders "How AI QR Code Art Generation Works" (no `level: 1` match for `/How it works/i`) and none of the new copy/checklist text exists yet.

- [ ] **Step 3: Write the implementation**

Replace the full contents of `src/app/(marketing)/how-it-works/page.js`:

```jsx
import Link from "next/link";
import Image from "next/image";
import { Box, Typography, Button } from "@mui/material";
import { ICONS, heroSteps, steps, tips } from "./content";

export const metadata = {
  title: "How AI QR Codes Work — Step-by-Step Guide | QR AI",
  description:
    "Learn how QR AI transforms any URL into AI-generated QR code artwork using Stable Diffusion and ControlNet. A step-by-step guide with tips for best results.",
  alternates: {
    canonical: "https://www.qr-ai.co/how-it-works",
  },
};

function StepBadgeStrip() {
  return (
    <Box
      sx={{
        display: { xs: "none", sm: "flex" },
        alignItems: "center",
        justifyContent: "center",
        mb: 8,
      }}
    >
      {heroSteps.map((label, i) => (
        <Box key={label} sx={{ display: "flex", alignItems: "center" }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Box
              sx={{
                width: 28,
                height: 28,
                borderRadius: "50%",
                border: "2px solid",
                borderColor: "primary.main",
                color: "primary.main",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 700,
                fontSize: "0.9rem",
                flexShrink: 0,
              }}
            >
              {i + 1}
            </Box>
            <Typography sx={{ fontWeight: 600 }}>{label}</Typography>
          </Box>
          {i < heroSteps.length - 1 && (
            <Box
              sx={{
                width: { sm: 40, md: 64 },
                borderTop: "2px dashed",
                borderColor: "primary.main",
                opacity: 0.4,
                mx: 2,
              }}
            />
          )}
        </Box>
      ))}
    </Box>
  );
}

function StepSection({ step }) {
  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: { xs: "column", md: "row" },
        alignItems: "center",
        gap: { xs: 4, md: 6 },
      }}
    >
      <Box
        sx={{
          flex: { md: "0 0 55%" },
          width: "100%",
          borderRadius: 3,
          overflow: "hidden",
        }}
      >
        <Image
          src={step.image}
          alt={step.imageAlt}
          width={step.imageWidth}
          height={step.imageHeight}
          style={{ width: "100%", height: "auto", display: "block" }}
          sizes="(max-width: 900px) 100vw, 600px"
        />
      </Box>
      <Box sx={{ flex: 1, width: "100%" }}>
        <Typography
          component="h2"
          variant="h2"
          sx={{ fontSize: "1.8rem", fontWeight: 800, mb: 1 }}
        >
          <Box component="span" sx={{ color: "primary.main" }}>
            {step.number}.
          </Box>{" "}
          {step.title}
        </Typography>
        <Typography component="p" sx={{ color: "text.secondary", mb: 3, lineHeight: 1.7 }}>
          {step.description}
        </Typography>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
          {step.checklist.map((item) => {
            const Icon = ICONS[item.icon];
            return (
              <Box key={item.label} sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                <Icon sx={{ color: "primary.main", fontSize: 20, flexShrink: 0 }} />
                <Typography sx={{ color: "text.secondary" }}>{item.label}</Typography>
              </Box>
            );
          })}
        </Box>
      </Box>
    </Box>
  );
}

export default function HowItWorksPage() {
  return (
    <Box sx={{ maxWidth: "1120px", mx: "auto" }}>
      {/* Hero */}
      <Box sx={{ maxWidth: "760px", mx: "auto", textAlign: "center", mb: 6 }}>
        <Typography
          component="h1"
          variant="h1"
          sx={{
            fontSize: { xs: "2.5rem", md: "3.5rem" },
            fontWeight: 900,
            letterSpacing: "-0.02em",
            mb: 2,
          }}
        >
          How it{" "}
          <Box component="span" sx={{ color: "primary.main" }}>
            works
          </Box>
        </Typography>
        <Typography component="p" sx={{ fontSize: "1.2rem", mb: 1 }}>
          Create scannable QR artwork in a few simple steps.
        </Typography>
        <Typography component="p" sx={{ color: "text.secondary" }}>
          Add your link, describe your image, generate, refine, and unlock the final version.
        </Typography>
      </Box>

      <StepBadgeStrip />

      {/* Step sections */}
      <Box sx={{ display: "flex", flexDirection: "column", gap: 10, mb: 10 }}>
        {steps.map((step) => (
          <StepSection key={step.number} step={step} />
        ))}
      </Box>

      {/* Tips */}
      <Box sx={{ mb: 8 }}>
        <Typography variant="h2" color="primary" sx={{ fontSize: "1.4rem", mb: 2 }}>
          Tips for the best results
        </Typography>
        <Box
          component="ul"
          sx={{ pl: 3, color: "text.secondary", "& li": { mb: 1.5, lineHeight: 1.8 } }}
        >
          {tips.map((tip) => (
            <li key={tip.title}>
              <strong>{tip.title}</strong> {tip.body}
            </li>
          ))}
        </Box>
      </Box>

      {/* CTA */}
      <Box sx={{ textAlign: "center", py: 4, borderTop: "1px solid", borderColor: "divider" }}>
        <Typography variant="h3" color="primary" sx={{ mb: 2, fontSize: "1.4rem" }}>
          Ready to create your first AI QR code?
        </Typography>
        <Link href="/generate" passHref>
          <Button variant="contained" size="large">
            Try it free — no sign-up required
          </Button>
        </Link>
      </Box>
    </Box>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:frontend -- HowItWorksPage`
Expected: PASS (7 tests)

- [ ] **Step 5: Run the full frontend test suite to check for regressions**

Run: `npm run test:frontend`
Expected: PASS — no other suite references the old how-it-works copy.

- [ ] **Step 6: Commit**

```bash
git add src/app/\(marketing\)/how-it-works/page.js src/__tests__/HowItWorksPage.test.js
git commit -m "feat(how-it-works): redesign page as visual step-by-step walkthrough"
```

---

### Task 3: Manual visual verification

**Files:** none (verification only)

- [ ] **Step 1: Start the dev server and open the page**

Start `next` via the project's dev server (or `npm run next-dev`), then open `http://localhost:<port>/how-it-works`.

- [ ] **Step 2: Check layout at desktop width**

Confirm: hero renders centered, the 4-badge strip shows with dashed connectors, all 3 step sections show their screenshot at a readable size with no visible cropping artifacts, checklist icons render (not broken/missing), tips list and CTA button render, CTA links to `/generate`.

- [ ] **Step 3: Check layout at mobile width (375px)**

Confirm: step-badge strip is hidden (per the `xs: "none"` breakpoint), each step section stacks image-above-text, no horizontal scrollbar, text remains readable.

- [ ] **Step 4: Check dark backgrounds on the screenshots blend with the page**

Confirm none of the 3 images show a visible seam/box around them against the page's `background.default` (#161616) — this is what the `review-result.png` crop in Task 1 was specifically for.

No commit for this task — verification only.
