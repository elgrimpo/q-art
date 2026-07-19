# How It Works page redesign

## Problem

`/how-it-works` (`src/app/(marketing)/how-it-works/page.js`) is currently a
long, text-only wall of copy: 5 numbered steps, an "under the hood" AI
pipeline explainer, and a tips list — nothing visual, nothing that shows the
actual product. The user supplied 3 real screenshots of the live app (the
generate form, the result/unlock modal, the iterate panel) composited into a
step-by-step mockup and asked for a friendlier, more visual page built around
them.

## Assets

Cropped/optimized from screenshots dropped in `design/assets/`, saved to
`public/how-it-works/`:

| File | Source | Notes |
|---|---|---|
| `describe-idea.png` | `Screenshot 2026-07-19 at 12.51.40 PM.png` | Generate form filled in (qr-ai.co, koi prompt, Ukiyo-e selected) |
| `review-result.png` | `Screenshot 2026-07-19 at 12.48.40 PM.png` | Result modal — cropped 30px per edge to remove the blurred page background bleeding around the modal's rounded corners |
| `fine-tune.png` | `Screenshot 2026-07-19 at 12.49.10 PM.png` | Iterate panel with QR Code Weight slider |

All three already had transparent-free flat dark backgrounds once cropped, so
no further masking is needed. Served via `next/image`, which handles
resizing/format conversion at runtime (no `unoptimized` flag in
`next.config.mjs`).

## Page structure

Replaces the entire current page body. Metadata (`title`, `description`,
`alternates.canonical`) is unchanged — already keyword-solid, no SEO reason
to touch it. Container widens from the current `860px` to `1120px` (matching
the precedent in `styles/[slug]/page.js`) to fit two-column step rows;
narrower text blocks (hero) stay centered within that.

### 1. Hero

- H1: "How it **works**" — white text, the word "works" in `primary.main`
  green, matching the `AccentHeading`-style treatment already used on style
  landing pages (bold accent word, not a separate component — this page's
  hero is simple enough to inline).
- Subtitle: "Create scannable QR artwork in a few simple steps."
- Supporting line: "Add your link, describe your image, generate, refine,
  and unlock the final version."
- Step strip: 4 pill badges — **① Describe → ② Generate → ③ Refine → ④
  Unlock** — each a numbered circle (green outline, number in `primary.main`)
  with a label, connected by dashed horizontal lines. New, small inline
  component (no existing stepper/badge component in the codebase to reuse).
  Stacks vertically on mobile if the dashes don't fit; connectors hidden
  below `sm`.

### 2. Three step sections

Each section is an image + text row (image one side, heading/description/
checklist the other), stacking to image-on-top on mobile — same responsive
pattern as the `RichStyleLayout` hero in `styles/[slug]/page.js` (`xs`/`md`
breakpoints, image and text swap from stacked to side-by-side). Checklist
items use the `{icon, label}` convention from `ImageStyles.js`
(`perfectFor[].icon`) / `styleIcons.js` — a small local `ICONS` map in this
page (not a shared file; the icon set here is closed and page-specific)
covering: `LinkOutlined`, `EditOutlined`, `PaletteOutlined`,
`AutoAwesomeOutlined`, `VerifiedUserOutlined`, `QrCodeScannerOutlined`,
`ShuffleOutlined`, `LockOutlined`, `TuneOutlined`.

**1. Describe your idea** — `describe-idea.png`
> Add your website link, describe the artwork you want to create, and
> optionally choose a style.

Checklist: Enter your website · Describe your image · Choose a style
(optional) · Then click Generate.

**2. Review your result** — `review-result.png`
> Check the scannability score, verify it yourself, and decide what to do
> next.

Checklist: Check scannability score · Verify by scanning yourself · Generate
a new variation · Unlock if satisfied · Want to improve it? Iterate and
tweak the image.

**3. Fine-tune your result** — `fine-tune.png`
> Adjust the prompt, switch styles, or balance QR code weight to get the
> right mix of artistic freedom and scannability.

Checklist: Edit prompt · Change style · Adjust QR code weight (more artistic
↔ more scannable) · Generate a new refined version.

(Copy/checklist wording lifted directly from the mockups — already accurate
to the real UI and no reason to rephrase.)

### 3. Trimmed tips

Two-item list, keeping only what isn't already implied by the step
checklists above:
- **Use a short URL** — longer URLs produce denser QR patterns, harder for
  the AI to blend artistically.
- **Raise QR weight for high-stakes uses** — menus, business cards, product
  packaging: nudge QR weight toward "Scannable" for reliable scans.

### 4. Closing CTA

Unchanged from today: "Ready to create your first AI QR code?" +
`Try it free — no sign-up required` button linking to `/generate`.

## Removed

- The 5 numbered steps (Enter URL / prompt / style / QR weight / generate) —
  superseded by the 3 step sections above, which describe the actual current
  flow more accurately (QR weight adjustment now happens in the iterate/
  refine step, not upfront — matches `QRAI-120` iterate flow, not the older
  copy).
- "Under the hood" AI pipeline explainer (Stable Diffusion/ControlNet detail)
  — dropped per explicit direction, doesn't matter for this page's goal.
- The original 5-item tips list — trimmed to 2 (see above).

## Out of scope

- Any change to the actual generate/iterate/result UI shown in the
  screenshots — this is a marketing page only.
- Mobile-specific component split (this page has always been one responsive
  file, not desktop/mobile variants like the navbar).
- Re-shooting or updating the screenshots later if the real UI changes —
  out of scope for this pass.
