# Explore Quilted Grid + Non-Owner Iterate Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Explore page uniform grid with a MUI quilted image list (showing prompt + style, no URL/scannability), and gate "New Variation" / "Iterate" actions by ownership so non-owners see a "Make it your own" flow with an empty URL field.

**Architecture:** Two independent changes — (1) `IteratePanel` gains an `isOwner` prop that branches text, URL field state, and form validation; `ImageSidebar` derives and passes the flag. (2) `explore/page.js` replaces `Grid + ImageCard` with MUI `ImageList variant="quilted"` with an inline item design (gradient overlay, style chip, truncated prompt). No shared components are modified.

**Tech Stack:** React 18, MUI v5 (`ImageList`, `ImageListItem`, `Chip`, `Skeleton`), Jest + React Testing Library.

## Global Constraints

- Keep `ImagesCard` untouched — mycodes is unaffected.
- `isOwner` defaults to `true` in `IteratePanel` so the standalone image page and mycodes modal are unaffected.
- No new dependencies. No Redux.
- Run tests with `npm run test:frontend`.
- Run dev with `npm run dev` (Next.js on :3000, FastAPI on :8000).

---

### Task 1: IteratePanel non-owner mode

**Files:**
- Create: `src/__tests__/IteratePanel.test.js`
- Modify: `src/app/images/[imageId]/IteratePanel.js`

**Interfaces:**
- Produces: `IteratePanel({ ..., isOwner?: boolean })` — new optional prop, defaults `true`.

---

- [ ] **Step 1: Create the test file with failing tests**

Create `src/__tests__/IteratePanel.test.js`:

