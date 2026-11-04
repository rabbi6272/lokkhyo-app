import { getIdToken } from '@/lib/api/auth-token';
import { API_TIMEOUT_MS, apiUrl } from '@/lib/api/config';
import { ApiError, toApiError } from '@/lib/api/error';
import { logError, logResponse, logRetry } from '@/lib/api/logger';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface RequestOptions {
  /** Resource path after the `/api/v1` prefix, e.g. `/me` or `/courses/123`. */
  path: string;
  method?: HttpMethod;
  query?: Record<string, string | number | boolean | null | undefined>;
  /** JSON-serialised as the request body. */
  body?: unknown;
  /** Attach the bearer token (default `true`). Set `false` for `/health`. */
  auth?: boolean;
  /** Value for the `Idempotency-Key` header (only `POST /results` needs it). */
  idempotencyKey?: string;
  /** Caller's abort signal, combined with the internal timeout. */
  signal?: AbortSignal;
  timeoutMs?: number;
  headers?: Record<string, string>;
}

type QueryValue = NonNullable<RequestOptions['query']>[string];

function buildUrl(path: string, query?: RequestOptions['query']): string {
  const url = apiUrl(path);
  if (!query) return url;

  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null) continue;
    params.append(key, String(value as QueryValue));
  }

  const qs = params.toString();
  return qs ? `${url}?${qs}` : url;
}

/** One `fetch` attempt with a given token. */
function send(options: RequestOptions, token: string | null, signal: AbortSignal): Promise<Response> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...(options.headers ?? {}),
  };

  if (options.auth !== false && token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let body: string | FormData | undefined;
  if (options.body !== undefined) {
    if (options.body instanceof FormData) {
      // Multipart upload (the profile photo). React Native's `fetch` writes
      // the multipart boundary itself, so no Content-Type header is set here —
      // a hand-written one would break the boundary.
      body = options.body;
    } else {
      headers['Content-Type'] = 'application/json';
      body = JSON.stringify(options.body);
    }
  }

  if (options.idempotencyKey) {
    headers['Idempotency-Key'] = options.idempotencyKey;
  }

  return fetch(buildUrl(options.path, options.query), {
    method: options.method ?? 'GET',
    headers,
    body,
    signal,
  });
}

async function readBody(response: Response): Promise<unknown> {
  if (response.status === 204) return undefined;
  const text = await response.text();
  if (!text) return undefined;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

/**
 * The single chokepoint every API call goes through.
 *
 * Responsibilities, in one place: base URL, bearer token, JSON encode/decode,
 * the unified error envelope, the `Idempotency-Key` header, a request timeout,
 * a single token-refresh retry on 401, and logging of every round trip.
 * Nothing else in the app calls `fetch`.
 *
 * Returns the parsed response body (the server wraps success payloads in
 * `{ data: … }`, list endpoints add `pagination`), typed as `T`.
 */
export async function request<T>(options: RequestOptions): Promise<T> {
  const method = options.method ?? 'GET';
  const url = buildUrl(options.path, options.query);
  const startedAt = Date.now();

  const timeoutMs = options.timeoutMs ?? API_TIMEOUT_MS;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const onCallerAbort = () => controller.abort();
  options.signal?.addEventListener('abort', onCallerAbort);

  try {
    let token: string | null = null;
    if (options.auth !== false) {
      token = await getIdToken(false);
      if (!token) {
        throw new ApiError('UNAUTHENTICATED', 'Not signed in');
      }
    }

    let response = await send(options, token, controller.signal);

    // An expired token is the one failure worth retrying automatically: ask
    // Firebase for a fresh one and replay the request exactly once.
    if (response.status === 401 && options.auth !== false) {
      logRetry(method, url);
      const refreshed = await getIdToken(true);
      if (refreshed) {
        response = await send(options, refreshed, controller.signal);
      }
    }

    const payload = await readBody(response);
    if (!response.ok) {
      throw toApiError(response.status, payload);
    }

    logResponse(method, url, response.status, Date.now() - startedAt, payload);
    return payload as T;
  } catch (error) {
    const apiError =
      error instanceof ApiError
        ? error
        : error instanceof Error && error.name === 'AbortError'
          ? new ApiError('TIMEOUT', 'The server took too long to respond')
          : new ApiError('NETWORK_ERROR', 'Could not reach the server. Reconnect and try again.');

    logError(method, url, apiError, Date.now() - startedAt);
    throw apiError;
  } finally {
    clearTimeout(timer);
    options.signal?.removeEventListener('abort', onCallerAbort);
  }
}
