# QRAI-120 Iterate Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace RemixCard with an in-modal iterate experience giving users two paths: New Variation (single-click, new seed) and Iterate this image (editable form with prompt, style, QR weight, URL).

**Architecture:** `IteratePanel` owns all iterate state and generate logic; it's rendered inside `ImageSidebar`. `ImageSidebar` adds an `iterateOpen` boolean to swap between showing all sidebar content (default) and only the iterate form (expanded). `GeneratingModal` is a separate Dialog component rendered from `IteratePanel` via MUI portal.

**Tech Stack:** Next.js 14, React 18, MUI v5, Zustand (read-only for user), Jest + Testing Library (`npm run test:frontend`)

## Global Constraints

- No new npm packages
- Use MUI `sx` props and the existing theme palette — do not add inline `style` tags
- `generateImage(payload)` from `@/_utils/ImagesUtils` is the server action; it calls `sliderToQrWeight` internally, so always pass slider values (-3..+3) for `qr_weight`, never backend values (0..1)
- Never write iterate form state to the global Zustand store
- `image.qr_weight` in the image document is a backend value (0..1) — use `qrWeightToSlider` to convert before displaying on the slider
- `image.style_title` in the document is always a resolved style name (never "Random") because the frontend resolves it before calling `generateImage`
- `image.style_id` and `image.style_loras` are NOT stored in the DB — look them up from the `styles` array by `image.style_title`
- Test command: `npm run test:frontend` from the `codebase/` directory

---

## File Map

| Action | Path |
|---|---|
| Modify | `src/_utils/qrWeight.js` |
| Modify | `src/_utils/ImageStyles.js` |
| Modify | `src/app/(main_pages)/generate/GenerateForm.js` |
| Modify | `src/app/(main_pages)/generate/(formComponents)/StylesCard.js` |
| Create | `src/app/images/[imageId]/GeneratingModal.js` |
| Create | `src/app/images/[imageId]/IteratePanel.js` |
| Modify | `src/app/images/[imageId]/ImageSidebar.js` |
| Delete | `src/app/images/[imageId]/RemixCard.js` |
| Modify | `src/__tests__/qrWeight.test.js` |
| Create | `src/__tests__/GeneratingModal.test.js` |
| Create | `src/__tests__/IteratePanel.test.js` |

---

### Task 1: Add `qrWeightToSlider` to `qrWeight.js` and `selectRandomStyle` to `ImageStyles.js`

**Files:**
- Modify: `src/_utils/qrWeight.js`
- Modify: `src/_utils/ImageStyles.js`
- Modify: `src/app/(main_pages)/generate/GenerateForm.js`
- Modify: `src/__tests__/qrWeight.test.js`

**Interfaces:**
- Produces: `qrWeightToSlider(backendValue: number): number` — inverse of `sliderToQrWeight`; maps [0,1] → [-3,+3]
- Produces: `selectRandomStyle(): StyleObject` — randomly picks a non-Random style object from the `styles` array. Returns `{ id, title, prompt, loras, image_url, sd_model }`

- [ ] **Step 1: Write failing tests for `qrWeightToSlider`**

Append to `src/__tests__/qrWeight.test.js`:

```js
import { sliderToQrWeight, qrWeightToSlider } from '../_utils/qrWeight'

describe('qrWeightToSlider', () => {
  test('maps backend endpoints and center back to slider range', () => {
    expect(qrWeightToSlider(0)).toBe(-3)
    expect(qrWeightToSlider(0.5)).toBe(0)
    expect(qrWeightToSlider(1)).toBe(3)
  })

  test('round-trips with sliderToQrWeight', () => {
    for (let v = -3; v <= 3.0001; v += 0.5) {
      expect(qrWeightToSlider(sliderToQrWeight(v))).toBeCloseTo(v, 4)
    }
  })

  test('clamps out-of-range backend values', () => {
    expect(qrWeightToSlider(-1)).toBe(-3)
    expect(qrWeightToSlider(2)).toBe(3)
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd codebase && npm run test:frontend -- --testPathPattern=qrWeight
```

Expected: FAIL — `qrWeightToSlider is not a function`

- [ ] **Step 3: Add `qrWeightToSlider` to `src/_utils/qrWeight.js`**

Append after the existing `sliderToQrWeight` export:

```js
/**
 * Convert a backend qr_weight (0..1) back to slider value (-3..+3).
 * Used to pre-fill the QR weight slider from a stored image document.
 */
export function qrWeightToSlider(backendValue) {
  const v = Number(backendValue);
  const safe = Number.isFinite(v) ? v : 0.5;
  const clamped = Math.min(1, Math.max(0, safe));
  const slider = clamped * (QR_SLIDER_MAX - QR_SLIDER_MIN) + QR_SLIDER_MIN;
  return Math.round(slider * 10000) / 10000;
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npm run test:frontend -- --testPathPattern=qrWeight
```

Expected: all `qrWeightToSlider` tests PASS

- [ ] **Step 5: Write failing test for `selectRandomStyle`**

The `imageStyles.test.js` file imports from `ImageStyles`. Add a new test file or append to existing:

Append to `src/__tests__/imageStyles.test.js`:

