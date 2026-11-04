import * as Sentry from '@sentry/react-native';

import { isApiError } from '@/lib/api/error';

/**
 * Crash and error reporting. Off without `EXPO_PUBLIC_SENTRY_DSN` and in
 * development. Sends no user id, and no breadcrumbs: those would carry request
 * URLs and console lines.
 *
 * shortcut: stack traces stay minified because no source maps are uploaded. Add the
 * `@sentry/react-native/expo` config plugin and a SENTRY_AUTH_TOKEN when they matter.
 */
export function initSentry(): void {
  const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;
  if (!dsn || __DEV__) return;
  Sentry.init({ dsn, sendDefaultPii: false, tracesSampleRate: 0, maxBreadcrumbs: 0 });
}

/** The server already reports its own faults; only a bug in the app is new here. */
export function reportUnexpected(error: unknown): void {
  if (!isApiError(error)) Sentry.captureException(error);
}

export const wrapRoot = Sentry.wrap;
