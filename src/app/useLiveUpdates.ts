import { useEffect } from "react";
import { App as CapApp } from "@capacitor/app";
import { canCheckUpdates, checkForUpdates } from "./updates";

/** Checks for a new web bundle on launch and whenever the app comes back. */
export function useLiveUpdates(): void {
  useEffect(() => {
    if (!canCheckUpdates) return;

    const run = () => {
      void checkForUpdates().catch(() => {
        /* offline or no manifest yet; the next foreground retries */
      });
    };

    run();
    const handle = CapApp.addListener("appStateChange", ({ isActive }) => {
      if (isActive) run();
    });

    return () => {
      handle.then((listener) => listener.remove());
    };
  }, []);
}
