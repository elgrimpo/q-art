# Admin View of Other Users' Codes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an admin-only 3-dot menu to `/mycodes` with a "My codes" toggle (default ON) that, when turned off, switches the image query to show other users' generated codes instead of the admin's own.

**Architecture:** Pure frontend change. `GET /api/images/get` already accepts independent `user_id`/`exclude_user_id` query params with no other constraints, so no backend work is needed. A new boolean `myCodesOnly` state in `mycodes/page.js` drives which of those two params is sent. A new shared `AdminMyCodesMenu` component (icon trigger on desktop, small FAB on mobile) renders the toggle UI and is only shown when `user.is_admin` is true. Dead `pathname === "/mycodes"` branches (left over from a since-removed `/explore` → `/mycodes` rewrite) are removed from `mycodes/page.js` as part of this work, since they're the exact lines being touched to add the toggle.

**Tech Stack:** Next.js 14 (App Router), React 18, MUI v5, Zustand, Jest + React Testing Library.

## Global Constraints

- No backend changes — `/api/images/get` already supports the required query shape.
- The admin toggle always resets to ON (`myCodesOnly = true`) on mount/reload — no persistence.
- Non-admin users must see zero behavior change; `isAdmin` gates everything.
- `AdminMyCodesMenu` is a single shared component (not split into Desktop/Mobile files like the filter panels) — it's one boolean toggle, too small to justify a duplicated file pair.
- Follow existing MUI patterns already in this codebase: `Menu`/`MenuItem` dropdown pattern from `FilterPanelDesktop.js`, `IconButton` + `MoreVertIcon` pattern from `ImagesCard.js`.

---

### Task 1: Characterization tests for current `mycodes/page.js` behavior

Before touching any production code, lock down the current (pre-cleanup) behavior of `mycodes/page.js` with tests, so Task 2's dead-code removal can be verified as a true no-op for real users.

**Files:**
- Create: `src/__tests__/MyCodesPage.test.js`

**Interfaces:**
- Consumes: `src/app/(main_pages)/mycodes/page.js` (default export `MyCodes`), `getImages` from `@/_utils/ImagesUtils`.
- Produces: a reusable mock scaffold (`mockUser`, `mockPush`, mocked `getImages`) that Task 4 extends with more tests in the same file.

- [ ] **Step 1: Write the characterization tests**

```jsx
// src/__tests__/MyCodesPage.test.js
import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'

const mockPush = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => '/mycodes',
}))

jest.mock('react-intersection-observer', () => ({
  useInView: () => ({ ref: jest.fn(), inView: true }),
}))

const mockUser = {
  _id: 'user1',
  email: 'user@example.com',
  is_guest: false,
  is_admin: false,
}

jest.mock('@/store', () => ({
  useStore: (selector) => {
    const state = { user: mockUser, openAlert: jest.fn() }
    return typeof selector === 'function' ? selector(state) : state
  },
}))

jest.mock('@/_utils/ImagesUtils', () => ({
  getImages: jest.fn(),
  bookmarkImage: jest.fn(),
  deleteImage: jest.fn(),
}))

jest.mock('@amplitude/analytics-browser', () => ({ track: jest.fn() }))
jest.mock('@/_components/actions/LikeButton.js', () => ({
  __esModule: true,
  default: () => <div data-testid="like-button" />,
}))
jest.mock('../app/(main_pages)/mycodes/SkeletonCard.js', () => ({
  __esModule: true,
  default: () => <div data-testid="skeleton-card" />,
}))
jest.mock('../app/(main_pages)/mycodes/ImageModal.js', () => ({
  __esModule: true,
  default: () => null,
}))

const { getImages } = require('@/_utils/ImagesUtils')
import MyCodes from '../app/(main_pages)/mycodes/page'

beforeEach(() => {
  jest.clearAllMocks()
  mockUser._id = 'user1'
  mockUser.email = 'user@example.com'
  mockUser.is_guest = false
  mockUser.is_admin = false
})

test('requests images scoped to the logged-in user by default', async () => {
  getImages.mockResolvedValue([])
  render(<MyCodes />)

  await waitFor(() => expect(getImages).toHaveBeenCalled())

  expect(getImages).toHaveBeenCalledWith(
    expect.objectContaining({
      page: 1,
      user_id: 'user1',
      exclude_user_id: undefined,
      sort_by: 'Newest',
    })
  )
})

test('shows the empty-state message when the user has no images', async () => {
  getImages.mockResolvedValue([])
  render(<MyCodes />)

  expect(
    await screen.findByText(/you don't have any images yet/i)
  ).toBeInTheDocument()
})

test('redirects guests to /generate', async () => {
  mockUser.is_guest = true
  mockUser.email = undefined
  getImages.mockResolvedValue([])
  render(<MyCodes />)

  await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/generate'))
})

test('does not redirect a logged-in non-guest user', async () => {
  getImages.mockResolvedValue([])
  render(<MyCodes />)
  await waitFor(() => expect(getImages).toHaveBeenCalled())
  expect(mockPush).not.toHaveBeenCalled()
})
```