```js
import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'

jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }) }))

const mockSetIterateSession = jest.fn()
const mockClearIterateSession = jest.fn()
jest.mock('@/store', () => ({
  useStore: (selector) =>
    selector({
      iterateSession: null,
      setIterateSession: mockSetIterateSession,
      clearIterateSession: mockClearIterateSession,
    }),
}))

jest.mock('@/_utils/ImagesUtils', () => ({ generateImage: jest.fn() }))

jest.mock('@/_utils/qrWeight', () => ({
  qrWeightToSlider: (w) => w,
  QR_SLIDER_MIN: 0,
  QR_SLIDER_MAX: 1,
}))

jest.mock('@/_utils/ImageStyles', () => ({
  styles: [
    { id: 1, title: 'Random', prompt: '', loras: [], sd_model: 'model.safetensors', image_url: '' },
    { id: 2, title: 'Photorealistic', prompt: 'photo', loras: [], sd_model: 'model.safetensors', image_url: '' },
  ],
  selectRandomStyle: jest.fn(() => ({
    id: 2, title: 'Photorealistic', prompt: 'photo', loras: [], sd_model: 'model.safetensors',
  })),
}))

import IteratePanel from '../app/images/[imageId]/IteratePanel'

const IMAGE = {
  _id: 'img1',
  content: 'https://example.com',
  prompt: 'a beautiful forest',
  style_title: 'Photorealistic',
  qr_weight: 0.5,
}

beforeEach(() => jest.clearAllMocks())

// ─── Default panel (isOpen=false) ────────────────────────────────────────────

describe('default panel — owner', () => {
  it('shows New Variation and Iterate this image', () => {
    render(<IteratePanel image={IMAGE} isOpen={false} onOpen={jest.fn()} isOwner={true} />)
    expect(screen.getByText('New Variation')).toBeInTheDocument()
    expect(screen.getByText('Iterate this image')).toBeInTheDocument()
  })
})

describe('default panel — non-owner', () => {
  it('hides New Variation', () => {
    render(<IteratePanel image={IMAGE} isOpen={false} onOpen={jest.fn()} isOwner={false} />)
    expect(screen.queryByText('New Variation')).not.toBeInTheDocument()
  })

  it('shows Make it your own', () => {
    render(<IteratePanel image={IMAGE} isOpen={false} onOpen={jest.fn()} isOwner={false} />)
    expect(screen.getByText('Make it your own')).toBeInTheDocument()
  })
})

// ─── Form panel (isOpen=true) ─────────────────────────────────────────────────

describe('form panel — owner', () => {
  it('URL field is disabled and pre-filled with image.content', () => {
    render(
      <IteratePanel image={IMAGE} isOpen={true} onOpen={jest.fn()} onClose={jest.fn()} isOwner={true} />
    )
    const urlInput = screen.getByLabelText('URL')
    expect(urlInput).toBeDisabled()
    expect(urlInput.value).toBe('https://example.com')
  })

  it('Generate button is enabled when prompt is non-empty', () => {
    render(
      <IteratePanel image={IMAGE} isOpen={true} onOpen={jest.fn()} onClose={jest.fn()} isOwner={true} />
    )
    expect(screen.getByRole('button', { name: /generate/i })).not.toBeDisabled()
  })
})

describe('form panel — non-owner', () => {
  it('shows Make it your own as form title', () => {
    render(
      <IteratePanel image={IMAGE} isOpen={true} onOpen={jest.fn()} onClose={jest.fn()} isOwner={false} />
    )
    // The form header uses the same text as the button
    expect(screen.getAllByText('Make it your own').length).toBeGreaterThan(0)
  })

  it('URL field is empty and editable', () => {
    render(
      <IteratePanel image={IMAGE} isOpen={true} onOpen={jest.fn()} onClose={jest.fn()} isOwner={false} />
    )
    const urlInput = screen.getByLabelText('URL')
    expect(urlInput).not.toBeDisabled()
    expect(urlInput.value).toBe('')
  })

  it('Generate button is disabled when URL is empty', () => {
    render(
      <IteratePanel image={IMAGE} isOpen={true} onOpen={jest.fn()} onClose={jest.fn()} isOwner={false} />
    )
    expect(screen.getByRole('button', { name: /generate/i })).toBeDisabled()
  })

  it('Generate button enables after URL is typed', () => {
    render(
      <IteratePanel image={IMAGE} isOpen={true} onOpen={jest.fn()} onClose={jest.fn()} isOwner={false} />
    )
    fireEvent.change(screen.getByLabelText('URL'), { target: { value: 'https://mysite.com' } })
    expect(screen.getByRole('button', { name: /generate/i })).not.toBeDisabled()
  })

  it('prompt is pre-filled with source image prompt', () => {
    render(
      <IteratePanel image={IMAGE} isOpen={true} onOpen={jest.fn()} onClose={jest.fn()} isOwner={false} />
    )
    const promptInput = screen.getByLabelText('prompt')
    expect(promptInput.value).toBe('a beautiful forest')
  })
})
```

- [ ] **Step 2: Run tests to confirm they all fail**

```bash
cd "/Users/christophbiedermann/Documents/Projects/QR AI/codebase" && npm run test:frontend -- --testPathPattern="IteratePanel" --no-coverage 2>&1 | tail -30
```

Expected: all tests FAIL (IteratePanel doesn't accept `isOwner` yet, so owner/non-owner branches don't exist).

- [ ] **Step 3: Modify `IteratePanel.js`**

Make the following targeted changes to `src/app/images/[imageId]/IteratePanel.js`:

**3a. Change `initFormValues` to accept `isOwner`:**

Replace:
```js
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
```

With:
```js
function initFormValues(image, isOwner = true) {
  const sourceStyle = styles.find((s) => s.title === image.style_title) ?? styles[0];
  return {
    prompt: image.prompt ?? "",
    styleId: sourceStyle.id,
    styleTitle: sourceStyle.title,
    stylePrompt: sourceStyle.prompt,
    styleLoras: sourceStyle.loras ?? [],
    sdModel: image.sd_model ?? "cyberrealistic_v40_151857.safetensors",
    qrWeight: qrWeightToSlider(image.qr_weight ?? 0.5),
    url: isOwner ? (image.content ?? "") : "",
  };
}
```

