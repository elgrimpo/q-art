# Admin: view other users' codes on /mycodes

## Problem

Admins (identified via `ADMIN_EMAILS`, QRAI-129) have no way to browse other users'
generated QR codes for moderation/support purposes. The `/mycodes` page always scopes
the image list to the logged-in user.

## Solution

Add a 3-dot menu, visible only to admins, on the `/mycodes` page. It contains a single
toggle, "My codes" (default ON). Turning it OFF switches the image query from "images
by me" to "images not by me" (all other users' images, unfiltered — same query shape
`/api/images/get` already supports via `exclude_user_id`, no `featured` constraint).

No backend changes are needed: `GET /api/images/get` already accepts `user_id` and
`exclude_user_id` as independent, unauthenticated query params.

## Dead code removed as part of this change

`/explore` used to be served by rewriting to the `/mycodes` route; it is now its own
standalone page (`src/app/(main_pages)/explore/page.js`). `mycodes/page.js` is therefore
only ever mounted at the literal route `/mycodes`, which makes every
`pathname === "/mycodes"` conditional in that file always true. This diff removes the
now-dead `else` branches (and the `pathname`/`usePathname` plumbing once nothing reads
it), landing directly in the same lines being touched to add the admin toggle:

- `src/app/(main_pages)/mycodes/page.js`:
  - `sort` default ternary (was `pathname === "/mycodes" ? "Newest" : "Most Liked"`) → always `"Newest"`
  - guest/signed-out redirect guard's `&& pathname === "/mycodes"` → dropped, redundant
  - `user_id` / `exclude_user_id` ternaries in `applyFilters` and the infinite-scroll effect → simplified (and are exactly where the new `myCodesOnly` toggle plugs in, see below)
  - empty-state ("You don't have any images yet") ternary → simplified, now gated on `myCodesOnly` instead (see below)
  - `pathname={pathname}` prop passed to `<ImageModal>` → removed; `ImageModal` never destructures or reads it
  - `usePathname` import + `pathname` variable → removed once nothing references them

## State & data flow

In `src/app/(main_pages)/mycodes/page.js`:

- New state: `const [myCodesOnly, setMyCodesOnly] = useState(true)`. Reset to `true` in
  the existing mount effect (previously keyed on `[pathname]`, now runs once on mount
  since `pathname` is gone) so the toggle never persists across navigation/reload.
- `isAdmin` derived the same way `ImageCard.js` already does: `const isAdmin = !!user?.is_admin`.
- Query building becomes:
  - `user_id: myCodesOnly ? user._id : undefined`
  - `exclude_user_id: myCodesOnly ? undefined : user._id`
  - For non-admins `myCodesOnly` is always `true`, so this is behaviorally identical to
    today's `user_id`-only query — zero change for non-admin users.
- Empty-state message ("You don't have any images yet") additionally gated on
  `myCodesOnly` — it shouldn't show while an admin is browsing other users' (empty)
  results.
- `applyFilters(newFilters, myCodesOnlyOverride)` gains an optional second param so
  toggling the switch refetches immediately with the new value, without waiting on a
  state update/rerender race — mirrors how every other filter already calls
  `applyFilters` directly on selection.
- The infinite-scroll (`inView`) effect also reads `myCodesOnly` when building
  subsequent page params.

## New component: `AdminMyCodesMenu`

A single shared component (not split into Desktop/Mobile files like the filter panels)
— it's one boolean toggle, too small to justify a duplicated file pair.

- Location: `src/app/(main_pages)/mycodes/AdminMyCodesMenu.js`
- Props: `myCodesOnly: boolean`, `onToggle: (newValue: boolean) => void`,
  `trigger: "icon" | "fab"`.
- Renders:
  - `trigger="icon"` → `IconButton` with `MoreVertIcon` (desktop)
  - `trigger="fab"` → small `Fab` with `MoreVertIcon` (mobile)
  - A MUI `Menu` anchored to the trigger, containing one `MenuItem` with a `Switch` +
    "My codes" label. Clicking toggles the value and closes the menu (matches the
    existing filter-menu select-and-close pattern in `FilterPanelDesktop`).
- Only rendered when `isAdmin` is true.

## Placement

- **Desktop:** the filter row (`FilterPanelDesktop`) is wrapped in a `position: relative`
  `Box`. `AdminMyCodesMenu` (`trigger="icon"`) is absolutely positioned top-right within
  that wrapper, so it sits at the same row as the filter buttons without disturbing
  `FilterPanelDesktop`'s existing centered `row-reverse` `Stack`.
- **Mobile:** `AdminMyCodesMenu` (`trigger="fab"`) renders as a second small `Fab`
  stacked above the existing filter `Fab`, in the same fixed bottom-right corner.

## Edge cases

- Toggle always resets to ON on mount/reload — no persistence (localStorage or
  otherwise).
- Non-admins: entirely unaffected; `myCodesOnly` is always `true` for them and the menu
  never renders.
- Sort / Likes / Time Period / Style filters keep applying normally on top of whichever
  `user_id` / `exclude_user_id` is active.
- No new backend authorization is needed for this read path — `/api/images/get` is
  already a public, unauthenticated endpoint with no per-field access control (per
  `api/CLAUDE.md`'s documented security posture), and this feature only changes which
  existing, already-public query shape the frontend sends.

## Testing

- Extend `src/__tests__` (Jest) to cover:
  - Query params produced for an admin with the toggle on vs. off.
  - Empty-state message suppressed when toggled off.
  - Toggle resetting to `true` on remount.
- No new backend tests needed — no backend changes.
