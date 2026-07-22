# Swipeable use-case modal, shared across /generate and /styles/[slug]

## Problem

`UseCasesCarousel.js` (the "Made to be seen..." use-case strip on `/generate`) opens an
enlarged-image `Dialog` on card click, but that dialog only supports click-based
chevron navigation and a click-based close button — no swipe, so on mobile (where the
chevrons are small tap targets over a full-bleed image) closing or paging through
images is awkward.

Separately, the "Perfect For" section on `/styles/[slug]` (`RichStyleLayout` in
`page.js`) renders the same kind of card (title/description/icon/image) in a 3-card
masonry grid, but the cards aren't clickable at all — no enlarged view exists there.

## Goals

- Add swipe-to-close (swipe down) and swipe-to-navigate (swipe left/right) to the
  use-case enlarged-image modal, for mobile.
- Reuse that same modal from the `/styles/[slug]` "Perfect For" section, so clicking
  one of its 3 cards opens the same enlarged view, cycling through that style's 3
  cards.

## Non-goals

- Fixing `UseCasesCarousel.test.js`, which is already fully broken on master
  (8/8 failing) — it exercises a dot-indicator/auto-advance carousel design that
  doesn't match the current scroll-row implementation. Unrelated to this change.
- Changing `ImageModal.js` (the `/mycodes`, `/explore`, and style-page *Examples*
  carousel modal) — it already has swipe-to-close and swipe-to-navigate (QRAI-132 and
  its follow-up fixes). Out of scope.
- Any change to the underlying use-case/perfect-for data shape in `ImageStyles.js`.

## Design

### 1. Extract `UseCaseModal` — `src/_components/UseCaseModal.js`

A new shared client component, extracted from the `Dialog` currently inlined in
`UseCasesCarousel.js` (chevrons, close button, image, caption gradient overlay — visual
design unchanged).

Props: `{ open, items, index, onClose, onNext, onPrevious }`.

- `items`: array of `{ id, category, description, image, Icon }` — the shape
  `UseCasesCarousel` already builds from `USE_CASES`.
- Renders `null`/nothing when `items[index]` is unset (mirrors the current
  `activeItem` guard).

Swipe via `react-swipeable`'s `useSwipeable`, spread onto the enlarged-image content
`Box` (not the `Dialog` backdrop):
- `onSwipedDown` → `onClose()`
- `onSwipedLeft` → `onNext()`
- `onSwipedRight` → `onPrevious()`

Unlike `ImageModal.js`, this modal has no scrollable content and no sidebar
competing for horizontal gestures, so a single `useSwipeable` instance covers close +
navigation — no need for `ImageModal`'s split close/nav handlers or scrollTop guard.

Keyboard handling (arrow keys, Escape) stays in the *consumer* (`UseCasesCarousel`,
`PerfectForGrid`) since each already owns its own open/close state — `UseCaseModal`
itself stays presentational plus swipe.

### 2. `UseCasesCarousel.js`

Replace the inline `Dialog`/`IconButton`/chevron/close-icon block with:

```jsx
<UseCaseModal
  open={modalOpen}
  items={items}
  index={modalIndex}
  onClose={closeModal}
  onNext={showNext}
  onPrevious={showPrevious}
/>
```

Scroll-row rendering, shuffle-on-mount, and the existing keydown effect are untouched.
Drop now-unused imports (`Dialog`, `IconButton`, `ChevronLeftIcon`, `ChevronRightIcon`,
`CloseIcon`) that move into `UseCaseModal`.

### 3. `PerfectForGrid.js` (new) — `src/app/(marketing)/styles/[slug]/PerfectForGrid.js`

Client component taking `{ perfectFor }` (the raw 3-card array: `title`, `description`,
`icon`, `imageUrl`). Renders the existing masonry grid markup unchanged (moved as-is
from `page.js`, including `PERFECT_FOR_RATIO`, which relocates here since it's only
used in this grid).

Adds local state (`modalIndex`) and an `onClick` per card that opens `UseCaseModal`,
mapping cards to the shared item shape inline:
`{ id: title, category: title, description, image: imageUrl, Icon: ICONS[icon] }`.
Next/previous cycle through the same style's 3 cards (`(i + 1) % 3`, wrapping).

### 4. `page.js`

`RichStyleLayout`'s inline "Perfect For" `Box` block is replaced with
`<PerfectForGrid perfectFor={lp.perfectFor} />`. The `ICONS` import stays if still used
elsewhere in `page.js`; `PERFECT_FOR_RATIO` constant is deleted from `page.js` (moved).

### 5. Tests

Add `src/__tests__/UseCaseModal.test.js`, mocking `react-swipeable` the same way
`UseCasesCarousel.test.js` already does (capture the config passed to `useSwipeable`,
call the captured callbacks directly). Covers:
- `onSwipedDown` calls `onClose`
- `onSwipedLeft` calls `onNext`
- `onSwipedRight` calls `onPrevious`
- chevron clicks still call `onNext`/`onPrevious` (click path unchanged)

No test changes to `UseCasesCarousel.test.js` (see Non-goals).

## Risks / edge cases

- Style pages with fewer than 3 `perfectFor` cards: `(i + 1) % items.length` still
  wraps correctly for any length ≥ 1; no special-casing needed.
- Swipe threshold/config (min distance, velocity) should match `ImageModal.js`'s
  defaults so the gesture feel is consistent app-wide — use `react-swipeable`
  defaults, don't invent new thresholds.