- [ ] **Step 2: Run the tests to confirm they pass against current code**

Run: `npm run test:frontend -- src/__tests__/MyCodesPage.test.js`
Expected: PASS (4 tests) — these characterize *existing* behavior, so they should pass immediately, not fail. If any fails, the mock scaffold doesn't match the current component and must be fixed before proceeding (do not change `page.js` yet).

- [ ] **Step 3: Commit**

```bash
git add src/__tests__/MyCodesPage.test.js
git commit -m "test: characterize current mycodes page behavior before cleanup"
```

---

### Task 2: Remove dead `pathname` branches from `mycodes/page.js`

`/explore` used to be served by rewriting to `/mycodes` (per stale docs); it's now its own standalone page (`src/app/(main_pages)/explore/page.js`), and `next.config.mjs` has no such rewrite. `mycodes/page.js` is therefore only ever mounted at the literal route `/mycodes`, making every `pathname === "/mycodes"` check always `true` and its `else` branch dead. This task removes that dead code with no behavior change, verified by Task 1's tests.

**Files:**
- Modify: `src/app/(main_pages)/mycodes/page.js`

**Interfaces:**
- Consumes: nothing new.
- Produces: a simplified `page.js` with no `pathname`/`usePathname` references, ready for Task 4 to add `isAdmin`/`myCodesOnly` into the same call sites.

- [ ] **Step 1: Remove the `usePathname` import**

In `src/app/(main_pages)/mycodes/page.js`, delete this line:

```js
import { usePathname } from "next/navigation";
```

- [ ] **Step 2: Remove the `pathname` variable and the now-fully-dead reset effect**

Replace:

```js
  const router = useRouter();

  const pathname = usePathname();

  // User — reactive read so the page re-renders once StoreInitializer seeds the
  // store on the client (getState() returns the empty server snapshot and never updates).
  const user = useStore((state) => state.user);
```

with:

```js
  const router = useRouter();

  // User — reactive read so the page re-renders once StoreInitializer seeds the
  // store on the client (getState() returns the empty server snapshot and never updates).
  const user = useStore((state) => state.user);
```

Then replace:

```js
  /* -------------------------------- FUNCTIONS ------------------------------- */
  useEffect(() => {
    setPage(0);
    setImages([]);
  }, [pathname]);

  // Redirect guests / signed-out users away from their personal gallery. Runs after
```

with:

```js
  /* -------------------------------- FUNCTIONS ------------------------------- */

  // Redirect guests / signed-out users away from their personal gallery. Runs after
```

