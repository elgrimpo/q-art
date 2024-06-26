
"use client";
import { useEffect, createContext } from "react";
import { init, track } from "@amplitude/analytics-browser";

const AMPLITUDE_API_KEY = process.env.NEXT_PUBLIC_AMPLITUDE_API_KEY;

export const AmplitudeContext = createContext({});

const AmplitudeContextProvider = ({ children }) => {
  useEffect(() => {
    console.log("amplitude init")
    init(AMPLITUDE_API_KEY, {
      defaultTracking: true,
    });  }, []);

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