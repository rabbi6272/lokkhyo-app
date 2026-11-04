import type { User } from '@react-native-firebase/auth';

/**
 * The auth feature's type surface.
 *
 * Identity is Firebase's — email/password and Google — and the API only ever
 * verifies the ID token Firebase issues, so the record the app works with *is*
 * Firebase's `User`. Everything profile-shaped (name, school, target GPA) is a
 * separate resource owned by `services/profile`, which also owns the
 * `GET/PATCH /me` endpoint those fields arrive on.
 */
export type { User };

/** What the auth provider exposes to the rest of the app. */
export interface AuthContextValue {
  user: User | null;
  /**
   * True until Firebase has resolved the persisted session. Nothing should
   * render around it: this is what keeps the splash screen from racing a
   * late `onAuthStateChanged`.
   */
  initializing: boolean;
}
