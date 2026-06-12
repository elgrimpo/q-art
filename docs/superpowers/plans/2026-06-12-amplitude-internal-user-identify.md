# QRAI-78: Amplitude Internal User Identification — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tag authenticated Amplitude sessions with `setUserId` and an `is_internal` user property so internal usage (Christoph testing) can be filtered out of charts.

**Architecture:** Add a `useEffect` to `AmplitudeContextProvider` that reads the Zustand user state and calls `amplitude.setUserId` + `amplitude.identify` whenever the user changes. Guest users are skipped. A hardcoded `INTERNAL_EMAILS` constant drives the `is_internal` flag.

**Tech Stack:** `@amplitude/analytics-browser` v2, React `useEffect`, Zustand `useStore`, Jest + React Testing Library

---

## File Map

| File | Action |
|---|---|
| `src/_context/amplitudeContext.js` | Modify — add `INTERNAL_EMAILS`, `useStore`, identify `useEffect` |
| `src/__tests__/amplitudeContext.test.js` | Create — unit tests for the new identify logic |

---

### Task 1: Write failing tests for the identify behaviour

**Files:**
- Create: `src/__tests__/amplitudeContext.test.js`

- [ ] **Step 1: Create the test file**

```js
import React from 'react';
import { render } from '@testing-library/react';
import AmplitudeContextProvider from '../_context/amplitudeContext';
import { useStore } from '../store';
import * as amplitude from '@amplitude/analytics-browser';

jest.mock('@amplitude/analytics-browser', () => ({
  init: jest.fn(),
  track: jest.fn(),
  identify: jest.fn(),
  setUserId: jest.fn(),
  Identify: jest.fn().mockImplementation(() => ({ set: jest.fn() })),
}));

beforeEach(() => {
  jest.clearAllMocks();
  useStore.setState({ user: {} });
});

describe('AmplitudeContextProvider — identify', () => {
  it('calls setUserId and identify with is_internal=false for external email', () => {
    useStore.setState({ user: { _id: 'abc123', email: 'user@example.com' } });
    render(<AmplitudeContextProvider><div /></AmplitudeContextProvider>);

    expect(amplitude.setUserId).toHaveBeenCalledWith('abc123');
    const instance = amplitude.Identify.mock.results[0].value;
    expect(instance.set).toHaveBeenCalledWith('is_internal', false);
    expect(amplitude.identify).toHaveBeenCalledWith(instance);
  });

  it('sets is_internal=true for biedermann.chris@gmail.com', () => {
    useStore.setState({ user: { _id: 'me123', email: 'biedermann.chris@gmail.com' } });
    render(<AmplitudeContextProvider><div /></AmplitudeContextProvider>);

    const instance = amplitude.Identify.mock.results[0].value;
    expect(instance.set).toHaveBeenCalledWith('is_internal', true);
  });

  it('sets is_internal=true for christopherpeterman812@gmail.com', () => {
    useStore.setState({ user: { _id: 'me456', email: 'christopherpeterman812@gmail.com' } });
    render(<AmplitudeContextProvider><div /></AmplitudeContextProvider>);

    const instance = amplitude.Identify.mock.results[0].value;
    expect(instance.set).toHaveBeenCalledWith('is_internal', true);
  });

  it('skips identify for guest users', () => {
    useStore.setState({ user: { _id: 'guest_123', is_guest: true } });
    render(<AmplitudeContextProvider><div /></AmplitudeContextProvider>);

    expect(amplitude.setUserId).not.toHaveBeenCalled();
    expect(amplitude.identify).not.toHaveBeenCalled();
  });

  it('skips identify when user has no email', () => {
    useStore.setState({ user: {} });
    render(<AmplitudeContextProvider><div /></AmplitudeContextProvider>);

    expect(amplitude.setUserId).not.toHaveBeenCalled();
    expect(amplitude.identify).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run the tests to confirm they fail**

```bash
npm run test:frontend -- --testPathPattern=amplitudeContext --verbose
```

Expected: 5 failures — `setUserId`, `identify`, `Identify` are not called yet (they're not imported or used in the current implementation).

---

### Task 2: Implement the identify logic

**Files:**
- Modify: `src/_context/amplitudeContext.js`

- [ ] **Step 3: Replace the file contents**

```js
"use client";
import { useEffect, createContext } from "react";
import { init, track, identify, setUserId, Identify } from "@amplitude/analytics-browser";
import { useStore } from "../store";

const AMPLITUDE_API_KEY = process.env.NEXT_PUBLIC_AMPLITUDE_API_KEY;

const INTERNAL_EMAILS = [
  "biedermann.chris@gmail.com",
  "christopherpeterman812@gmail.com",
];

export const AmplitudeContext = createContext({});

const AmplitudeContextProvider = ({ children }) => {
  const user = useStore((state) => state.user);

  useEffect(() => {
    init(AMPLITUDE_API_KEY, {
      defaultTracking: true,
    });
  }, []);

  useEffect(() => {
    if (!user?.email || user?.is_guest) return;

    setUserId(user._id);

    const identifyEvent = new Identify();
    identifyEvent.set("is_internal", INTERNAL_EMAILS.includes(user.email));
    identify(identifyEvent);
  }, [user]);

  const trackAmplitudeEvent = (eventName, eventProperties) => {
    track(eventName, eventProperties);
  };

  const value = { trackAmplitudeEvent };

  return (
    <AmplitudeContext.Provider value={value}>
      {children}
    </AmplitudeContext.Provider>
  );
};

export default AmplitudeContextProvider;
```

- [ ] **Step 4: Run the tests to confirm they pass**

```bash
npm run test:frontend -- --testPathPattern=amplitudeContext --verbose
```

Expected: 5 tests pass.

- [ ] **Step 5: Run the full frontend test suite to catch regressions**

```bash
npm run test:frontend
```

Expected: all tests pass. Note: existing test files mock `@amplitude/analytics-browser` as `{ track: jest.fn() }` — those mocks are per-file and unaffected by the new imports.

- [ ] **Step 6: Commit**

```bash
git add src/_context/amplitudeContext.js src/__tests__/amplitudeContext.test.js
git commit -m "feat(analytics): add setUserId and is_internal identify call (QRAI-78)"
```

---

## Manual Verification (post-deploy)

After deploying, sign in with a non-internal account and confirm the `is_internal` property appears in Amplitude's user taxonomy as `false`. Sign in with an internal email and confirm `true`. Then update any saved Amplitude charts/dashboards to add the filter `is_internal ≠ true`.
