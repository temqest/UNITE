"use client";
import { useEffect } from "react";

export default function ClientPerfFix() {
  useEffect(() => {
    try {
      if (typeof window === "undefined") return;
      const perf = window.performance as Performance & { __origMeasure?: any };
      if (!perf || typeof perf.measure !== "function") return;

      // Avoid double-patching
      if ((perf as any).__origMeasure) return;

      (perf as any).__origMeasure = perf.measure.bind(perf);

      perf.measure = function (...args: any[]) {
        try {
          return (perf as any).__origMeasure.apply(perf, args);
        } catch (err: any) {
          // Suppress known negative timestamp errors from React/Next dev instrumentation
          // Message may vary across browsers; check for 'negative' or 'cannot have a negative time'
          try {
            const msg = String(err && err.message ? err.message : err).toLowerCase();
            if (msg.includes("negative") || msg.includes("cannot have a negative") || msg.includes("negative time")) {
              // swallow
              return null;
            }
          } catch (e) {}
          // Re-throw if it's not the expected error
          throw err;
        }
      };
    } catch (e) {
      // ignore
    }
    return () => {
      try {
        if (typeof window === "undefined") return;
        const perf = window.performance as any;
        if (perf && perf.__origMeasure) {
          perf.measure = perf.__origMeasure;
          delete perf.__origMeasure;
        }
      } catch (e) {}
    };
  }, []);

  return null;
}
