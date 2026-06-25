# QRAI-120: In-place Iterate Flow — Design Spec

Status: approved  
Date: 2026-06-25  
Epic: QRAI-120

## What we're building

Replace `RemixCard` with an in-modal iterate experience that keeps the source image visible throughout. Two entry points: **New Variation** (single click, no form) and **Iterate this image** (expands into a unified form). Generation triggers a `<GeneratingModal>` dialog, and on success navigates to the new image.

Full product spec: `codebase/docs/iterate-flow-spec.md`

## Files changed

| File | Change |
|---|---|
| `src/app/images/[imageId]/RemixCard.js` | Deleted |
| `src/app/images/[imageId]/IteratePanel.js` | New — all iterate state + logic |
| `src/app/images/[imageId]/GeneratingModal.js` | New — generating dialog component |
| `src/app/images/[imageId]/ImageSidebar.js` | Add `iterateOpen` state; conditionally render sidebar sections vs full-panel form |

## Component structure

```
ImageSidebar
  ├── [all sidebar sections: links, style/scannability, prompt, unlock card]  ← hidden when iterateOpen
  └── IteratePanel (key={image._id})
        ├── default state: New Variation box + Iterate box
        ├── form state: back chevron + form fields (fills full sidebar)
        └── <GeneratingModal open={panelState === "generating"} />
```

## State

### `ImageSidebar`

```js
const [iterateOpen, setIterateOpen] = useState(false)
```

- `false` → renders all sidebar sections + `IteratePanel` in default mode
- `true` → renders **only** `IteratePanel` in form mode (full sidebar)

Reset `iterateOpen → false` via `useEffect` watching `image._id` (handles prev/next navigation).

### `IteratePanel`

```js
panelState     "default" | "form" | "generating"
formValues     { prompt, styleId, styleTitle, stylePrompt, loras, qrWeight, url }
generatingError  null | true
lastTrigger    "iterate" | "newVariation"   // determines "back to image" destination on error
```

`formValues` initialised from `image` prop at mount. `originalStyleTitle` captured at mount from `image.style_title` — never changes. `key={image._id}` on `IteratePanel` ensures remount (full reset) when the viewed image changes.

## UI states

### Default

Two stacked boxes:

1. **New Variation box** — dashed border, shuffle icon. Single click → `panelState = "generating"`, `lastTrigger = "newVariation"`.
2. **Iterate this image box** — wand icon, title, description. Click → `panelState = "form"`, calls `onOpen()` on `ImageSidebar`.

### Form (full sidebar takeover)

```
← back chevron   (→ "default", calls onClose(), edits preserved)

Prompt           TextField multiline, pre-filled from image.prompt
Style            MUI Accordion (collapsed → shows current style title)
                   Expanded → tile grid using existing StylesCard component
                   Tile select → updates formValues, collapses accordion
QR Weight        MUI Slider, pre-filled from image.qr_weight
URL              TextField (secondary/muted), pre-filled from image.content

[Generate]
```

### Generating

`<GeneratingModal open>` renders above everything (MUI portals to `<body>`). The panel underneath returns to default appearance.

## Generate flow

On **Generate** (from form) or **New Variation** (from default):

1. **Resolve seed:**
   - New Variation → `-1`
   - Form, style unchanged (`formValues.styleTitle === originalStyleTitle`) → `image.seed`
   - Form, style changed → `-1`

2. **Resolve style:** if `formValues.styleId === 1` (Random), run `selectRandomStyle()` (same logic as `GenerateForm.js`) to pick a concrete style before sending.

3. Build `generateFormValues`-shaped payload, set `panelState = "generating"`, call `generateImage()`.

4. **On success:** `router.push(/images/${newImage._id})`. Works in all contexts (standalone page and intercepting-route modal) — Next.js handles navigation appropriately.

5. **On failure:** `GeneratingModal` switches to error state: **Retry** (re-fires same payload) + **Back to image**. "Back to image" closes modal and restores:
   - `panelState = "form"` if `lastTrigger === "iterate"` (form edits preserved)
   - `panelState = "default"` if `lastTrigger === "newVariation"`

## GeneratingModal rendering context

`<GeneratingModal>` is rendered from inside `IteratePanel` and MUI portals it to `<body>`, so it appears above everything regardless of the sidebar state:

- Triggered from **New Variation** (default panel): `iterateOpen` is `false`, so sidebar sections are visible underneath. Dialog sits on top.
- Triggered from **the form**: `iterateOpen` is `true`, so only `IteratePanel` is visible underneath. Dialog sits on top.

In both cases the generating experience is identical.

## `GeneratingModal` component

Props: `open`, `error` (null | true), `onRetry`, `onBack`

- `error === null` → renders `GeneratingLoader` (existing GIF animation component)
- `error === true` → renders error message + Retry button + Back to image button

## Random style edge case

`image.style_title` is never `"Random"` in the database — `GenerateForm` resolves Random to a real style client-side before calling `generateImage`. So comparing `formValues.styleTitle !== originalStyleTitle` is always safe. If the user selects "Random" in the accordion during an iterate session, it reads as "changed" (no stored style is titled "Random"), which correctly triggers a new seed.

## Edge cases

| Scenario | Behaviour |
|---|---|
| Prev/Next arrow in image modal | `key={image._id}` on `IteratePanel` remounts it; `ImageSidebar` `useEffect` resets `iterateOpen → false` |
| Close modal (X) | Same — remount clears all state |
| Back chevron in form | Returns to default panel; edits preserved in memory while image unchanged |
| New Variation → error → Back to image | Returns to default panel |
| Iterate → error → Back to image | Returns to form with edits intact |
| No credits/cost UI | Not shown anywhere in the iterate flow |
| Mobile | No layout changes needed — sidebar already stacks below image; IteratePanel lives in that stacked area |

## What's out of scope

- Explore-page "Use this" reusing the iterate form
- Surfacing generation cost
- Analytics instrumentation (separate ticket)
