import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { Capacitor } from "@capacitor/core";
import { CapacitorUpdater } from "@capgo/capacitor-updater";
import { LanguageProvider } from "./lib/i18n";
import "./styles.css";

// Must happen before any network request: the native updater rolls back to the
// previous bundle if a freshly installed one does not confirm that it booted.
try {
  if (Capacitor.isNativePlatform()) await CapacitorUpdater.notifyAppReady();
} catch {
  /* web build, or notifications are unavailable */
}

// Imported last: App pulls in the Firebase SDK, which opens network requests.
const { App } = await import("./App");

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <LanguageProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </LanguageProvider>
  </StrictMode>,
);