```js
import { styles, selectRandomStyle } from '../_utils/ImageStyles'

describe('selectRandomStyle', () => {
  test('returns a style object that is not Random', () => {
    const result = selectRandomStyle()
    expect(result.id).not.toBe(1)
    expect(result.title).not.toBe('Random')
  })

  test('returned style has all required generate fields', () => {
    const result = selectRandomStyle()
    expect(typeof result.id).toBe('number')
    expect(typeof result.title).toBe('string')
    expect(typeof result.prompt).toBe('string')
    expect(Array.isArray(result.loras)).toBe(true)
    expect(typeof result.sd_model).toBe('string')
  })

  test('always picks from the styles array', () => {
    const result = selectRandomStyle()
    expect(styles).toContainEqual(result)
  })
})
```

- [ ] **Step 6: Run to confirm it fails**

```bash
npm run test:frontend -- --testPathPattern=imageStyles
```

Expected: FAIL — `selectRandomStyle is not a function`

- [ ] **Step 7: Add `selectRandomStyle` to `src/_utils/ImageStyles.js`**

Append after the `styles` array export:

```js
/**
 * Pick a random non-Random style. Used by GenerateForm and IteratePanel
 * when the user has selected style_id === 1 ("Random").
 */
export function selectRandomStyle() {
  const available = styles.filter((s) => s.id !== 1);
  return available[Math.floor(Math.random() * available.length)];
}
```

- [ ] **Step 8: Update `GenerateForm.js` to import `selectRandomStyle` instead of defining it inline**

In `src/app/(main_pages)/generate/GenerateForm.js`, find:

```js
import { styles } from "@/_utils/ImageStyles";
```

Replace with:

```js
import { styles, selectRandomStyle } from "@/_utils/ImageStyles";
```

Then find and remove the entire inline `selectRandomStyle` function (lines starting with `const selectRandomStyle = () => {`):

```js
  // Function to select a random style and update the form values in the store
  const selectRandomStyle = () => {
    // Filter out the "Random" style
    const availableStyles = styles.filter((style) => style.id !== 1);
    // Select a random style
    const randomStyle =
      availableStyles[Math.floor(Math.random() * availableStyles.length)];

    // Update the form values in the store
    return {
      ...generateFormValues,
      style_id: randomStyle.id,
      style_prompt: randomStyle.prompt,
      style_title: randomStyle.title,
      sd_model: randomStyle.sd_model,
      loras: randomStyle.loras ?? [],
    };
  };
```

Then find the usage inside `handleGenerate`:

```js
      if (generateForm.style_id === 1) {
        // Select a random style and update form values
        generateForm = selectRandomStyle();
      }
```

Replace with:

```js
      if (generateForm.style_id === 1) {
        const randomStyle = selectRandomStyle();
        generateForm = {
          ...generateFormValues,
          style_id: randomStyle.id,
          style_prompt: randomStyle.prompt,
          style_title: randomStyle.title,
          sd_model: randomStyle.sd_model,
          loras: randomStyle.loras ?? [],
        };
      }
```

- [ ] **Step 9: Run all tests to confirm nothing broke**

```bash
npm run test:frontend
```

Expected: all tests PASS

- [ ] **Step 10: Commit**

```bash
git add src/_utils/qrWeight.js src/_utils/ImageStyles.js src/app/(main_pages)/generate/GenerateForm.js src/__tests__/qrWeight.test.js src/__tests__/imageStyles.test.js
git commit -m "feat: add qrWeightToSlider inverse and extract selectRandomStyle utility"
```

---

### Task 2: Modify `StylesCard` to accept a `selectedTitle` prop

`StylesCard` currently reads `generateFormValues.style_title` from the global Zustand store to determine which tile is selected. `IteratePanel` tracks the selected style in local state and needs to pass it directly. Adding an optional `selectedTitle` prop makes the component usable in both contexts while remaining backward-compatible.

**Files:**
- Modify: `src/app/(main_pages)/generate/(formComponents)/StylesCard.js`

**Interfaces:**
- Consumes: existing props `{ item, index, handleClick }` — unchanged
- Produces: same component, now also accepts optional `selectedTitle?: string`; when provided, overrides the Zustand store value for the selected check

- [ ] **Step 1: Modify `StylesCard.js`**

Find:

```js
function StylesCard(props) {
  const { item, index, handleClick } = props;

  /* ---------------------------- DECLARE VARIABLES --------------------------- */

  const { generateFormValues } = useStore();
  const theme = useTheme();
  const primaryColor = theme.palette.primary.main;
  const secondaryColor = theme.palette.secondary.main;

  const selected = item.title === generateFormValues.style_title ? true : false;
```

Replace with:

```js
function StylesCard(props) {
  const { item, index, handleClick, selectedTitle } = props;

  /* ---------------------------- DECLARE VARIABLES --------------------------- */

  const { generateFormValues } = useStore();
  const theme = useTheme();
  const primaryColor = theme.palette.primary.main;
  const secondaryColor = theme.palette.secondary.main;

  const selected = item.title === (selectedTitle ?? generateFormValues.style_title);
```

- [ ] **Step 2: Run all tests to confirm nothing broke**

```bash
npm run test:frontend
```

Expected: all tests PASS

- [ ] **Step 3: Commit**

