const INVITE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/** Human-readable invite code without ambiguous characters (0/O, 1/I). */
export function randomInviteCode(length = 6): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(
    bytes,
    (byte) => INVITE_ALPHABET[byte % INVITE_ALPHABET.length],
  ).join("");
}

export function newId(): string {
  return crypto.randomUUID();
}
