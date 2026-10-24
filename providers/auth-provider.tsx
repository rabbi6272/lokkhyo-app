import { onAuthStateChanged } from '@react-native-firebase/auth';
import { useQueryClient } from '@tanstack/react-query';
import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { auth } from '@/lib/firebase';
import type { AuthContextValue, User } from '@/services/auth/auth.types';
import { useProfileQuery } from '@/services/profile/profile.hooks';

const AuthContext = createContext<AuthContextValue>({ user: null, initializing: true });

const STORAGE_KEY = 'lokkhyo-query-cache';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setInitializing(false);
    });
    return unsubscribe;
  }, []);

  const uid = user?.uid;
  const queryClient = useQueryClient();
  const previousUid = useRef<string | undefined>(undefined);

  /**
   * Drop every cached query when the session ends or changes hands. Query keys
   * are uid-scoped, so a new user could never *read* the old entries — this is
   * about not keeping a previous student's data in memory at all.
   */
  useEffect(() => {
    if (previousUid.current && previousUid.current !== uid) {
      queryClient.clear();
      // Also remove the persisted cache for the previous user
      AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
      if (previousUid.current) {
        AsyncStorage.removeItem(`${STORAGE_KEY}-${previousUid.current}`).catch(() => {});
      }
    }
    previousUid.current = uid;
  }, [uid, queryClient]);

  /**
   * Provision the server-side profile once a Firebase session exists.
   *
   * Firebase owns identity; the server owns the profile and creates it on the
   * first authenticated request. Mounting the profile query for a signed-in
   * user is what triggers that (idempotent) upsert, and it seeds the same
   * cache entry every profile-reading screen reads — so the session gets one
   * `GET /me`, not one per screen. It never gates `initializing`, so the splash
   * screen does not wait on the network.
   */
  useProfileQuery(uid);

  const value = useMemo(() => ({ user, initializing }), [user, initializing]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
