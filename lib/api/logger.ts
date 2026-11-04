import { API_LOGGING } from '@/lib/api/config';
import type { ApiError } from '@/lib/api/error';

/**
 * Console tracing for every call the app makes to the backend.
 *
 * One line per request: when the response comes back (status + duration), or
 * when it fails. Nothing secret is logged: the
 * `Authorization` header is never included, and the request body is the JSON
 * the caller passed in.
 *
 * Gated by `API_LOGGING` (see `lib/api/config`), so it costs nothing in a
 * production build unless explicitly enabled.
 */
const PREFIX = '[api]';

export function logResponse(
  method: string,
  url: string,
  status: number,
  durationMs: number,
  body?: unknown,
) {
  if (!API_LOGGING) return;
  console.log(`${PREFIX} ← ${status} ${method} ${url} (${durationMs}ms)`);
  // if (body !== undefined) {
  //   console.log(`${PREFIX}   body`, body);
  // }
}

export function logRetry(method: string, url: string) {
  if (!API_LOGGING) return;
  console.log(`${PREFIX} ↻ ${method} ${url} — 401, refreshing token and retrying once`);
}

export function logError(method: string, url: string, error: ApiError, durationMs: number) {
  if (!API_LOGGING) return;
  const status = error.status != null ? ` ${error.status}` : '';
  console.warn(
    `${PREFIX} ✕ ${method} ${url} (${durationMs}ms) — ${error.code}${status}: ${error.message}`,
  );
}
