import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { UserProfile } from '@/lib/types';

import { deleteMe, deletePhoto, getMe, updateMe, uploadPhoto } from './profile.api';
import { toUpdateProfileInput } from './profile.services';
import type { PhotoFile, ProfileDto } from './profile.types';

/**
 * Query keys for the profile feature, keyed by the *Firebase* uid so that
 * signing out and back in as a different user can never read the previous
 * cache entry.
 */
export const profileKeys = {
  all: ['profile'] as const,
  me: (userId?: string | null) => [...profileKeys.all, 'me', userId ?? 'anonymous'] as const,
};

/**
 * The signed-in user's server profile.
 *
 * The server provisions the profile on the first authenticated request, so
 * mounting this for a signed-in user is also what creates the account
 * server-side — the session bootstrap and every profile-reading screen share
 * this one cache entry, so there is a single `GET /me` per session.
 *
 * Disabled while signed out (`userId` is undefined).
 */
export function useProfileQuery(userId?: string | null) {
  return useQuery({
    queryKey: profileKeys.me(userId),
    queryFn: getMe,
    enabled: !!userId,
  });
}

/**
 * Update the fields the student owns (`name`, `university`, `department`,
 * `currentSemesterId`, `targetCgpa`).
 *
 * Takes the app's own `Partial<UserProfile>` and maps it to the wire shape in
 * the mutation, so screens never have to know about the server's naming. Writes
 * are not optimistic: the mutation waits for the server's response, seeds it
 * into the cache, then invalidates the feature so any derived query stays in
 * sync.
 */
export function useUpdateProfile(userId?: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (patch: Partial<UserProfile>) => updateMe(toUpdateProfileInput(patch)),
    onSuccess: (profile) => {
      if (userId) {
        queryClient.setQueryData(profileKeys.me(userId), profile);
      }
      void queryClient.invalidateQueries({ queryKey: profileKeys.all });
    },
  });
}

/**
 * Erase the student's server-side data (`DELETE /me`) and drop every cached
 * query, so nothing of the account is rendered while the Firebase user is
 * being deleted. `clear` rather than `invalidateQueries`: there is nothing to
 * refetch until someone signs in again.
 */
export function useDeleteProfile(userId?: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => {
      if (!userId) throw new Error('Not authenticated');
      return deleteMe();
    },
    onSuccess: () => {
      queryClient.clear();
    },
  });
}

/**
 * Replace the caller's photo (`PUT /me/photo`).
 *
 * The server answers with the full profile after re-encoding the upload to
 * WebP, so the response is seeded into the shared cache entry the same way a
 * `PATCH /me` response is, and the same invalidation keeps derived queries in
 * sync. Errors bubble up to the caller for the picker screen to surface.
 */
export function useUpdatePhoto(userId?: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (file: PhotoFile) => uploadPhoto(file),
    onSuccess: (profile) => {
      if (userId) {
        queryClient.setQueryData(profileKeys.me(userId), profile);
      }
      void queryClient.invalidateQueries({ queryKey: profileKeys.all });
    },
  });
}

/**
 * Remove the caller's photo (`DELETE /me/photo`, 204).
 *
 * There is no response body, so the cache is updated locally: the `photoUrl`
 * on the shared `/me` entry is cleared and the avatar falls back to initials
 * immediately, without a refetch.
 */
export function useRemovePhoto(userId?: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => {
      if (!userId) throw new Error('Not authenticated');
      return deletePhoto();
    },
    onSuccess: () => {
      if (userId) {
        queryClient.setQueryData<ProfileDto>(profileKeys.me(userId), (old) =>
          old ? { ...old, photoUrl: null } : old,
        );
      }
    },
  });
}