**3b. Add `isOwner` to the component signature and update form init:**

Replace:
```js
export default function IteratePanel({ image = {}, isOpen, onOpen, onClose, onGeneratingChange }) {
```
With:
```js
export default function IteratePanel({ image = {}, isOpen, onOpen, onClose, onGeneratingChange, isOwner = true }) {
```

Replace:
```js
  const [formValues, setFormValues] = useState(() => initFormValues(image));
```
With:
```js
  const [formValues, setFormValues] = useState(() => initFormValues(image, isOwner));
```

**3c. Update `isFormValid`:**

Replace:
```js
  const isFormValid = formValues.prompt.trim().length > 0;
```
With:
```js
  const isFormValid =
    formValues.prompt.trim().length > 0 &&
    (isOwner || formValues.url.trim().length > 0);
```

**3d. In the DEFAULT PANEL section, wrap "New Variation" in `{isOwner && ...}` and branch the second button's text:**

Replace the entire `{!isOpen && !isActive && (` block:
```jsx
      {/* DEFAULT PANEL */}
      {!isOpen && !isActive && (
        <Stack spacing={2}>
          <Box
            onClick={() => handleGenerate("newVariation")}
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1.75,
              p: "16px 18px",
              border: "1px solid #2e2e2e",
              borderRadius: "16px",
              bgcolor: "#0e0e0e",
              cursor: "pointer",
              "&:hover": { borderColor: "primary.main" },
            }}
          >
            <Box sx={{ flexShrink: 0, width: 44, height: 44, borderRadius: "12px", bgcolor: "rgba(112, 225, 149, 0.08)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <ShuffleIcon sx={{ color: "primary.main", fontSize: 22 }} />
            </Box>
            <Box>
              <Typography variant="h5" sx={{ fontSize: "22px", lineHeight: 1.1, color: "primary.main" }}>New Variation</Typography>
              <Typography variant="body2" sx={{ color: "#b8b8b8", mt: 0.5, lineHeight: 1.45 }}>Same style, new random seed.</Typography>
            </Box>
          </Box>

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
            <Box sx={{ flexShrink: 0, width: 44, height: 44, borderRadius: "12px", bgcolor: "rgba(112, 225, 149, 0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <AutoFixHighIcon sx={{ color: "primary.main", fontSize: 22 }} />
            </Box>
            <Box>
              <Typography variant="h5" sx={{ fontSize: "22px", lineHeight: 1.1, color: "primary.main" }}>Iterate this image</Typography>
              <Typography variant="body2" sx={{ color: "#b8b8b8", mt: 0.5, lineHeight: 1.45 }}>Edit prompt, style, or QR weight and generate a new version.</Typography>
            </Box>
          </Box>
        </Stack>
      )}
```

With:
```jsx
      {/* DEFAULT PANEL */}
      {!isOpen && !isActive && (
        <Stack spacing={2}>
          {isOwner && (
            <Box
              onClick={() => handleGenerate("newVariation")}
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1.75,
                p: "16px 18px",
                border: "1px solid #2e2e2e",
                borderRadius: "16px",
                bgcolor: "#0e0e0e",
                cursor: "pointer",
                "&:hover": { borderColor: "primary.main" },
              }}
            >
              <Box sx={{ flexShrink: 0, width: 44, height: 44, borderRadius: "12px", bgcolor: "rgba(112, 225, 149, 0.08)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <ShuffleIcon sx={{ color: "primary.main", fontSize: 22 }} />
              </Box>
              <Box>
                <Typography variant="h5" sx={{ fontSize: "22px", lineHeight: 1.1, color: "primary.main" }}>New Variation</Typography>
                <Typography variant="body2" sx={{ color: "#b8b8b8", mt: 0.5, lineHeight: 1.45 }}>Same style, new random seed.</Typography>
              </Box>
            </Box>
          )}

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
            <Box sx={{ flexShrink: 0, width: 44, height: 44, borderRadius: "12px", bgcolor: "rgba(112, 225, 149, 0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <AutoFixHighIcon sx={{ color: "primary.main", fontSize: 22 }} />
            </Box>
            <Box>
              <Typography variant="h5" sx={{ fontSize: "22px", lineHeight: 1.1, color: "primary.main" }}>
                {isOwner ? "Iterate this image" : "Make it your own"}
              </Typography>
              <Typography variant="body2" sx={{ color: "#b8b8b8", mt: 0.5, lineHeight: 1.45 }}>
                {isOwner
                  ? "Edit prompt, style, or QR weight and generate a new version."
                  : "Enter a URL and customise the prompt and style to generate your version."}
              </Typography>
            </Box>
          </Box>
        </Stack>
      )}
```