(This effect only ever reset `page`/`images` to their own initial values, and only did so on `pathname` change — which never happens while this component is mounted. It's provably a no-op now, not just simplified.)

- [ ] **Step 3: Simplify the default `sort` value**

Replace:

```js
    sort: pathname === "/mycodes" ? "Newest" : "Most Liked",
```

with:

```js
    sort: "Newest",
```

- [ ] **Step 4: Simplify the guest/signed-out redirect effect**

Replace:

```js
  useEffect(() => {
    const userResolved = user && Object.keys(user).length > 0;
    const isGuestOrSignedOut = !user?.email || user?.is_guest;
    if (userResolved && isGuestOrSignedOut && pathname === "/mycodes") {
      router.push("/generate");
    }
  }, [user, pathname, router]);
```

with:

```js
  useEffect(() => {
    const userResolved = user && Object.keys(user).length > 0;
    const isGuestOrSignedOut = !user?.email || user?.is_guest;
    if (userResolved && isGuestOrSignedOut) {
      router.push("/generate");
    }
  }, [user, router]);
```

- [ ] **Step 5: Simplify `applyFilters` and the infinite-scroll effect**

Replace:

```js
  // Apply Filter & Sort and load Images
  const applyFilters = (newFilters) => {
    const filtersToUse = newFilters || selectedFilters;
    setImages([]);
    setPage(0);
    loadMoreImages(
      {
        page: 1,
        user_id: pathname === "/mycodes" ? user._id : undefined,
        exclude_user_id: pathname === "/mycodes" ? undefined : user._id,
        likes: filtersToUse.likes,
        time_period: filtersToUse.time_period,
        image_style: filtersToUse.image_style,
        sort_by: filtersToUse.sort,
      },
      true
    );
  };

  // Infinite scrolling and load Image
  useEffect(() => {
    if (inView) {
      const params = {
        page: page + 1,
        user_id: pathname === "/mycodes" ? user._id : undefined,
        exclude_user_id: pathname === "/mycodes" ? undefined : user._id,
        likes: selectedFilters.likes,
        time_period: selectedFilters.time_period,
        image_style: selectedFilters.image_style,
        sort_by: selectedFilters.sort,
      };
      loadMoreImages(params);
    }
  }, [inView]);
```

with:

```js
  // Apply Filter & Sort and load Images
  const applyFilters = (newFilters) => {
    const filtersToUse = newFilters || selectedFilters;
    setImages([]);
    setPage(0);
    loadMoreImages(
      {
        page: 1,
        user_id: user._id,
        exclude_user_id: undefined,
        likes: filtersToUse.likes,
        time_period: filtersToUse.time_period,
        image_style: filtersToUse.image_style,
        sort_by: filtersToUse.sort,
      },
      true
    );
  };

  // Infinite scrolling and load Image
  useEffect(() => {
    if (inView) {
      const params = {
        page: page + 1,
        user_id: user._id,
        exclude_user_id: undefined,
        likes: selectedFilters.likes,
        time_period: selectedFilters.time_period,
        image_style: selectedFilters.image_style,
        sort_by: selectedFilters.sort,
      };
      loadMoreImages(params);
    }
  }, [inView]);
```

- [ ] **Step 6: Simplify the empty-state condition**

Replace:

```js
  return images.length === 0 && page === -1 && pathname === "/mycodes" ? (
```

with:

```js
  return images.length === 0 && page === -1 ? (
```

- [ ] **Step 7: Remove the dead `pathname` prop passed to `ImageModal`**

Find the `<ImageModal>` usage (inside the `IMAGE DETAILS MODAL` section) and delete the line:

```js
          pathname={pathname}
```

`ImageModal`'s prop destructuring (`src/app/(main_pages)/mycodes/ImageModal.js`) never includes `pathname` — it was already unused there.

- [ ] **Step 8: Run the Task 1 tests to confirm no regression**

Run: `npm run test:frontend -- src/__tests__/MyCodesPage.test.js`
Expected: PASS (same 4 tests, unchanged) — confirms the cleanup didn't change observable behavior.

- [ ] **Step 9: Commit**

```bash
git add src/app/\(main_pages\)/mycodes/page.js
git commit -m "refactor: remove dead pathname branches from mycodes page

/explore is now its own standalone page (no /mycodes rewrite), so
mycodes/page.js only ever mounts at /mycodes and every
pathname === \"/mycodes\" check was always true."
```

---

### Task 3: `AdminMyCodesMenu` component

Build the shared admin toggle component in isolation, fully covered by its own tests, before wiring it into the page.

**Files:**
- Create: `src/app/(main_pages)/mycodes/AdminMyCodesMenu.js`
- Test: `src/__tests__/AdminMyCodesMenu.test.js`

**Interfaces:**
- Produces: `AdminMyCodesMenu({ myCodesOnly: boolean, onToggle: (newValue: boolean) => void, trigger: "icon" | "fab" })` — default export. Task 4 imports and renders this with `trigger="icon"` on desktop and `trigger="fab"` on mobile.

- [ ] **Step 1: Write the failing tests**

```jsx
// src/__tests__/AdminMyCodesMenu.test.js
import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import AdminMyCodesMenu from '../app/(main_pages)/mycodes/AdminMyCodesMenu'

test('renders an icon trigger labeled "Admin menu"', () => {
  render(<AdminMyCodesMenu trigger="icon" myCodesOnly={true} onToggle={jest.fn()} />)
  expect(screen.getByLabelText('Admin menu')).toBeInTheDocument()
})

test('renders a fab trigger labeled "Admin menu"', () => {
  render(<AdminMyCodesMenu trigger="fab" myCodesOnly={true} onToggle={jest.fn()} />)
  expect(screen.getByLabelText('Admin menu')).toBeInTheDocument()
})

test('shows the "My codes" switch checked when myCodesOnly is true', async () => {
  render(<AdminMyCodesMenu trigger="icon" myCodesOnly={true} onToggle={jest.fn()} />)
  fireEvent.click(screen.getByLabelText('Admin menu'))
  expect(await screen.findByRole('switch', { name: /my codes/i })).toBeChecked()
})

test('shows the "My codes" switch unchecked when myCodesOnly is false', async () => {
  render(<AdminMyCodesMenu trigger="icon" myCodesOnly={false} onToggle={jest.fn()} />)
  fireEvent.click(screen.getByLabelText('Admin menu'))
  expect(await screen.findByRole('switch', { name: /my codes/i })).not.toBeChecked()
})

test('toggling the switch calls onToggle with the flipped value and closes the menu', async () => {
  const onToggle = jest.fn()
  render(<AdminMyCodesMenu trigger="icon" myCodesOnly={true} onToggle={onToggle} />)
  fireEvent.click(screen.getByLabelText('Admin menu'))

  const toggle = await screen.findByRole('switch', { name: /my codes/i })
  fireEvent.click(toggle)

  expect(onToggle).toHaveBeenCalledWith(false)
  await waitFor(() =>
    expect(screen.queryByRole('switch', { name: /my codes/i })).not.toBeInTheDocument()
  )
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test:frontend -- src/__tests__/AdminMyCodesMenu.test.js`
Expected: FAIL — `Cannot find module '../app/(main_pages)/mycodes/AdminMyCodesMenu'`

- [ ] **Step 3: Write the implementation**

```jsx
// src/app/(main_pages)/mycodes/AdminMyCodesMenu.js
"use client";
import { useState } from "react";
import {
  IconButton,
  Fab,
  Menu,
  MenuItem,
  Switch,
  FormControlLabel,
} from "@mui/material";
import MoreVertIcon from "@mui/icons-material/MoreVert";

function AdminMyCodesMenu({ myCodesOnly, onToggle, trigger }) {
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);

  const handleOpen = (event) => setAnchorEl(event.currentTarget);
  const handleClose = () => setAnchorEl(null);

  const handleToggle = () => {
    onToggle(!myCodesOnly);
    handleClose();
  };

  return (
    <>
      {trigger === "fab" ? (
        <Fab
          size="small"
          color="primary"
          onClick={handleOpen}
          aria-label="Admin menu"
          sx={{
            position: "fixed",
            bottom: "92px",
            right: "16px",
            zIndex: "100",
          }}
        >
          <MoreVertIcon />
        </Fab>
      ) : (
        <IconButton
          size="large"
          color="primary"
          onClick={handleOpen}
          aria-label="Admin menu"
          sx={{ border: 1, borderColor: "divider" }}
        >
          <MoreVertIcon />
        </IconButton>
      )}

      <Menu anchorEl={anchorEl} open={open} onClose={handleClose}>
        <MenuItem disableRipple>
          <FormControlLabel
            control={<Switch checked={myCodesOnly} onChange={handleToggle} />}
            label="My codes"
          />
        </MenuItem>
      </Menu>
    </>
  );
}

export default AdminMyCodesMenu;
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test:frontend -- src/__tests__/AdminMyCodesMenu.test.js`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add src/app/\(main_pages\)/mycodes/AdminMyCodesMenu.js src/__tests__/AdminMyCodesMenu.test.js
git commit -m "feat: add AdminMyCodesMenu component"
```

---

### Task 4: Wire the admin toggle into `mycodes/page.js`

Add `isAdmin`/`myCodesOnly` state, thread it through the existing query-building code, gate the empty-state message on it, and render `AdminMyCodesMenu` in the right spot for desktop and mobile.

**Files:**
- Modify: `src/app/(main_pages)/mycodes/page.js`
- Modify: `src/__tests__/MyCodesPage.test.js` (append tests)

**Interfaces:**
- Consumes: `AdminMyCodesMenu` from Task 3 (`{ myCodesOnly, onToggle, trigger }`).
- Produces: `mycodes/page.js` now derives `isAdmin` from `user.is_admin` and gates all admin-only rendering on it.

- [ ] **Step 1: Write the failing tests (append to `src/__tests__/MyCodesPage.test.js`)**

Add `fireEvent` to the existing `@testing-library/react` import:

```js
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
```

Append these tests at the end of the file:

```jsx
test('does not render the admin menu for a non-admin user', async () => {
  getImages.mockResolvedValue([])
  render(<MyCodes />)
  await waitFor(() => expect(getImages).toHaveBeenCalled())
  expect(screen.queryByLabelText('Admin menu')).not.toBeInTheDocument()
})

test('admin: defaults to "My codes" on, and toggling switches to other users\' codes', async () => {
  mockUser.is_admin = true
  getImages.mockResolvedValue([])
  render(<MyCodes />)

  await waitFor(() =>
    expect(getImages).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: 'user1', exclude_user_id: undefined })
    )
  )
  expect(
    await screen.findByText(/you don't have any images yet/i)
  ).toBeInTheDocument()

  fireEvent.click(screen.getByLabelText('Admin menu'))
  const toggle = await screen.findByRole('switch', { name: /my codes/i })
  expect(toggle).toBeChecked()
  fireEvent.click(toggle)

  await waitFor(() =>
    expect(getImages).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: undefined, exclude_user_id: 'user1' })
    )
  )
  await waitFor(() =>
    expect(
      screen.queryByText(/you don't have any images yet/i)
    ).not.toBeInTheDocument()
  )
})
```

- [ ] **Step 2: Run tests to verify the new ones fail**

Run: `npm run test:frontend -- src/__tests__/MyCodesPage.test.js`
Expected: The 4 existing tests PASS; the 2 new tests FAIL (no admin menu exists yet).

- [ ] **Step 3: Add `isAdmin` and `myCodesOnly` state**

Replace:

```js
  const router = useRouter();

  // User — reactive read so the page re-renders once StoreInitializer seeds the
  // store on the client (getState() returns the empty server snapshot and never updates).
  const user = useStore((state) => state.user);
  // Screen size
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const [images, setImages] = useState([]);
  const [page, setPage] = useState(0);