```bash
git add src/app/(main_pages)/generate/(formComponents)/StylesCard.js
git commit -m "feat: add optional selectedTitle prop to StylesCard for local-state selection"
```

---

### Task 3: Create `GeneratingModal`

A Dialog shown during generation. Two internal states: loading (shows the existing `GeneratingLoader` GIF animation) and error (shows a message with Retry and Back to image buttons).

**Files:**
- Create: `src/app/images/[imageId]/GeneratingModal.js`
- Create: `src/__tests__/GeneratingModal.test.js`

**Interfaces:**
- Produces: `<GeneratingModal open error onRetry onBack />`
  - `open: boolean` — controls Dialog visibility
  - `error: boolean` — false → loading state, true → error state
  - `onRetry: () => void` — called when Retry is clicked
  - `onBack: () => void` — called when Back to image is clicked

- [ ] **Step 1: Write failing tests**

Create `src/__tests__/GeneratingModal.test.js`:

```js
import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'

// GeneratingLoader uses a GIF background — stub it so jsdom doesn't choke
jest.mock(
  '@/app/(main_pages)/generate/(formComponents)/GeneratingLoader',
  () => ({ __esModule: true, default: () => <div data-testid="generating-loader" /> })
)

import GeneratingModal from '../app/images/[imageId]/GeneratingModal'

test('shows generating loader when not in error state', () => {
  render(<GeneratingModal open error={false} onRetry={jest.fn()} onBack={jest.fn()} />)
  expect(screen.getByTestId('generating-loader')).toBeInTheDocument()
  expect(screen.queryByText('Retry')).not.toBeInTheDocument()
})

test('shows error state with Retry and Back to image buttons', () => {
  render(<GeneratingModal open error onRetry={jest.fn()} onBack={jest.fn()} />)
  expect(screen.queryByTestId('generating-loader')).not.toBeInTheDocument()
  expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /back to image/i })).toBeInTheDocument()
})

test('Retry button calls onRetry', () => {
  const onRetry = jest.fn()
  render(<GeneratingModal open error onRetry={onRetry} onBack={jest.fn()} />)
  fireEvent.click(screen.getByRole('button', { name: /retry/i }))
  expect(onRetry).toHaveBeenCalledTimes(1)
})

test('Back to image button calls onBack', () => {
  const onBack = jest.fn()
  render(<GeneratingModal open error onRetry={jest.fn()} onBack={onBack} />)
  fireEvent.click(screen.getByRole('button', { name: /back to image/i }))
  expect(onBack).toHaveBeenCalledTimes(1)
})

test('does not render content when open=false', () => {
  render(<GeneratingModal open={false} error={false} onRetry={jest.fn()} onBack={jest.fn()} />)
  expect(screen.queryByTestId('generating-loader')).not.toBeInTheDocument()
})
```

- [ ] **Step 2: Run to confirm they fail**

```bash
npm run test:frontend -- --testPathPattern=GeneratingModal
```

Expected: FAIL — module not found

- [ ] **Step 3: Create `src/app/images/[imageId]/GeneratingModal.js`**

```js
"use client";

import React from "react";
import { Box, Typography, Button, Stack, Dialog } from "@mui/material";
import GeneratingLoader from "@/app/(main_pages)/generate/(formComponents)/GeneratingLoader";

export default function GeneratingModal({ open, error, onRetry, onBack }) {
  return (
    <Dialog
      open={open}
      PaperProps={{
        sx: {
          bgcolor: "#161616",
          backgroundImage: "none",
          borderRadius: "16px",
          width: "min(90vw, 600px)",
        },
      }}
    >
      <Box sx={{ p: 3 }}>
        {error ? (
          <Box sx={{ textAlign: "center" }}>
            <Typography variant="h5" sx={{ mb: 1 }}>
              Something went wrong
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Generation failed. You can retry or go back to the image.
            </Typography>
            <Stack direction="row" spacing={2} justifyContent="center">
              <Button variant="contained" color="secondary" onClick={onRetry}>
                Retry
              </Button>
              <Button variant="outlined" color="primary" onClick={onBack}>
                Back to image
              </Button>
            </Stack>
          </Box>
        ) : (
          <GeneratingLoader />
        )}
      </Box>
    </Dialog>
  );
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npm run test:frontend -- --testPathPattern=GeneratingModal
```

Expected: all PASS

- [ ] **Step 5: Commit**

```bash
git add src/app/images/[imageId]/GeneratingModal.js src/__tests__/GeneratingModal.test.js
git commit -m "feat: add GeneratingModal dialog component with loading and error states"
```

---

### Task 4: Create `IteratePanel`

The main component replacing `RemixCard`. Renders the two-box default panel or the iterate form depending on `isOpen`. Owns all form state, seed logic, and the `generateImage` call. Renders `GeneratingModal` (portaled to `<body>` by MUI).

**Files:**
- Create: `src/app/images/[imageId]/IteratePanel.js`
- Create: `src/__tests__/IteratePanel.test.js`

