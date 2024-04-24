
"use client";
import { useEffect, createContext } from "react";
import { init, track } from "@amplitude/analytics-browser";

const AMPLITUDE_API_KEY = process.env.AMPLITUDE_API_KEY;

export const AmplitudeContext = createContext({});

const AmplitudeContextProvider = ({ children }) => {
  useEffect(() => {
    init(AMPLITUDE_API_KEY, undefined, {
      defaultTracking: {
        sessions: true,
      },
    });
  }, []);

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