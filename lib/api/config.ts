import { Platform } from 'react-native';

/**
 * Base URL of the Lokkhyo backend.
 *
 * Configured with `EXPO_PUBLIC_API_URL` (see `.env`). When unset, falls back to
 * the local dev server: `10.0.2.2` is the host loopback as seen from an Android
 * emulator, `localhost` works for the iOS simulator and web.
 *
 * A physical device cannot reach either — set `EXPO_PUBLIC_API_URL` to the
 * machine's LAN address there.
 */
const DEV_FALLBACK = Platform.select({
  android: 'http://10.0.2.2:3000',
  default: 'http://localhost:3000',
}) as string;

export const API_BASE_URL = (process.env.EXPO_PUBLIC_API_URL ?? DEV_FALLBACK).replace(/\/+$/, '');

/** Every route lives under this prefix (see `lokkhyo-server/app/api/v1`). */
export const API_PREFIX = '/api/v1';

/** Abort a request that has not produced a response in this long. */
export const API_TIMEOUT_MS = 20_000;

/**
 * Log every request, response, and failure to the console (see `lib/api/logger`).
 *
 * On in development. Set `EXPO_PUBLIC_API_LOG=1` to force it on in a production
 * build, or `EXPO_PUBLIC_API_LOG=0` to silence it.
 */
const LOG_FLAG = process.env.EXPO_PUBLIC_API_LOG;

export const API_LOGGING = LOG_FLAG
  ? LOG_FLAG !== '0' && LOG_FLAG !== 'false'
  : process.env.NODE_ENV !== 'production';

/** Join the base URL, the API prefix, and a resource path. */
export function apiUrl(path: string): string {
  const suffix = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${API_PREFIX}${suffix}`;
}