```

with:

```js
  const router = useRouter();

  // User — reactive read so the page re-renders once StoreInitializer seeds the
  // store on the client (getState() returns the empty server snapshot and never updates).
  const user = useStore((state) => state.user);
  const isAdmin = !!user?.is_admin;
  // Screen size
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const [images, setImages] = useState([]);
  const [page, setPage] = useState(0);
  // Admin-only: defaults to showing only the admin's own codes; never persisted.
  const [myCodesOnly, setMyCodesOnly] = useState(true);
```

- [ ] **Step 4: Thread `myCodesOnly` through `applyFilters` and the infinite-scroll effect**

Replace:

```js
  // Apply Filter & Sort and load Images
  const applyFilters = (newFilters) => {
    const filtersToUse = newFilters || selectedFilters;
    setImages([]);
    setPage(0);
    loadMoreImages(
      {
        page: 1,
        user_id: user._id,
        exclude_user_id: undefined,
        likes: filtersToUse.likes,
        time_period: filtersToUse.time_period,
        image_style: filtersToUse.image_style,
        sort_by: filtersToUse.sort,
      },
      true
    );
  };

  // Infinite scrolling and load Image
  useEffect(() => {
    if (inView) {
      const params = {
        page: page + 1,
        user_id: user._id,
        exclude_user_id: undefined,
        likes: selectedFilters.likes,
        time_period: selectedFilters.time_period,
        image_style: selectedFilters.image_style,
        sort_by: selectedFilters.sort,
      };
      loadMoreImages(params);
    }
  }, [inView]);
