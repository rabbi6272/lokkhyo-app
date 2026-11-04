import { request, type RequestOptions } from '@/lib/api/client';

/** The server's list envelope: `{ data, pagination }`. */
export interface Paginated<T> {
  data: T[];
  pagination: {
    nextCursor: string | null;
    hasMore: boolean;
    limit: number;
  };
}

/** The server's maximum page size — larger requests are a 400, not a clamp. */
export const MAX_PAGE_SIZE = 100;

/**
 * Fetch every page of a cursor-paginated list and return the rows as one array.
 *
 * Screens were written against Firestore's "give me the whole collection", so
 * list endpoints are drained here rather than every screen learning about
 * cursors. A student's lists are small (tens of rows), so this is normally a
 * single request at `MAX_PAGE_SIZE`.
 */
export async function paginateAll<T>(options: Omit<RequestOptions, 'method' | 'body'>): Promise<T[]> {
  const rows: T[] = [];
  let cursor: string | null = null;

  do {
    const page: Paginated<T> = await request<Paginated<T>>({
      ...options,
      query: { ...options.query, limit: MAX_PAGE_SIZE, cursor },
    });
    rows.push(...page.data);
    cursor = page.pagination.hasMore ? page.pagination.nextCursor : null;
  } while (cursor);

  return rows;
}
