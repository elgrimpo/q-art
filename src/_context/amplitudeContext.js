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
