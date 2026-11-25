import { Capacitor } from "@capacitor/core";
import { CapacitorUpdater } from "@capgo/capacitor-updater";

/**
 * Over-the-air web bundles for the installed Android APK.
 *
 * `scripts/publish-update.mjs` uploads `latest.json` plus a zipped `dist/` to
 * Firebase Hosting. The app downloads a newer bundle and the plugin swaps it in
 * on the next launch; verify with Settings → App updates.
 */

const configuredBase = (import.meta.env.VITE_UPDATE_BASE_URL ?? "")
  .trim()
  .replace(/\/+$/, "");
const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID ?? "";

/** Defaults to the project's Firebase Hosting site. */
export const updateBaseUrl =
  configuredBase || (projectId ? `https://${projectId}.web.app` : "");

export const canCheckUpdates =
  Capacitor.isNativePlatform() && Boolean(updateBaseUrl);

export type UpdateOutcome = "none" | "ready";

interface UpdateManifest {
  version: string;
  url: string;
  checksum: string;
}

function isManifest(value: unknown): value is UpdateManifest {
  if (typeof value !== "object" || value === null) return false;
  const data = value as Partial<UpdateManifest>;
  return (
    typeof data.version === "string" &&
    typeof data.url === "string" &&
    typeof data.checksum === "string" &&
    data.version.length > 0 &&
    data.url.length > 0 &&
    data.checksum.length > 0
  );
}

export async function checkForUpdates(): Promise<UpdateOutcome> {
  if (!canCheckUpdates) throw new Error("Updates are only available in the native app.");

  const response = await fetch(`${updateBaseUrl}/latest.json?t=${Date.now()}`, {
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`Update server responded ${response.status}`);
  }

  const manifest: unknown = await response.json();
  if (!isManifest(manifest)) throw new Error("Invalid update manifest.");

  const { bundle } = await CapacitorUpdater.current();
  if (bundle.version === manifest.version) return "none";

  const downloaded = await CapacitorUpdater.download({
    url: manifest.url,
    version: manifest.version,
    checksum: manifest.checksum,
  });
  // Installs on the next launch instead of interrupting the current session.
  await CapacitorUpdater.next({ id: downloaded.id });
  return "ready";
}