**Interfaces:**
- Consumes (from Task 1): `qrWeightToSlider` from `@/_utils/qrWeight`, `selectRandomStyle` from `@/_utils/ImageStyles`
- Consumes (from Task 2): `StylesCard` with `selectedTitle` prop from `@/app/(main_pages)/generate/(formComponents)/StylesCard`
- Consumes (from Task 3): `GeneratingModal` from `./GeneratingModal`
- Produces: `<IteratePanel image isOpen onOpen onClose />`
  - `image: ImageDoc` — the source image object (fields: `_id, prompt, style_title, style_prompt, sd_model, seed, qr_weight, content, negative_prompt`)
  - `isOpen: boolean` — when true, shows the iterate form (controlled by ImageSidebar)
  - `onOpen: () => void` — called when the user clicks "Iterate this image"
  - `onClose: () => void` — called when the back chevron is clicked

- [ ] **Step 1: Write failing tests**

Create `src/__tests__/IteratePanel.test.js`:

```js
import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

const mockPush = jest.fn()
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: mockPush }) }))

const mockGenerateImage = jest.fn()
jest.mock('@/_utils/ImagesUtils', () => ({ generateImage: (...a) => mockGenerateImage(...a) }))

jest.mock('../app/images/[imageId]/GeneratingModal', () => ({
  __esModule: true,
  default: ({ open, error, onRetry, onBack }) => (
    <div data-testid="generating-modal" data-open={String(open)} data-error={String(!!error)}>
      {error && <button onClick={onBack}>Back to image</button>}
      {error && <button onClick={onRetry}>Retry</button>}
    </div>
  ),
}))

// Stub StylesCard: render a plain button so we can click a style tile
jest.mock('@/app/(main_pages)/generate/(formComponents)/StylesCard', () => ({
  __esModule: true,
  default: ({ item, handleClick }) => (
    <button data-testid={`style-${item.title}`} onClick={() => handleClick(item)}>
      {item.title}
    </button>
  ),
}))

import IteratePanel from '../app/images/[imageId]/IteratePanel'

const IMAGE = {
  _id: 'img1',
  prompt: 'a cat',
  style_title: 'Ukiyo-e',
  style_prompt: 'Detailed, Graphic Novel, Cinematic, Ukiyo-e Flat Design',
  sd_model: 'colorful_v31_62333.safetensors',
  seed: 42,
  qr_weight: 0.5,
  content: 'https://example.com',
  negative_prompt: '',
}

const onOpen = jest.fn()
const onClose = jest.fn()

function renderPanel(isOpen = false) {
  return render(
    <IteratePanel image={IMAGE} isOpen={isOpen} onOpen={onOpen} onClose={onClose} />
  )
}

beforeEach(() => {
  jest.clearAllMocks()
  mockGenerateImage.mockResolvedValue({ _id: 'newimg1' })
})

// --- Default panel ---

test('shows New Variation and Iterate this image in default state', () => {
  renderPanel()
  expect(screen.getByText('New Variation')).toBeInTheDocument()
  expect(screen.getByText('Iterate this image')).toBeInTheDocument()
})

test('clicking Iterate this image calls onOpen', () => {
  renderPanel()
  fireEvent.click(screen.getByText('Iterate this image'))
  expect(onOpen).toHaveBeenCalledTimes(1)
})

// --- Form panel ---

test('shows form fields when isOpen=true', () => {
  renderPanel(true)
  expect(screen.getByRole('textbox', { name: /prompt/i })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /generate/i })).toBeInTheDocument()
})

test('prompt textarea is pre-filled from image', () => {
  renderPanel(true)
  expect(screen.getByRole('textbox', { name: /prompt/i })).toHaveValue('a cat')
})

test('back button calls onClose', () => {
  renderPanel(true)
  fireEvent.click(screen.getByRole('button', { name: /back/i }))
  expect(onClose).toHaveBeenCalledTimes(1)
})

// --- GeneratingModal ---

test('GeneratingModal is not open in default state', () => {
  renderPanel()
  expect(screen.getByTestId('generating-modal')).toHaveAttribute('data-open', 'false')
})

// --- New Variation ---

test('New Variation fires generateImage with seed -1', async () => {
  renderPanel()
  fireEvent.click(screen.getByText('New Variation'))
  await waitFor(() => expect(mockGenerateImage).toHaveBeenCalledTimes(1))
  expect(mockGenerateImage.mock.calls[0][0].seed).toBe(-1)
})

test('New Variation fires generateImage with original image values', async () => {
  renderPanel()
  fireEvent.click(screen.getByText('New Variation'))
  await waitFor(() => expect(mockGenerateImage).toHaveBeenCalledTimes(1))
  const payload = mockGenerateImage.mock.calls[0][0]
  expect(payload.website).toBe('https://example.com')
  expect(payload.prompt).toBe('a cat')
})

// --- Iterate Generate: seed logic ---

test('Generate with style unchanged uses image.seed', async () => {
  renderPanel(true)
  fireEvent.click(screen.getByRole('button', { name: /generate/i }))
  await waitFor(() => expect(mockGenerateImage).toHaveBeenCalledTimes(1))
  expect(mockGenerateImage.mock.calls[0][0].seed).toBe(42)
})

test('Generate after style change uses seed -1', async () => {
  renderPanel(true)
  // Expand accordion and click a different style
  fireEvent.click(screen.getByText('Ukiyo-e')) // accordion trigger shows current style title
  fireEvent.click(screen.getByTestId('style-Expressionism'))
  fireEvent.click(screen.getByRole('button', { name: /generate/i }))
  await waitFor(() => expect(mockGenerateImage).toHaveBeenCalledTimes(1))
  expect(mockGenerateImage.mock.calls[0][0].seed).toBe(-1)
})

// --- Success / failure ---

test('on success navigates to new image', async () => {
  renderPanel()
  fireEvent.click(screen.getByText('New Variation'))
  await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/images/newimg1'))
})

test('on failure GeneratingModal shows error state', async () => {
  mockGenerateImage.mockRejectedValueOnce(new Error('fail'))
  renderPanel()
  fireEvent.click(screen.getByText('New Variation'))
  await waitFor(() =>
    expect(screen.getByTestId('generating-modal')).toHaveAttribute('data-error', 'true')
  )
})

test('Back to image after New Variation failure closes modal', async () => {
  mockGenerateImage.mockRejectedValueOnce(new Error('fail'))
  renderPanel()
  fireEvent.click(screen.getByText('New Variation'))
  await waitFor(() => screen.getByText('Back to image'))
  fireEvent.click(screen.getByText('Back to image'))
  expect(screen.getByTestId('generating-modal')).toHaveAttribute('data-open', 'false')
})

test('Back to image after iterate failure keeps modal closed and does not call onClose', async () => {
  mockGenerateImage.mockRejectedValueOnce(new Error('fail'))
  renderPanel(true)
  fireEvent.click(screen.getByRole('button', { name: /generate/i }))
  await waitFor(() => screen.getByText('Back to image'))
  fireEvent.click(screen.getByText('Back to image'))
  expect(screen.getByTestId('generating-modal')).toHaveAttribute('data-open', 'false')
  expect(onClose).not.toHaveBeenCalled()
})

test('Retry re-fires the same generateImage call', async () => {
  mockGenerateImage
    .mockRejectedValueOnce(new Error('fail'))
    .mockResolvedValueOnce({ _id: 'newimg2' })
  renderPanel()
  fireEvent.click(screen.getByText('New Variation'))
  await waitFor(() => screen.getByText('Retry'))
  fireEvent.click(screen.getByText('Retry'))
  await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/images/newimg2'))
})
```

