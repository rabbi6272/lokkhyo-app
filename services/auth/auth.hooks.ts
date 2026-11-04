import { GoogleAuthProvider, signInWithCredential } from '@react-native-firebase/auth';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { useCallback } from 'react';
import { Platform } from 'react-native';

import { auth } from '@/lib/firebase';

import type { User } from './auth.types';

/**
 * Auth hooks. Identity is a Firebase SDK concern, not an HTTP one — the API's
 * only auth endpoint is `GET/PATCH /me`, which is the profile resource and so
 * lives in `services/profile`.
 */

GoogleSignin.configure({
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
});

/**
 * Google sign-in.
 *
 * Purely a client-side Firebase flow — the ID token it produces is what every
 * API request later carries — so it lives here beside the other auth hooks
 * rather than in the generic `hooks/` folder.
 */
export function useGoogleSignIn() {
  const signInWithGoogle = useCallback(async (): Promise<User | null> => {
    if (Platform.OS === 'android') {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    }

    const silent = await GoogleSignin.signInSilently();
    const response = silent.type === 'success' ? silent : await GoogleSignin.signIn();

    if (response.type !== 'success') {
      return null;
    }

    let idToken = response.data.idToken;
    if (!idToken) {
      idToken = (await GoogleSignin.getTokens()).idToken;
    }
    if (!idToken) {
      throw new Error('Google sign-in failed: missing ID token.');
    }

    const credential = GoogleAuthProvider.credential(idToken);
    const userCredential = await signInWithCredential(auth, credential);
    return userCredential.user;
  }, []);

  return { signInWithGoogle };
}