**3e. In the ITERATE FORM section, branch the title and URL field:**

In the form header box (inside `{isOpen && !isActive && (`), replace:
```jsx
              <Box>
                <Typography variant="h5" sx={{ fontSize: "22px", lineHeight: 1.1, color: "primary.main" }}>
                  Iterate this image
                </Typography>
                <Typography variant="body2" sx={{ color: "#b8b8b8", mt: 0.5, lineHeight: 1.45 }}>
                  Edit prompt, style, or QR weight and generate a new version.
                </Typography>
              </Box>
```
With:
```jsx
              <Box>
                <Typography variant="h5" sx={{ fontSize: "22px", lineHeight: 1.1, color: "primary.main" }}>
                  {isOwner ? "Iterate this image" : "Make it your own"}
                </Typography>
                <Typography variant="body2" sx={{ color: "#b8b8b8", mt: 0.5, lineHeight: 1.45 }}>
                  {isOwner
                    ? "Edit prompt, style, or QR weight and generate a new version."
                    : "Enter a URL and customise the prompt and style to generate your version."}
                </Typography>
              </Box>
```

In the form, replace the URL `TextField`:
```jsx
              {/* URL — top, disabled */}
              <TextField
                label="URL"
                name="url"
                fullWidth
                size="small"
                disabled
                value={formValues.url}
                sx={DISABLED_FIELD_SX}
              />
```
With:
```jsx
              {/* URL */}
              <TextField
                label="URL"
                name="url"
                fullWidth
                size="small"
                disabled={isOwner}
                value={formValues.url}
                onChange={
                  !isOwner
                    ? (e) => setFormValues((prev) => ({ ...prev, url: e.target.value }))
                    : undefined
                }
                sx={isOwner ? DISABLED_FIELD_SX : DARK_FIELD_SX}
              />
```

- [ ] **Step 4: Run tests to confirm they all pass**

```bash
cd "/Users/christophbiedermann/Documents/Projects/QR AI/codebase" && npm run test:frontend -- --testPathPattern="IteratePanel" --no-coverage 2>&1 | tail -30
```

Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
cd "/Users/christophbiedermann/Documents/Projects/QR AI/codebase" && git add src/__tests__/IteratePanel.test.js src/app/images/\[imageId\]/IteratePanel.js && git commit -m "$(cat <<'EOF'
feat: add isOwner prop to IteratePanel for non-owner iterate flow

Non-owners see 'Make it your own' (no New Variation), URL field starts
empty and editable, Generate stays disabled until URL is supplied.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: ImageSidebar passes `isOwner` to IteratePanel

**Files:**
- Modify: `src/app/images/[imageId]/ImageSidebar.js`
- Modify: `src/__tests__/ImageSidebar.test.js`

**Interfaces:**
- Consumes: `IteratePanel({ isOwner: boolean })` from Task 1.

---

- [ ] **Step 1: Update the IteratePanel mock in `ImageSidebar.test.js` to expose `isOwner`**

