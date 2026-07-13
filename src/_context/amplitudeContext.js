"use client";
import { useEffect, createContext } from "react";
import { init, track, identify, setUserId, Identify } from "@amplitude/analytics-browser";
import { useStore } from "../store";
import { captureLandingVariant } from "../_utils/attribution";

const AMPLITUDE_API_KEY = process.env.NEXT_PUBLIC_AMPLITUDE_API_KEY;

const INTERNAL_EMAILS = [
  "biedermann.chris@gmail.com",
  "christopherpeterman812@gmail.com",
];

// Once a browser is known to be internal we remember it here, so we keep
// tagging it even in later anonymous/guest sessions (no re-sign-in needed).
const INTERNAL_FLAG_KEY = "qart_is_internal";

const markInternal = () => {
  const identifyEvent = new Identify();
  identifyEvent.set("is_internal", true);
  identify(identifyEvent);
};

export const AmplitudeContext = createContext({});

const AmplitudeContextProvider = ({ children }) => {
  const user = useStore((state) => state.user);

  useEffect(() => {
    init(AMPLITUDE_API_KEY, {
      defaultTracking: true,
    });
    captureLandingVariant();

    // Browser-level internal tagging, independent of auth. Visit any page with
    // ?internal=1 once to opt this browser in (?internal=0 to opt out); after
    // that the flag persists and re-applies on every load, guest or not.
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get("internal") === "1") {
        localStorage.setItem(INTERNAL_FLAG_KEY, "true");
      } else if (params.get("internal") === "0") {
        localStorage.removeItem(INTERNAL_FLAG_KEY);
      }
      if (localStorage.getItem(INTERNAL_FLAG_KEY) === "true") {
        markInternal();
      }
    } catch {
      // localStorage unavailable (private mode, SSR edge) — skip silently.
    }
  }, []);

  useEffect(() => {
    if (!user?.email || user?.is_guest) return;

    setUserId(user._id);

    const isInternal = INTERNAL_EMAILS.includes(user.email);

    const identifyEvent = new Identify();
    identifyEvent.set("is_internal", isInternal);
    identify(identifyEvent);

    // Remember an internal sign-in so this browser stays tagged next time,
    // even if the later session is an anonymous guest one.
    if (isInternal) {
      try {
        localStorage.setItem(INTERNAL_FLAG_KEY, "true");
      } catch {
        // ignore
      }
    }
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
