import { useEffect, useRef, useState } from "react";
import { getGenerationProgress } from "./ImagesUtils";

const POLL_INTERVAL_MS = 1200;
const MAX_FAILED_ATTEMPTS = 3;
const MAX_TOTAL_MS = 120000;

// Shared by GenerateForm.js and IteratePanel.js: polls getGenerationProgress
// until the job succeeds or fails, retrying transient poll-request failures
// and giving up after ~2 minutes. `initialPercent` lets a caller seed the
// bar from a previously-known value (e.g. IteratePanel resuming a session
// that survived the image-detail modal being closed and reopened) instead
// of flashing back to 0% while the first poll is still in flight.
export function useGenerationPolling(jobId, { onSucceeded, onFailed, onProgress, initialPercent = 0 } = {}) {
  const [percent, setPercent] = useState(initialPercent);
  const timerRef = useRef(null);
  const callbacksRef = useRef({ onSucceeded, onFailed, onProgress });
  callbacksRef.current = { onSucceeded, onFailed, onProgress };

  useEffect(() => {
    if (!jobId) return undefined;

    const startedAt = Date.now();
    let failedAttempts = 0;

    const tick = () => {
      getGenerationProgress(jobId)
        .then((progress) => {
          failedAttempts = 0;
          const nextPercent = progress.percent ?? 0;
          setPercent(nextPercent);
          callbacksRef.current.onProgress?.(nextPercent);

          if (progress.status === "succeeded") {
            callbacksRef.current.onSucceeded(progress.result);
            return;
          }
          if (progress.status === "failed") {
            callbacksRef.current.onFailed(new Error(progress.error || "GenerationFailed"));
            return;
          }
          if (Date.now() - startedAt > MAX_TOTAL_MS) {
            callbacksRef.current.onFailed(new Error("GenerationFailed"));
            return;
          }
          timerRef.current = setTimeout(tick, POLL_INTERVAL_MS);
        })
        .catch((error) => {
          failedAttempts += 1;
          if (failedAttempts > MAX_FAILED_ATTEMPTS) {
            callbacksRef.current.onFailed(error);
            return;
          }
          timerRef.current = setTimeout(tick, POLL_INTERVAL_MS);
        });
    };
    tick();

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [jobId]);

  return percent;
}
