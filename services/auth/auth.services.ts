import {
  createUserWithEmailAndPassword,
  deleteUser,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
} from '@react-native-firebase/auth';

import { auth } from '@/lib/firebase';
import { forgetThisDevice, unregisterThisDevice } from '@/services/devices/devices.services';
import { ensureDefaultSemester } from '@/services/semesters/semesters.services';

/**
 * Identity operations. Firebase owns identity — email/password and Google —
 * and the server verifies the resulting ID token; there is no password or
 * credential handled by the API layer.
 */

export async function signUp(email: string, password: string) {
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  return credential.user;
}

export async function signIn(email: string, password: string) {
  const credential = await signInWithEmailAndPassword(auth, email, password);
  return credential.user;
}

/** Unregister this device from server push first — that call needs the session. */
export async function signOut() {
  await unregisterThisDevice();
  await firebaseSignOut(auth);
}

export async function deleteAccount() {
  if (!auth.currentUser) throw new Error('Not authenticated');
  await deleteUser(auth.currentUser);
  // `DELETE /me` already removed the device server-side.
  await forgetThisDevice();
}

/**
 * Make sure the state a fresh account needs exists: one semester. Idempotent,
 * so it is safe on both sign-up and sign-in.
 *
 * The profile itself is not written here — the server provisions it on the
 * first authenticated request, which the session bootstrap makes.
 */
export async function ensureLocalAccount(_uid: string) {
  await ensureDefaultSemester();
}
