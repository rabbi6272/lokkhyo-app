import { auth } from '@/lib/firebase';

/**
 * The Firebase ID token for the signed-in user, or `null` when signed out.
 *
 * Every protected request carries this as `Authorization: Bearer <token>`; the
 * server verifies it with the Firebase Admin SDK and resolves the caller's uid
 * from it, so the app never sends a user id of its own.
 *
 * `forceRefresh` is used after a 401 — an expired token is the one case where
 * asking Firebase for a new one is the correct recovery.
 */
export async function getIdToken(forceRefresh = false): Promise<string | null> {
  const user = auth.currentUser;
  if (!user) return null;
  return user.getIdToken(forceRefresh);
}