- [ ] **Step 2: Run to confirm they fail**

```bash
npm run test:frontend -- --testPathPattern=IteratePanel
```

Expected: FAIL — module not found

- [ ] **Step 3: Create `src/app/images/[imageId]/IteratePanel.js`**

```js
"use client";

import React, { useState, useRef } from "react";
import {
  Box,
  Typography,
  Button,
  TextField,
  Slider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Stack,
  IconButton,
  Grid,
} from "@mui/material";
import AutoFixHighIcon from "@mui/icons-material/AutoFixHigh";
import ShuffleIcon from "@mui/icons-material/Shuffle";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { useRouter } from "next/navigation";

import { styles, selectRandomStyle } from "@/_utils/ImageStyles";
import { generateImage } from "@/_utils/ImagesUtils";
import { qrWeightToSlider, QR_SLIDER_MIN, QR_SLIDER_MAX } from "@/_utils/qrWeight";
import StylesCard from "@/app/(main_pages)/generate/(formComponents)/StylesCard";
import GeneratingModal from "./GeneratingModal";

function initFormValues(image) {
  const sourceStyle = styles.find((s) => s.title === image.style_title) ?? styles[0];
  return {
    prompt: image.prompt ?? "",
    styleId: sourceStyle.id,
    styleTitle: sourceStyle.title,
    stylePrompt: sourceStyle.prompt,
    styleLoras: sourceStyle.loras ?? [],
    sdModel: image.sd_model ?? "cyberrealistic_v40_151857.safetensors",
    qrWeight: qrWeightToSlider(image.qr_weight ?? 0.5),
    url: image.content ?? "",
  };
}

export default function IteratePanel({ image, isOpen, onOpen, onClose }) {
  const router = useRouter();
  const originalStyleTitle = useRef(image.style_title ?? "");
  const lastPayload = useRef(null);
  const lastTrigger = useRef("iterate");

  const [formValues, setFormValues] = useState(() => initFormValues(image));
  const [generating, setGenerating] = useState(false);
  const [generatingError, setGeneratingError] = useState(false);

  const handleStyleClick = (item) => {
    setFormValues((prev) => ({
      ...prev,
      styleId: item.id,
      styleTitle: item.title,
      stylePrompt: item.prompt,
      styleLoras: item.loras ?? [],
      sdModel: item.sd_model,
    }));
  };

  const buildPayload = (trigger) => {
    if (trigger === "newVariation") {
      const sourceStyle = styles.find((s) => s.title === image.style_title) ?? styles[0];
      return {
        website: image.content ?? "",
        prompt: image.prompt ?? "",
        style_id: sourceStyle.id,
        style_title: sourceStyle.title,
        style_prompt: sourceStyle.prompt,
        loras: sourceStyle.loras ?? [],
        sd_model: image.sd_model,
        qr_weight: qrWeightToSlider(image.qr_weight ?? 0.5),
        negative_prompt: image.negative_prompt ?? "",
        seed: -1,
      };
    }

    let styleId = formValues.styleId;
    let styleTitle = formValues.styleTitle;
    let stylePrompt = formValues.stylePrompt;
    let styleLoras = formValues.styleLoras;
    let sdModel = formValues.sdModel;

    if (styleId === 1) {
      const resolved = selectRandomStyle();
      styleId = resolved.id;
      styleTitle = resolved.title;
      stylePrompt = resolved.prompt;
      styleLoras = resolved.loras ?? [];
      sdModel = resolved.sd_model;
    }

    const seed = styleTitle !== originalStyleTitle.current ? -1 : image.seed;

    return {
      website: formValues.url,
      prompt: formValues.prompt,
      style_id: styleId,
      style_title: styleTitle,
      style_prompt: stylePrompt,
      loras: styleLoras,
      sd_model: sdModel,
      qr_weight: formValues.qrWeight,
      negative_prompt: image.negative_prompt ?? "",
      seed,
    };
  };

  const handleGenerate = async (trigger) => {
    const payload = buildPayload(trigger);
    lastPayload.current = payload;
    lastTrigger.current = trigger;
    setGeneratingError(false);
    setGenerating(true);
    try {
      const newImage = await generateImage(payload);
      router.push(`/images/${newImage._id}`);
    } catch {
      setGeneratingError(true);
    } finally {
      setGenerating(false);
    }
  };

  const handleRetry = async () => {
    if (!lastPayload.current) return;
    setGeneratingError(false);
    setGenerating(true);
    try {
      const newImage = await generateImage(lastPayload.current);
      router.push(`/images/${newImage._id}`);
    } catch {
      setGeneratingError(true);
    } finally {
      setGenerating(false);
    }
  };

  const handleBackToImage = () => {
    setGenerating(false);
    setGeneratingError(false);
  };

  return (
    <>
      <GeneratingModal
        open={generating || generatingError}
        error={generatingError}
        onRetry={handleRetry}
        onBack={handleBackToImage}
      />

      {/* DEFAULT PANEL — always rendered; visible when isOpen=false (ImageSidebar controls visibility) */}
      {!isOpen && (
        <Stack spacing={2}>
          {/* New Variation box */}
          <Box
            onClick={() => handleGenerate("newVariation")}
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1.75,
              p: "16px 18px",
              border: "1px dashed #2e2e2e",
              borderRadius: "16px",
              bgcolor: "#0e0e0e",
              cursor: "pointer",
              "&:hover": { borderColor: "primary.main" },
            }}
          >
            <Box
              sx={{
                flexShrink: 0,
                width: 44,
                height: 44,
                borderRadius: "12px",
                bgcolor: "rgba(112, 225, 149, 0.08)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <ShuffleIcon sx={{ color: "primary.main", fontSize: 22 }} />
            </Box>
            <Box>
              <Typography variant="h5" sx={{ fontSize: "18px", lineHeight: 1.1, color: "primary.main" }}>
                New Variation
              </Typography>
              <Typography variant="body2" sx={{ color: "#b8b8b8", mt: 0.5, lineHeight: 1.45 }}>
                Same style, new random seed.
              </Typography>
            </Box>
          </Box>

          {/* Iterate this image box */}
          <Box
            onClick={onOpen}
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1.75,
              p: "20px 22px",
              border: "1px solid #2e2e2e",
              borderRadius: "16px",
              bgcolor: "#0e0e0e",
              cursor: "pointer",
              "&:hover": { borderColor: "primary.main" },
            }}
          >
            <Box
              sx={{
                flexShrink: 0,
                width: 44,
                height: 44,
                borderRadius: "12px",
                bgcolor: "rgba(112, 225, 149, 0.12)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <AutoFixHighIcon sx={{ color: "primary.main", fontSize: 22 }} />
            </Box>
            <Box>
              <Typography variant="h5" sx={{ fontSize: "22px", lineHeight: 1.1, color: "primary.main" }}>
                Iterate this image
              </Typography>
              <Typography variant="body2" sx={{ color: "#b8b8b8", mt: 0.5, lineHeight: 1.45 }}>
                Edit prompt, style, or QR weight and generate a new version.
              </Typography>
            </Box>
          </Box>
        </Stack>
      )}

      {/* ITERATE FORM — shown when isOpen=true */}
      {isOpen && (
        <Box>
          <IconButton
            aria-label="back"
            onClick={onClose}
            sx={{ mb: 1, color: "primary.main" }}
          >
            <ArrowBackIcon />
          </IconButton>

          <Stack spacing={2.5}>
            {/* Prompt */}
            <TextField
              label="Prompt"
              name="prompt"
              multiline
              minRows={3}
              fullWidth
              value={formValues.prompt}
              onChange={(e) =>
                setFormValues((prev) => ({ ...prev, prompt: e.target.value }))
              }
              inputProps={{ "aria-label": "prompt" }}
            />

            {/* Style accordion */}
            <Accordion
              disableGutters
              sx={{
                bgcolor: "#0e0e0e",
                border: "1px solid #2e2e2e",
                borderRadius: "12px !important",
                "&:before": { display: "none" },
              }}
            >
              <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: "primary.main" }} />}>
                <Typography sx={{ color: "#b8b8b8" }}>
                  Style: <strong style={{ color: "#fff" }}>{formValues.styleTitle}</strong>
                </Typography>
              </AccordionSummary>
              <AccordionDetails sx={{ p: 1 }}>
                <Grid container spacing={1}>
                  {styles.map((item, index) => (
                    <Grid item xs={6} sm={4} key={index}>
                      <StylesCard
                        item={item}
                        index={index}
                        handleClick={handleStyleClick}
                        selectedTitle={formValues.styleTitle}
                      />
                    </Grid>
                  ))}
                </Grid>
              </AccordionDetails>
            </Accordion>

            {/* QR Weight slider */}
            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                QR Code Weight
              </Typography>
              <Slider
                min={QR_SLIDER_MIN}
                max={QR_SLIDER_MAX}
                step={0.1}
                value={formValues.qrWeight}
                onChange={(_, val) =>
                  setFormValues((prev) => ({ ...prev, qrWeight: val }))
                }
                marks={[
                  { value: QR_SLIDER_MIN, label: "Artistic" },
                  { value: QR_SLIDER_MAX, label: "Scannable" },
                ]}
              />
            </Box>

            {/* URL (secondary) */}
            <TextField
              label="URL"
              name="url"
              fullWidth
              size="small"
              value={formValues.url}
              onChange={(e) =>
                setFormValues((prev) => ({ ...prev, url: e.target.value }))
              }
              sx={{ "& .MuiInputLabel-root": { color: "#7d7d7d" } }}
            />

            <Button
              variant="contained"
              color="secondary"
              size="large"
              fullWidth
              onClick={() => handleGenerate("iterate")}
            >
              Generate
            </Button>
          </Stack>
        </Box>
      )}
    </>
  );
}
```

