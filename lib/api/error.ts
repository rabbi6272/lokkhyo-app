/**
 * The one error type every API call fails with.
 *
 * The server answers with a single envelope — `{ error: { code, message,
 * details? } }` — at every status. `code` is the machine-readable contract
 * (clients branch on it, never on `message`), so it is preserved verbatim here
 * while `message` is only ever shown as a fallback.
 *
 * Two codes are produced locally, not by the server: `NETWORK_ERROR` when the
 * request never reached it, and `TIMEOUT` when it stopped answering.
 */
export class ApiError extends Error {
  readonly code: string;
  readonly status: number | null;
  readonly details?: unknown;

  constructor(
    code: string,
    message: string,
    status: number | null = null,
    details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export function isApiError(value: unknown): value is ApiError {
  return value instanceof ApiError;
}

interface ErrorEnvelope {
  error?: {
    code?: unknown;
    message?: unknown;
    details?: unknown;
  };
}

/**
 * Turn a parsed response body into an `ApiError`.
 *
 * A body that is not the expected envelope (a proxy 502 page, an HTML error)
 * still becomes an `ApiError` — never a raw parse crash — so callers have one
 * shape to handle.
 */
export function toApiError(status: number, body: unknown): ApiError {
  if (body && typeof body === 'object' && 'error' in body) {
    const error = (body as ErrorEnvelope).error;
    if (error && typeof error === 'object') {
      const code = typeof error.code === 'string' ? error.code : 'INTERNAL_ERROR';
      const message =
        typeof error.message === 'string' ? error.message : 'Request failed';
      return new ApiError(code, message, status, error.details);
    }
  }
  return new ApiError('INTERNAL_ERROR', `Request failed with status ${status}`, status);
}