In `src/__tests__/ImageSidebar.test.js`, replace:
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
With:
```js
jest.mock('../app/images/[imageId]/IteratePanel', () => ({
  __esModule: true,
  default: ({ isOpen, onOpen, isOwner }) => (
    <div data-testid="iterate-panel" data-open={String(isOpen)} data-is-owner={String(!!isOwner)}>
      <button onClick={onOpen}>{isOwner !== false ? 'Iterate this image' : 'Make it your own'}</button>
    </div>
  ),
}))
```

- [ ] **Step 2: Add two new tests to `ImageSidebar.test.js`**

Add inside the `describe('showActions=false sidebar', ...)` block (after the existing two tests):

```js
  test('passes isOwner=true to IteratePanel when user owns the image', async () => {
    setSearch('')
    await act(async () => {
      render(
        <ImageSidebar
          image={IMAGE}          // IMAGE.user_id = 'u1' === USER._id
          user={USER}
          customDeleteAction={jest.fn()}
          showActions={false}
        />
      )
    })
    expect(screen.getByTestId('iterate-panel')).toHaveAttribute('data-is-owner', 'true')
  })

  test('passes isOwner=false to IteratePanel when user does not own the image', async () => {
    setSearch('')
    await act(async () => {
      render(
        <ImageSidebar
          image={{ ...IMAGE, user_id: 'other-user' }}
          user={USER}
          customDeleteAction={jest.fn()}
          showActions={false}
        />
      )
    })
    expect(screen.getByTestId('iterate-panel')).toHaveAttribute('data-is-owner', 'false')
  })
```

- [ ] **Step 3: Run tests to confirm the two new tests FAIL**

```bash
cd "/Users/christophbiedermann/Documents/Projects/QR AI/codebase" && npm run test:frontend -- --testPathPattern="ImageSidebar" --no-coverage 2>&1 | tail -30
```