- [ ] **Step 4: Run tests**

```bash
npm run test:frontend -- --testPathPattern=IteratePanel
```

Expected: all PASS. If `style-Expressionism` can't be found, verify your `styles` array in `ImageStyles.js` contains an entry with `title: "Expressionism"` (it does, at id 3).

- [ ] **Step 5: Run full test suite**

```bash
npm run test:frontend
```

Expected: all PASS

- [ ] **Step 6: Commit**

```bash
git add src/app/images/[imageId]/IteratePanel.js src/__tests__/IteratePanel.test.js
git commit -m "feat: add IteratePanel with New Variation, iterate form, and generate flow"
```

---

### Task 5: Wire `IteratePanel` into `ImageSidebar` and delete `RemixCard`

`ImageSidebar` adds `iterateOpen` state. When false, all sidebar sections render with `IteratePanel` at the bottom in default mode. When true, only `IteratePanel` renders (form mode, filling the full sidebar). A `useEffect` resets `iterateOpen` whenever `image._id` changes so prev/next navigation always returns to the default panel.

**Files:**
- Modify: `src/app/images/[imageId]/ImageSidebar.js`
- Delete: `src/app/images/[imageId]/RemixCard.js`
- Modify: `src/__tests__/ImageSidebar.test.js`

**Interfaces:**
- Consumes (from Task 4): `<IteratePanel image isOpen onOpen onClose />` from `./IteratePanel`