```

with:

```js
  // Apply Filter & Sort and load Images
  const applyFilters = (newFilters, myCodesOnlyOverride) => {
    const filtersToUse = newFilters || selectedFilters;
    const myCodesOnlyToUse =
      myCodesOnlyOverride !== undefined ? myCodesOnlyOverride : myCodesOnly;
    setImages([]);
    setPage(0);
    loadMoreImages(
      {
        page: 1,
        user_id: myCodesOnlyToUse ? user._id : undefined,
        exclude_user_id: myCodesOnlyToUse ? undefined : user._id,
        likes: filtersToUse.likes,
        time_period: filtersToUse.time_period,
        image_style: filtersToUse.image_style,
        sort_by: filtersToUse.sort,
      },
      true
    );
  };

  // Admin: flip between "my codes" and "everyone else's codes"
  const handleToggleMyCodesOnly = (newValue) => {
    setMyCodesOnly(newValue);
    applyFilters(selectedFilters, newValue);
  };

  // Infinite scrolling and load Image
  useEffect(() => {
    if (inView) {
      const params = {
        page: page + 1,
        user_id: myCodesOnly ? user._id : undefined,
        exclude_user_id: myCodesOnly ? undefined : user._id,
        likes: selectedFilters.likes,
        time_period: selectedFilters.time_period,
        image_style: selectedFilters.image_style,
        sort_by: selectedFilters.sort,
      };
      loadMoreImages(params);
    }
  }, [inView]);
