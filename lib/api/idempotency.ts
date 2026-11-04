/**
 * A fresh `Idempotency-Key` for one user intent (today only `POST /results`).
 *
 * Generate it once per intent — when the user taps "save" — and reuse it for
 * every retry of that same request, so a retried POST replays instead of
 * recording a second attempt.
 *
 * Uses `crypto.randomUUID` where the runtime has it; Hermes may not, so a v4
 * UUID is built from `Math.random` otherwise. The server scopes keys per user
 * and expires them, so uniqueness — not unpredictability — is what matters.
 */
export function newIdempotencyKey(): string {
  const native = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto?.randomUUID;
  if (native) return native();

  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const random = (Math.random() * 16) | 0;
    return (char === 'x' ? random : (random & 0x3) | 0x8).toString(16);
  });
}