- [ ] **Step 1: Add tests that IteratePanel appears in the sidebar**

The existing `ImageSidebar.test.js` renders without `showActions` (defaults to `true`), which exercises the old modal branch. The iterate panel lives in the `showActions={false}` branch. New tests must pass that prop explicitly.

**1a.** Add `fireEvent` to the existing import at the top of `src/__tests__/ImageSidebar.test.js`:

```js
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react'
```

**1b.** Add the IteratePanel mock **with the other `jest.mock()` calls at the top of the file** (before the `import ImageSidebar` line), e.g. after the ScannabilityBadge mock:

```js
jest.mock('../app/images/[imageId]/IteratePanel', () => ({
  __esModule: true,
  default: ({ isOpen, onOpen }) => (
    <div data-testid="iterate-panel" data-open={String(isOpen)}>
      <button onClick={onOpen}>Iterate this image</button>
    </div>
  ),
}))
```

**1c.** Append the new tests at the bottom of `src/__tests__/ImageSidebar.test.js`:

```js
// showActions=false branch (new standalone-page sidebar with IteratePanel)
async function renderNewSidebar(imageOverride = {}) {
  await act(async () => {
    render(
      <ImageSidebar
        image={{ ...IMAGE, ...imageOverride }}
        user={USER}
        customDeleteAction={jest.fn()}
        showActions={false}
      />
    )
  })
}

describe('showActions=false sidebar', () => {
  test('renders IteratePanel in default state', async () => {
    setSearch('')
    await renderNewSidebar()
    expect(screen.getByTestId('iterate-panel')).toBeInTheDocument()
    expect(screen.getByTestId('iterate-panel')).toHaveAttribute('data-open', 'false')
  })

  test('opening iterate form hides other sidebar sections', async () => {
    setSearch('')
    await renderNewSidebar({ content: 'https://example.com' })
    fireEvent.click(screen.getByText('Iterate this image'))
    expect(screen.getByTestId('iterate-panel')).toHaveAttribute('data-open', 'true')
    expect(screen.queryByText('Links to')).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run existing ImageSidebar tests to confirm they still pass (baseline)**

```bash
npm run test:frontend -- --testPathPattern=ImageSidebar
```

Expected: existing tests PASS, new tests FAIL (IteratePanel not yet in sidebar)

- [ ] **Step 3: Update `ImageSidebar.js` — `showActions=false` mode**

In `src/app/images/[imageId]/ImageSidebar.js`:

**3a. Replace the RemixCard import with IteratePanel:**

Find:
```js
import RemixCard from "./RemixCard";
```

Replace with:
```js
import IteratePanel from "./IteratePanel";
```

**3b. Add `iterateOpen` state and reset effect after the existing state declarations (around line 61):**

Find (after the existing useState declarations):
```js
  const [promptCopied, setPromptCopied] = useState(false);
