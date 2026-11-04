/**
 * The app's feature-agnostic API plumbing.
 *
 * Each feature owns a `services/<feature>/` module — `<feature>.api.ts`
 * (endpoints), `<feature>.types.ts` (wire types), `<feature>.hooks.ts`
 * (React Query), `<feature>.services.ts` (orchestration). Every one of those
 * `.api.ts` files talks to the server through the single `request()` export
 * here, so base URL, auth, JSON, error handling and timeouts live in one place.
 */

export { API_BASE_URL, API_PREFIX, API_TIMEOUT_MS, apiUrl } from '@/lib/api/config';
export { ApiError, isApiError, toApiError } from '@/lib/api/error';
export { request, type HttpMethod, type RequestOptions } from '@/lib/api/client';
export { getIdToken } from '@/lib/api/auth-token';
export { MAX_PAGE_SIZE, paginateAll, type Paginated } from '@/lib/api/pagination';
export { newIdempotencyKey } from '@/lib/api/idempotency';