Expected: the two new tests FAIL (ImageSidebar doesn't pass `isOwner` to IteratePanel yet).

- [ ] **Step 4: Pass `isOwner` to `IteratePanel` in `ImageSidebar.js`**

In `src/app/images/[imageId]/ImageSidebar.js`, in the STANDALONE PAGE MODE section, replace:
```jsx
        <IteratePanel
          image={currentImage}
          isOpen={iterateOpen}
          onOpen={() => setIterateOpen(true)}
          onClose={() => setIterateOpen(false)}
          onGeneratingChange={(active) => setIterateActive(active)}
        />
```
With:
```jsx
        <IteratePanel
          image={currentImage}
          isOpen={iterateOpen}
          onOpen={() => setIterateOpen(true)}
          onClose={() => setIterateOpen(false)}
          onGeneratingChange={(active) => setIterateActive(active)}
          isOwner={isOwner}
        />
```

- [ ] **Step 5: Run all tests to confirm everything passes**

```bash
cd "/Users/christophbiedermann/Documents/Projects/QR AI/codebase" && npm run test:frontend --no-coverage 2>&1 | tail -20
```

Expected: all tests PASS, no regressions.

- [ ] **Step 6: Commit**

```bash
cd "/Users/christophbiedermann/Documents/Projects/QR AI/codebase" && git add src/app/images/\[imageId\]/ImageSidebar.js src/__tests__/ImageSidebar.test.js && git commit -m "$(cat <<'EOF'
feat: pass isOwner to IteratePanel from ImageSidebar

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Explore quilted image grid

**Files:**
- Modify: `src/app/(main_pages)/explore/page.js`

**Interfaces:**
- Consumes: `getImages({ featured: true })` from `@/_utils/ImagesUtils` (unchanged).
- Consumes: `ImageModal` from `@/app/(main_pages)/mycodes/ImageModal` (unchanged).
- Consumes: `LikeButton` from `@/_components/actions/LikeButton` (unchanged).

---

- [ ] **Step 1: Replace `explore/page.js` with the quilted implementation**

Overwrite `src/app/(main_pages)/explore/page.js` entirely:

```jsx
"use client";

import { useEffect, useState } from "react";
import {
  Box,
  Chip,
  ImageList,
  ImageListItem,
  Skeleton,
  Typography,
} from "@mui/material";
import useMediaQuery from "@mui/material/useMediaQuery";

import ImageModal from "@/app/(main_pages)/mycodes/ImageModal";
import LikeButton from "@/_components/actions/LikeButton";
import { getImages } from "@/_utils/ImagesUtils";
import { useStore } from "@/store";
import theme from "@/_styles/theme";

// Repeating pattern of item sizes — cycles through images in order.
// cols / rows are relative to the ImageList's total column count.
const SIZE_PATTERN = [
  { cols: 2, rows: 2 },
  { cols: 1, rows: 1 },
  { cols: 1, rows: 1 },
  { cols: 1, rows: 2 },
  { cols: 1, rows: 1 },
  { cols: 2, rows: 1 },
  { cols: 1, rows: 1 },
  { cols: 1, rows: 1 },
];

function getItemSize(index, totalCols) {
  const p = SIZE_PATTERN[index % SIZE_PATTERN.length];
  return {
    cols: Math.min(p.cols, totalCols),
    rows: p.rows,
  };
}

export default function Explore() {
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedImageIndex, setSelectedImageIndex] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const { user } = useStore();
  const isMdUp = useMediaQuery(theme.breakpoints.up("md"));
  const gridCols = isMdUp ? 4 : 2;
  const rowHeight = isMdUp ? 200 : 160;

  useEffect(() => {
    getImages({ featured: true })
      .then((imgs) => setImages(imgs ?? []))
      .catch(() => setImages([]))
      .finally(() => setLoading(false));
  }, []);

  const handleModalOpen = (index) => {
    setSelectedImageIndex(index);
    setModalOpen(true);
  };

  const handleModalClose = () => {
    setModalOpen(false);
    setSelectedImageIndex(null);
  };

  const showPreviousImage = () => {
    setSelectedImageIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
  };

  const showNextImage = () => {
    setSelectedImageIndex((prev) =>
      prev < images.length - 1 ? prev + 1 : 0
    );
  };

  const customLikeAction = (imageId, updatedLikes) => {
    setImages((prev) => {
      const idx = prev.findIndex((img) => img._id === imageId);
      if (idx === -1) return prev;
      const updated = [...prev];
      updated[idx] = { ...updated[idx], likes: updatedLikes };
      return updated;
    });
  };

  if (loading) {
    return (
      <Box sx={{ padding: { xs: "4.7rem 0.5rem", sm: "5rem 1rem" } }}>
        <ImageList variant="quilted" cols={gridCols} rowHeight={rowHeight} gap={8}>
          {Array.from({ length: 8 }, (_, i) => {
            const { cols, rows } = getItemSize(i, gridCols);
            return (
              <ImageListItem key={i} cols={cols} rows={rows}>
                <Skeleton
                  variant="rectangular"
                  width="100%"
                  height={rowHeight * rows}
                  sx={{ bgcolor: "#2a2a2a", borderRadius: "12px" }}
                />
              </ImageListItem>
            );
          })}
        </ImageList>
      </Box>
    );
  }

  if (images.length === 0) {
    return (
      <Box
        sx={{
          padding: { xs: "4.7rem 0.5rem", sm: "5rem 1rem" },
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
        }}
      >
        <Typography variant="h5" sx={{ textAlign: "center" }}>
          No featured images yet.
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ padding: { xs: "4.7rem 0.5rem", sm: "5rem 1rem" } }}>
      <ImageList variant="quilted" cols={gridCols} rowHeight={rowHeight} gap={8}>
        {images.map((image, index) => {
          const { cols, rows } = getItemSize(index, gridCols);
          return (
            <ImageListItem
              key={image._id}
              cols={cols}
              rows={rows}
              sx={{
                position: "relative",
                overflow: "hidden",
                borderRadius: "12px",
                border: "0.5px solid",
                borderColor: "primary.main",
                cursor: "pointer",
                transition: "transform 0.15s, border-color 0.2s",
                "&:hover": {
                  transform: "scale(1.015)",
                  borderColor: "primary.light",
                },
              }}
              onClick={() => handleModalOpen(index)}
            >
              {/* Image */}
              <Box
                component="img"
                src={image.watermarked_image_url}
                alt={image.prompt ?? ""}
                onContextMenu={(e) => e.preventDefault()}
                sx={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  display: "block",
                }}
              />

              {/* Gradient overlay */}
              <Box
                sx={{
                  position: "absolute",
                  inset: 0,
                  background:
                    "linear-gradient(to top, rgba(0,0,0,0.82) 0%, transparent 55%)",
                  pointerEvents: "none",
                }}
              />

              {/* Like button — top right */}
              <Box
                sx={{ position: "absolute", top: 8, right: 8 }}
                onClick={(e) => e.stopPropagation()}
              >
                <LikeButton
                  image={image}
                  user={user}
                  customLikeAction={customLikeAction}
                />
              </Box>

              {/* Bottom overlay: style chip + prompt */}
              <Box
                sx={{
                  position: "absolute",
                  bottom: 0,
                  left: 0,
                  right: 0,
                  p: "10px 12px",
                  pointerEvents: "none",
                }}
              >
                {image.style_title && (
                  <Chip
                    label={image.style_title.toUpperCase()}
                    size="small"
                    sx={{
                      bgcolor: "#2a2a2a",
                      color: "primary.light",
                      fontWeight: 700,
                      fontSize: "10px",
                      letterSpacing: "0.08em",
                      height: "22px",
                      borderRadius: "999px",
                      mb: 0.6,
                    }}
                  />
                )}
                {image.prompt && (
                  <Typography
                    sx={{
                      fontSize: "12px",
                      color: "#e0e0e0",
                      lineHeight: 1.4,
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }}
                  >
                    {image.prompt}
                  </Typography>
                )}
              </Box>
            </ImageListItem>
          );
        })}
      </ImageList>

      {images.length > 0 && (
        <ImageModal
          open={modalOpen}
          index={selectedImageIndex}
          handleClose={handleModalClose}
          handlePrevious={showPreviousImage}
          handleNext={showNextImage}
          images={images}
          setImages={setImages}
          customLikeAction={customLikeAction}
        />
      )}
    </Box>
  );
}
```

- [ ] **Step 2: Run all tests (no regressions expected)**

```bash
cd "/Users/christophbiedermann/Documents/Projects/QR AI/codebase" && npm run test:frontend --no-coverage 2>&1 | tail -20
```

Expected: all tests PASS.

- [ ] **Step 3: Start dev server and visually verify the Explore page**

```bash
cd "/Users/christophbiedermann/Documents/Projects/QR AI/codebase" && npm run dev
```

Open `http://localhost:3000/explore` and check:
- Images render in a quilted (varying size) layout
- Bottom overlay shows style chip + truncated prompt (no URL, no scannability)
- Like button is in the top-right corner of each image
- Hover effect (slight scale + border glow)
- Clicking an image opens the modal
- Modal sidebar shows "Make it your own" (not "New Variation" + "Iterate this image") when viewing another user's image
- Loading state shows skeleton placeholders in the quilted pattern

- [ ] **Step 4: Commit**

```bash
cd "/Users/christophbiedermann/Documents/Projects/QR AI/codebase" && git add "src/app/(main_pages)/explore/page.js" && git commit -m "$(cat <<'EOF'
feat: replace Explore grid with MUI quilted ImageList

Shows prompt + style chip overlay per image; removes URL and scannability
from the card. Non-owners get Make it your own in the modal sidebar.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```