```

Add after it:
```js
  const [iterateOpen, setIterateOpen] = useState(false);

  useEffect(() => {
    setIterateOpen(false);
  }, [image?._id]);
```

**3c. Replace the RemixCard in the `showActions=false` render section.**

Find:
```js
      {/* REMIX CARD */}
      <Box sx={{ mt: 4 }}>
        <RemixCard image={currentImage} />
      </Box>
```

Replace with:
```js
      {/* ITERATE PANEL */}
      <Box sx={{ mt: 4 }}>
        <IteratePanel
          image={currentImage}
          isOpen={iterateOpen}
          onOpen={() => setIterateOpen(true)}
          onClose={() => setIterateOpen(false)}
        />
      </Box>
```

**3d. Wrap the sidebar content sections in a conditional so they hide when `iterateOpen=true`.**

The `showActions=false` return currently renders several `<Box>` sections (Links to, Style + Scannability, Prompt, Unlock card, IteratePanel). Wrap the first four sections in `{!iterateOpen && (...)}`.

Find the start of the `showActions=false` return block:
```js
  /* -------------------------------------------------------------------------- */
  /*  STANDALONE PAGE MODE (showActions=false) — new design                      */
  /* -------------------------------------------------------------------------- */
  return (
    <Box
      sx={{
        width: "100%",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* LINKS TO */}
      <Box>
```

The structure to produce:

```js
  return (
    <Box sx={{ width: "100%", display: "flex", flexDirection: "column" }}>
      {!iterateOpen && (
        <>
          {/* LINKS TO */}
          <Box>
            {/* ... existing Links to content unchanged ... */}
          </Box>

          {/* STYLE + SCANNABILITY */}
          <Box sx={{ display: "flex", gap: 4, alignItems: "flex-start", mt: 3.25, pt: 3, borderTop: "1px solid #2e2e2e" }}>
            {/* ... existing Style + Scannability content unchanged ... */}
          </Box>

          {/* PROMPT */}
          {currentImage?.prompt && (
            <Box sx={{ mt: 3.25, pt: 3, borderTop: "1px solid #2e2e2e" }}>
              {/* ... existing Prompt content unchanged ... */}
            </Box>
          )}

          {/* UNLOCK CARD */}
          {showUnlockCard && (
            <Box sx={{ mt: 4, bgcolor: "primary.light", borderRadius: "16px", p: 3 }}>
              {/* ... existing Unlock card content unchanged ... */}
            </Box>
          )}
        </>
      )}

      {/* ITERATE PANEL */}
      <Box sx={{ mt: iterateOpen ? 0 : 4 }}>
        <IteratePanel
          image={currentImage}
          isOpen={iterateOpen}
          onOpen={() => setIterateOpen(true)}
          onClose={() => setIterateOpen(false)}
        />
      </Box>
    </Box>
  );
```

Wrap the four content sections (Links to, Style + Scannability, Prompt, Unlock card) inside `{!iterateOpen && (<>...</>)}`. Keep the IteratePanel `<Box>` outside that conditional so it's always rendered (it handles its own default vs form display via `isOpen`).

- [ ] **Step 4: Run ImageSidebar tests**

```bash
npm run test:frontend -- --testPathPattern=ImageSidebar
```

Expected: all PASS including the two new tests

- [ ] **Step 5: Delete `RemixCard.js`**

```bash
rm "src/app/images/[imageId]/RemixCard.js"
```

- [ ] **Step 6: Run full test suite**

```bash
npm run test:frontend
```

Expected: all PASS

- [ ] **Step 7: Commit**

```bash
git add src/app/images/[imageId]/ImageSidebar.js src/__tests__/ImageSidebar.test.js
git rm src/app/images/[imageId]/RemixCard.js
git commit -m "feat: wire IteratePanel into ImageSidebar, remove RemixCard"
```

---

## Verification

After all tasks:

- [ ] `npm run test:frontend` — all tests pass
- [ ] `npm run dev` — start the dev server
- [ ] Navigate to an existing image's detail page
- [ ] Confirm "New Variation" and "Iterate this image" boxes appear where RemixCard was
- [ ] Click "New Variation" — GeneratingModal should open, then navigate to new image on success
- [ ] Click "Iterate this image" — sidebar should hide links/style/prompt/unlock sections; form should fill the panel
- [ ] Edit prompt, change style, adjust slider — confirm fields update
- [ ] Click back chevron — confirm sidebar sections return, edits reset only if navigating away
- [ ] Click Generate — GeneratingModal should open; on success navigate to new image
- [ ] Simulate failure (disconnect network) — GeneratingModal should show error state; Retry should re-fire; Back to image should return to form
- [ ] Navigate prev/next in the image modal (mycodes gallery) — confirm iterate form resets to default
