# UseCasesCarousel Mobile Full-Bleed + Swipe

## Problem

`UseCasesCarousel.js` (`src/app/(main_pages)/generate/UseCasesCarousel.js`) is the "Made to be seen. Made to be scanned." section on `/generate` — an auto-advancing carousel of 7 use-case images with a coverflow effect (peeking adjacent cards) on `md`+ screens. On mobile (`xs`), only the center card renders (adjacent cards are hidden via `display: none`), but the card itself is still sized at `78%` width with `8px` rounded corners — leaving visible margins on both sides rather than filling the screen. The existing chevron buttons are already absolutely positioned at the edges of the full-width container, but because the card is narrower than the container on mobile, they end up floating in that empty margin rather than sitting over the image. There's no swipe gesture support — only the chevron buttons and dot indicators drive navigation.

(Note: this supersedes an earlier, abandoned direction targeting `GuestGallery.js`, a component that turned out to be disconnected from the page entirely — see git history for `c48e687ad`. This spec targets the carousel that is actually live.)

## Goal

On mobile, make the carousel card full width with square corners so the chevron buttons sit directly over the image. Add swipe gesture navigation at all breakpoints. Stop auto-advance once the user manually navigates (button, swipe, dot, or adjacent-card click), matching the pause-on-hover behavior already present for desktop mouse users.

## Scope

Touches only `src/app/(main_pages)/generate/UseCasesCarousel.js`. No changes to `GuestGallery.js`, `page.js`, `ImageModal`, or any other component.

## Design

### Mobile full-bleed (`xs` only)

- Card width: `{ xs: "78%", md: "58%" }` → `{ xs: "100%", md: "58%" }` (the `xs` card-sizing line in `getCardPosition`'s consumer, i.e. the card `Box`'s `sx.width`).
- Card border radius: `{ xs: "8px", md: "12px" }` → `{ xs: 0, md: "12px" }`.
- No other layout changes — `CARD_POSITIONS` (the `left`/`transform` values driving the coverflow slide) are unchanged; at `xs` only the center card is visible anyway (`display: { xs: isCenter ? "block" : "none", md: "block" }`), so widening it to 100% doesn't affect the (invisible-on-mobile) coverflow math for adjacent cards.

### Overlaid buttons

No code change beyond what full-bleed already causes: the chevron `IconButton`s are already `position: "absolute"`, `left`/`right: { xs: 8, md: 24 }`, vertically centered — once the card spans the full container width, these buttons sit directly over the image edges instead of in a side margin.

### Swipe (all breakpoints)

- Add `useSwipeable` from `react-swipeable` (already a project dependency, same library used in `ImageModal.js`).
- `onSwipedLeft` → `navigate(1)` (next), `onSwipedRight` → `navigate(-1)` (previous) — the same `navigate` function the chevron buttons already call.
- Spread the returned handlers onto the "Carousel container" `Box` (the `position: "relative"` box that already wraps the buttons and cards).
- No breakpoint gating — swipe works everywhere; it doesn't conflict with existing mouse/click behavior since `react-swipeable` only reacts to touch/pointer drag gestures by default (`trackMouse` stays unset/false, matching `ImageModal`'s config).

### Pause auto-advance on manual interaction

- New state: `const [hasInteracted, setHasInteracted] = useState(false)`.
- The existing `useEffect` that sets the `setInterval` for auto-advance changes its guard from `if (paused) return;` to `if (paused || hasInteracted) return;`.
- `setHasInteracted(true)` is called once, the first time the user manually navigates via any of the four existing entry points:
  1. Chevron button click (`navigate(-1)` / `navigate(1)`)
  2. Swipe (same `navigate` calls, so this is automatic once swipe calls `navigate`)
  3. Dot indicator click (`setCurrent(i)`)
  4. Adjacent-card click (`setCurrent(i)`, only reachable at `md`+ where adjacent cards are visible)
- Simplest implementation: a small `goTo(index)` helper that wraps `setCurrent(index)` and `setHasInteracted(true)`, used by the dot-click and adjacent-card-click handlers; `navigate(dir)` also sets `setHasInteracted(true)` before computing the next index. This avoids duplicating the "mark interacted" line at every call site while keeping `navigate`/`goTo` as two thin, separately-testable functions (they already have different signatures — direction vs. absolute index — so merging them into one isn't a clean simplification).
- Once `hasInteracted` is `true`, it never resets (no code path sets it back to `false`) — this is a permanent, one-way stop for the session, independent of the existing hover-based `paused` flag (which still toggles normally on `onMouseEnter`/`onMouseLeave` for desktop, though it becomes moot once `hasInteracted` is `true`).

### Out of scope / explicitly not doing

- No change to dot indicators, the info overlay, or the adjacent-card click-to-jump behavior itself (only that it now also sets `hasInteracted`).
- No change to the `md`+ coverflow effect, card widths, or border radius at that breakpoint.
- No change to the 4.5s auto-advance interval duration.
- No change to `GuestGallery.js` or any other component.
