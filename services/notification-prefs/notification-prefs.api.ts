import { request } from '@/lib/api';

import type { NotificationPrefsDto, UpdateNotificationPrefsDto } from './notification-prefs.types';

/** `GET /api/v1/me/notification-prefs` — defaults on first read. */
export async function getNotificationPrefs(): Promise<NotificationPrefsDto> {
  const { data } = await request<{ data: NotificationPrefsDto }>({ path: '/me/notification-prefs' });
  return data;
}

/** `PATCH /api/v1/me/notification-prefs` — categories merge per key. */
export async function updateNotificationPrefs(
  input: UpdateNotificationPrefsDto,
): Promise<NotificationPrefsDto> {
  const { data } = await request<{ data: NotificationPrefsDto }>({
    path: '/me/notification-prefs',
    method: 'PATCH',
    body: input,
  });
  return data;
}
