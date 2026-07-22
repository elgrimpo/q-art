# Low-Scannability Warning Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show an inline warning + "Increase QR Weight" link on the image detail page/modal whenever the scannability score is Fair or worse (score < 80), linking into the existing Iterate panel.

**Architecture:** Single conditional block added to `ImageSidebar.js`'s existing standalone-sidebar render path, reusing the `setIterateOpen` state setter already wired to the Iterate panel's `onOpen` prop. No new components, no new routes.

**Tech Stack:** React 18, MUI v5 (`Box`, `Typography`), Jest + React Testing Library.

## Global Constraints

- Threshold: warning shows when `hasScore && score < 80` (Fair 70-79 / Poor 40-69 / Unscannable 0-39). Good (80-89) / Excellent (90+) show nothing.
- Clicking the link must call the same `setIterateOpen(true)` used by the existing "Iterate this image" / "Make it your own" entry — no new panel, no navigation.
- Visual style: inline text, not an `Alert` banner — link styled `primary.main` + underline (matches the "Links to" section pattern), message in `text.secondary`.
- Applies to both owners and non-owners (no `isOwner` gating — matches existing scannability ring behavior).
- Only touch `src/app/images/[imageId]/ImageSidebar.js` and its test file. The `showActions={true}` branch in the same file is dead code and must not be modified.

---

### Task 1: Add low-scannability warning to ImageSidebar

**Files:**
- Modify: `src/app/images/[imageId]/ImageSidebar.js:536-544` (STYLE + SCANNABILITY block, standalone-page render path)
- Test: `src/__tests__/ImageSidebar.test.js`

**Interfaces:**
- Consumes: existing local vars `hasScore` (bool, `ImageSidebar.js:185`), `score` (number, `ImageSidebar.js:186`), `setIterateOpen` (state setter, `ImageSidebar.js:131`).
- Produces: nothing new consumed by other tasks — this is the final task.

- [ ] **Step 1: Write the failing tests**

Add this `describe` block to `src/__tests__/ImageSidebar.test.js`, right after the existing `describe('showActions=false sidebar', ...)` block (after line 190):

```javascript
describe('low-scannability warning (showActions=false)', () => {
  test('shows warning with working iterate link when score is Fair (70-79)', async () => {
    setSearch('')
    await renderNewSidebar({ scannability_score: 75 })
    expect(screen.getByText(/Scannability might be low/)).toBeInTheDocument()
    const link = screen.getByText('Increase QR Weight')
    fireEvent.click(link)
    expect(screen.getByTestId('iterate-panel')).toHaveAttribute('data-open', 'true')
  })

  test('shows warning when score is Poor (40-69)', async () => {
    setSearch('')
    await renderNewSidebar({ scannability_score: 55 })
    expect(screen.getByText(/Scannability might be low/)).toBeInTheDocument()
  })

  test('shows warning when score is Unscannable (0-39)', async () => {
    setSearch('')
    await renderNewSidebar({ scannability_score: 20 })
    expect(screen.getByText(/Scannability might be low/)).toBeInTheDocument()
  })

  test('hides warning when score is Good (80-89)', async () => {
    setSearch('')
    await renderNewSidebar({ scannability_score: 85 })
    expect(screen.queryByText(/Scannability might be low/)).not.toBeInTheDocument()
  })

  test('hides warning when score is Excellent (90+)', async () => {
    setSearch('')
    await renderNewSidebar({ scannability_score: 95 })
    expect(screen.queryByText(/Scannability might be low/)).not.toBeInTheDocument()
  })

  test('hides warning when there is no score', async () => {
    setSearch('')
    await renderNewSidebar()
    expect(screen.queryByText(/Scannability might be low/)).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test:frontend -- ImageSidebar`
Expected: FAIL — 6 new failures in `low-scannability warning (showActions=false)`, all with "Unable to find an element with text: /Scannability might be low/" (or the inverse `queryBy` assertions passing vacuously but the positive-case tests failing).

- [ ] **Step 3: Implement the warning block**

In `src/app/images/[imageId]/ImageSidebar.js`, replace lines 536-544:

```javascript
            {hasScore && (
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="overline" sx={{ display: "block", mb: 1.25 }}>
                  Scannability
                </Typography>
                <ScannabilityRing score={score} diameter={40} />
              </Box>
            )}
          </Box>
```

with:

```javascript
            {hasScore && (
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="overline" sx={{ display: "block", mb: 1.25 }}>
                  Scannability
                </Typography>
                <ScannabilityRing score={score} diameter={40} />
              </Box>
            )}
          </Box>

          {hasScore && score < 80 && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" sx={{ color: "text.secondary" }}>
                Scannability might be low.{" "}
                <Box
                  component="span"
                  onClick={() => setIterateOpen(true)}
                  sx={{
                    color: "primary.main",
                    fontWeight: 700,
                    cursor: "pointer",
                    textDecoration: "underline",
                  }}
                >
                  Increase QR Weight
                </Box>{" "}
                to improve it.
              </Typography>
            </Box>
          )}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test:frontend -- ImageSidebar`
Expected: PASS — all tests in the file green, including the 6 new ones.

- [ ] **Step 5: Commit**

```bash
git add src/app/images/[imageId]/ImageSidebar.js src/__tests__/ImageSidebar.test.js
git commit -m "feat(images): warn when scannability is Fair or worse, link to iterate"
```

## Self-Review Notes

- **Spec coverage:** Threshold (score < 80) ✓, link triggers same iterate action ✓, inline-text style not Alert ✓, applies to owner and non-owner (no `isOwner` check added) ✓, dead `showActions=true` branch untouched ✓.
- **Placeholder scan:** none — all steps have literal code and exact commands.
- **Type consistency:** `setIterateOpen` and `score`/`hasScore` names match their existing declarations in `ImageSidebar.js:131,185-186` exactly; no new identifiers introduced elsewhere in the file.
