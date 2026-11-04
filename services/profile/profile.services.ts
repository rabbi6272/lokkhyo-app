import type { UserProfile } from '@/lib/types';

import type { ProfileDto, UpdateProfileDto } from './profile.types';

/**
 * Server `ProfileDto` → the app's `UserProfile`.
 *
 * The two shapes disagree only in naming and "unset": the server keeps a field
 * `null` until the student fills it in, while the screens expect `''` / `0` so
 * they can render without null-checks everywhere.
 */
export function toUserProfile(dto: ProfileDto): UserProfile {
  return {
    fullName: dto.name ?? '',
    photoUrl: dto.photoUrl,
    university: dto.university ?? '',
    department: dto.department ?? '',
    currentSemesterId: dto.currentSemesterId ?? '',
    targetCgpa: dto.targetCgpa ?? 0,
    createdAt: dto.createdAt,
  };
}

/**
 * App `UserProfile` patch → `PATCH /me`.
 *
 * Only the fields the edit form actually owns are forwarded — anything else
 * (`createdAt` above all) is dropped rather than sent, because the server's
 * schema is strict and rejects unknown keys. An empty string is translated back
 * to `null` so "cleared a field" reads the same to the server as "never filled
 * in", and `''`/`null` for the semester id is likewise a real value rather than
 * a malformed one.
 */
export function toUpdateProfileInput(patch: Partial<UserProfile>): UpdateProfileDto {
  const input: UpdateProfileDto = {};

  if (patch.fullName !== undefined) input.name = patch.fullName.trim();
  if (patch.university !== undefined) input.university = patch.university.trim() || null;
  if (patch.department !== undefined) input.department = patch.department.trim() || null;
  if (patch.currentSemesterId !== undefined)
    input.currentSemesterId = patch.currentSemesterId || null;
  if (patch.targetCgpa !== undefined) input.targetCgpa = patch.targetCgpa;

  return input;
}
