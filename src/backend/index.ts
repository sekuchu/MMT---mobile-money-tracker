import { createDemoBackend } from "./demo";
import type { FirebaseConfig } from "./firebase";
import type { Backend } from "./types";

export * from "./types";

const env = import.meta.env;

const config: FirebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY ?? "",
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN ?? "",
  projectId: env.VITE_FIREBASE_PROJECT_ID ?? "",
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET ?? "",
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? "",
  appId: env.VITE_FIREBASE_APP_ID ?? "",
};

export const hasFirebaseConfig = Boolean(
  config.apiKey && config.projectId && config.appId && config.authDomain,
);

// Firebase is loaded only when a project is configured, so the live app pulls
// the SDK it needs and the local demo build stays small.
async function createBackend(): Promise<Backend> {
  if (!hasFirebaseConfig) return createDemoBackend();
  const { createFirebaseBackend } = await import("./firebase");
  return createFirebaseBackend(config);
}

export const backend: Backend = await createBackend();
