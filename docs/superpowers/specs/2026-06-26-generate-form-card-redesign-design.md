# Generate Form Card Redesign

**Date:** 2026-06-26  
**Branch:** styling/typography-overhaul  
**Files:** `src/app/(main_pages)/generate/GenerateForm.js`, `src/app/(main_pages)/generate/(formComponents)/UrlPrompt.js`

## Goal

Tighten the visual hierarchy of the generate form card to match the reference screenshot:
- Smaller section labels with a colored icon prefix
- Replace the style button with an inline chip row
- Remove Advanced Settings entirely

---

## 1. Section Headers

**Change:** `variant="h5"` (1.375rem) → `variant="h6"` (1.125rem, 600-weight Inter) in `UrlPrompt.js`.

Each label becomes a flex row with a primary-colored MUI icon to its left:

| Section | Icon |
|---|---|
| Website URL | `LinkIcon` |
| Image Description | `EditIcon` |
| Style | `StyleIcon` |

The "Style" label and its chip row live in `GenerateForm.js`, not in `UrlPrompt.js`.

Helper sx for each label row:
```js
{ display: "flex", alignItems: "center", gap: 0.75, mb: 1 }
```

---

## 2. Style Chips

Replace the "Style: X" outlined button with a chip row rendered directly in `GenerateForm.js`, below `<UrlPrompt />`.

### Featured chips

Slice the first 6 entries from `styles` (exported from `ImageStyles.js`):
```js
const FEATURED_STYLES = styles.slice(0, 6); // Random + first 5 named
```
This gives: **Random, Ukiyo-e, Expressionism, Dreamy, Low Poly Art, Photography** (subject to file order — reorder `ImageStyles.js` to curate).

### Chip states

| Condition | Chip appearance |
|---|---|
| `style_id` matches this chip | `variant="filled" color="primary"` (green, dark text) |
| unselected | `variant="outlined" color="primary"` (subtle wash, secondary text) |

### Overflow chip

If the current `generateFormValues.style_id` is **not** in `FEATURED_STYLES`, render an extra `<Chip>` for that style (filled/primary) between the featured chips and the "+" chip. This lets any style chosen from the modal appear inline as a selected chip without cluttering the default list.

### "+" chip

A final `<Chip label="+" variant="outlined" color="primary">` that calls `handleStyleModalOpen()`. No icon needed — the "+" label is sufficient.

### Click handler

```js
const handleStyleChipClick = (item) => {
  setGenerateFormValues({
    ...generateFormValues,
    style_id: item.id,
    style_prompt: item.prompt,
    style_title: item.title,
    sd_model: item.sd_model,
    loras: item.loras ?? [],
  });
};
```

### Layout

Chips wrap naturally (`flexWrap: "wrap"`, `gap: 1`). No scrolling needed for the default 6 + 1 count; a non-featured overflow chip adds at most one more.

---

## 3. Removals

Remove from `GenerateForm.js`:
- `settingsModalOpen` state
- `handleSettingsModalOpen` function
- The "Advanced Settings" `<Button>`
- The `<Divider>` between the button row and the Generate button
- `<SettingsModal>` render and its `open`/`handleClose`/`handleInputChange` props
- `SettingsModal` import

`SettingsModal.js` itself is **not deleted** — it may be referenced elsewhere or reintroduced later.

---

## 4. What stays the same

- `StylesModal` and its existing `handleStyleClick` logic remain unchanged
- The Generate button and its disabled/enabled logic are unchanged
- `UrlPrompt.js` placeholder text, helper text, and dice-icon randomiser are unchanged
- Guest credit handling and all Amplitude tracking in `handleGenerate` are unchanged
- `SettingsModal` file itself is kept (just not rendered)

---

## Out of scope

- Mobile-specific layout changes
- Reordering styles in `ImageStyles.js` (owner's choice)
- Any changes to `StylesModal` internals
