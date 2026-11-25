import { t, type TranslationKey } from "./strings";

const CODE_KEYS: Record<string, TranslationKey> = {
  "auth/invalid-credential": "err.badCredentials",
  "auth/wrong-password": "err.badCredentials",
  "auth/user-not-found": "err.badCredentials",
  "auth/invalid-email": "err.invalidEmail",
  "auth/email-already-in-use": "err.emailInUse",
  "auth/weak-password": "err.weakPassword",
  "auth/too-many-requests": "err.tooMany",
  "auth/network-request-failed": "err.network",
  "permission-denied": "err.permission",
  unavailable: "err.unreachable",
  "failed-precondition": "err.conflict",
};

/** Turns Firebase / Firestore errors into something a person can act on. */
export function friendlyError(error: unknown): string {
  const raw =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : t("err.fallback");
  const code =
    typeof error === "object" && error !== null && "code" in error
      ? String((error as { code?: unknown }).code ?? "")
      : "";

  if (code && CODE_KEYS[code]) return t(CODE_KEYS[code]);
  if (raw.startsWith("Firebase:")) return t("err.generic");
  if (raw.includes("Missing or insufficient permissions")) {
    return t("err.permission");
  }
  return raw;
}
