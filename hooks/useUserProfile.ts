import { useMemo } from 'react';

import { useAuth } from '@/providers/auth-provider';
import { useDeleteProfile, useProfileQuery, useRemovePhoto, useUpdatePhoto, useUpdateProfile } from '@/services/profile/profile.hooks';
import { toUserProfile } from '@/services/profile/profile.services';

/**
 * The student's profile, as the screens see it.
 *
 * A thin adapter over `services/profile`: it resolves the signed-in uid,
 * reads the shared `GET /me` cache entry (the one the session bootstrap
 * warms), and maps the wire DTO to the `UserProfile` domain type. The screen
 * only ever deals in `UserProfile`, never in server field names.
 *
 * The mapping is memoised on the cached DTO so the returned object keeps a
 * stable identity — otherwise the edit screen's "seed the form" effect would
 * refire on every render and clobber what the student is typing.
 */
export function useProfile() {
  const { user } = useAuth();
  const query = useProfileQuery(user?.uid);
  const profileData = useMemo(
    () => (query.data ? toUserProfile(query.data) : null),
    [query.data],
  );

  return {
    profileData,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    /** `PATCH /me`, in the app's own vocabulary. */
    updateProfile: useUpdateProfile(user?.uid),
    /** `PUT /me/photo` — replace the profile photo. */
    updatePhoto: useUpdatePhoto(user?.uid),
    /** `DELETE /me/photo` — remove the profile photo. */
    removePhoto: useRemovePhoto(user?.uid),
    /** `DELETE /me` — purge the server record (the settings screen runs this first, then Firebase deletion). */
    deleteProfile: useDeleteProfile(user?.uid),
  };
}
