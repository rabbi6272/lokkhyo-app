/**
 * Wire types for the server's `users` resource — the shape `GET`/`PATCH /me`
 * send and receive (`schemas/user.ts`).
 *
 * `id` is the server's own record id, *not* the Firebase uid: the app
 * identifies a session by the uid and never sends one.
 */

export type UserRole = 'STUDENT' | 'INSTRUCTOR' | 'ADMIN';

/** The full `/me` payload. Nullable fields are "not set yet". */
export interface ProfileDto {
  id: string;
  email: string | null;
  name: string | null;
  photoUrl: string | null;
  university: string | null;
  department: string | null;
  /** The student's active `semesters` id, or null when none is chosen. */
  currentSemesterId: string | null;
  /** RUET scale, 0–4. Null means "no target set yet". */
  targetCgpa: number | null;
  role: UserRole;
  /** IANA zone, e.g. `Asia/Dhaka`. Drives every scheduled reminder. */
  timezone: string;
  createdAt: string;
  updatedAt: string;
}

/** `PATCH /me` — only the fields the student owns. `role` is deliberately absent. */
export interface UpdateProfileDto {
  name?: string;
  timezone?: string;
  university?: string | null;
  department?: string | null;
  currentSemesterId?: string | null;
  targetCgpa?: number | null;
}

/**
 * A photo picked on the device, ready to upload as the multipart part `photo`.
 * React Native's `FormData` accepts a `{ uri, name, type }` object as a file
 * part; the server validates the declared `type` against jpeg/png/webp and the
 * size against 3 MB before decoding it.
 */
export interface PhotoFile {
  uri: string;
  /** MIME type, e.g. `image/jpeg`. Shown on the wire as the part's content type. */
  type: string;
  /** File name, mostly cosmetic for the multipart part. */
  name: string;
}
