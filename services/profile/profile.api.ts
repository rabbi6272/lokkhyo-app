import { request } from '@/lib/api';

import type { PhotoFile, ProfileDto, UpdateProfileDto } from './profile.types';

/**
 * `GET /api/v1/me`
 *
 * The profile is provisioned by the server on the first authenticated request,
 * so this call doubles as "make sure my account exists server-side" — which is
 * why the session bootstrap mounts it. `profileKeys` is keyed by the Firebase
 * uid, so the bootstrap and every screen share one cache entry and one request.
 */
export async function getMe(): Promise<ProfileDto> {
  const { data } = await request<{ data: ProfileDto }>({ path: '/me' });
  return data;
}

/**
 * `DELETE /api/v1/me` — purge every record the student owns on the server.
 * The Firebase user is deleted separately, afterwards.
 */
export async function deleteMe(): Promise<void> {
  await request<void>({ path: '/me', method: 'DELETE' });
}

/** `PATCH /api/v1/me` — write the fields the student owns. */
export async function updateMe(input: UpdateProfileDto): Promise<ProfileDto> {
  const { data } = await request<{ data: ProfileDto }>({
    path: '/me',
    method: 'PATCH',
    body: input,
  });
  return data;
}

/**
 * `PUT /api/v1/me/photo` — set or replace the caller's photo.
 *
 * The body is `multipart/form-data` with one part named `photo`; the server
 * re-encodes every upload to WebP and returns the full profile, which the
 * mutation seeds into the shared `/me` cache entry.
 */
export async function uploadPhoto(file: PhotoFile): Promise<ProfileDto> {
  const form = new FormData();
  form.append('photo', file as unknown as Blob);
  const { data } = await request<{ data: ProfileDto }>({
    path: '/me/photo',
    method: 'PUT',
    body: form,
  });
  return data;
}

/** `DELETE /api/v1/me/photo` — remove it. Returns 204. */
export async function deletePhoto(): Promise<void> {
  await request<void>({ path: '/me/photo', method: 'DELETE' });
}