```

- [ ] **Step 5: Gate the empty-state message on `myCodesOnly`**

Replace:

```js
  return images.length === 0 && page === -1 ? (
```

with:

```js
  return images.length === 0 && page === -1 && myCodesOnly ? (
```

- [ ] **Step 6: Import `AdminMyCodesMenu`**

Add alongside the other App imports:

```js
import AdminMyCodesMenu from "./AdminMyCodesMenu";
```

- [ ] **Step 7: Render `AdminMyCodesMenu` next to the filter panel**

Replace:

```js
      {/* ----------------------------- FILTERS ----------------------------- */}
      {isMobile ? (
        <FilterPanelMobile
          filters={filters}
          applyFilters={applyFilters}
          selectedFilters={selectedFilters}
          setSelectedFilters={setSelectedFilters}
        />
      ) : (
        <FilterPanelDesktop
          filters={filters}
          applyFilters={applyFilters}
          selectedFilters={selectedFilters}
          setSelectedFilters={setSelectedFilters}
        />
      )}
```

with:

```js
      {/* ----------------------------- FILTERS ----------------------------- */}
      <Box sx={{ position: "relative" }}>
        {isMobile ? (
          <FilterPanelMobile
            filters={filters}
            applyFilters={applyFilters}
            selectedFilters={selectedFilters}
            setSelectedFilters={setSelectedFilters}
          />
        ) : (
          <FilterPanelDesktop
            filters={filters}
            applyFilters={applyFilters}
            selectedFilters={selectedFilters}
            setSelectedFilters={setSelectedFilters}
          />
        )}

        {isAdmin && !isMobile && (
          <Box
            sx={{
              position: "absolute",
              top: "50%",
              right: { xs: "0.5rem", sm: "1rem" },
              transform: "translateY(-50%)",
            }}
          >
            <AdminMyCodesMenu
              trigger="icon"
              myCodesOnly={myCodesOnly}
              onToggle={handleToggleMyCodesOnly}
            />
          </Box>
        )}

        {isAdmin && isMobile && (
          <AdminMyCodesMenu
            trigger="fab"
            myCodesOnly={myCodesOnly}
            onToggle={handleToggleMyCodesOnly}
          />
        )}
      </Box>
```

- [ ] **Step 8: Run tests to verify they pass**

Run: `npm run test:frontend -- src/__tests__/MyCodesPage.test.js`
Expected: PASS (6 tests)

- [ ] **Step 9: Run the full frontend suite to check for regressions elsewhere**

Run: `npm run test:frontend`
Expected: PASS (no regressions in other suites)

- [ ] **Step 10: Commit**

```bash
git add src/app/\(main_pages\)/mycodes/page.js src/__tests__/MyCodesPage.test.js
git commit -m "feat: let admins toggle between their own and other users' codes on /mycodes"
```

---

### Task 5: Manual browser verification

Jest/jsdom doesn't lay out real CSS, so the "top-right, same row as filters" (desktop) and "stacked FAB" (mobile) placement needs an eyeball check in an actual browser.

**Files:** none (verification only)

- [ ] **Step 1: Start the dev server**

Use the preview tool to start the app (`npm run dev`, ports 3000/8000).

- [ ] **Step 2: Verify a non-admin/guest sees no admin menu**

Open `/mycodes` as a guest (or any account not in `ADMIN_EMAILS`). Confirm there is no 3-dot/`MoreVert` control anywhere on the page, on both desktop and mobile viewport widths.

- [ ] **Step 3: Verify desktop placement and toggle behavior as an admin**

Sign in with an account listed in the local `.env`'s `ADMIN_EMAILS` (this step requires completing real sign-in — Google or email-code — interactively). Navigate to `/mycodes` at desktop width. Confirm:
- A 3-dot icon button appears at the top-right of the filter row, vertically aligned with the Sort/Likes/Time Period/Style buttons.
- Clicking it opens a menu with a "My codes" switch, checked by default.
- Toggling it off refetches the grid to show other users' images (or an empty grid, with no "you don't have any images yet" message) and the switch stays unchecked until toggled back on.

- [ ] **Step 4: Verify mobile placement**

Resize the preview to the mobile preset. Confirm a second, smaller FAB appears stacked above the existing filter FAB in the bottom-right corner, and tapping it opens the same menu/switch.

- [ ] **Step 5: Capture proof**

Take screenshots (desktop top-right placement, mobile stacked FABs, and the open menu) and share them.
