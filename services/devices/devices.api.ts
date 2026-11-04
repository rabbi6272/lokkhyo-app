import { request } from '@/lib/api';

import type { DeviceDto, RegisterDeviceDto } from './devices.types';

/** `POST /api/v1/devices` — an upsert on the token, so re-registering is safe. */
export async function registerDevice(input: RegisterDeviceDto): Promise<DeviceDto> {
  const { data } = await request<{ data: DeviceDto }>({
    path: '/devices',
    method: 'POST',
    body: input,
  });
  return data;
}

/** `DELETE /api/v1/devices/:id` — stop pushes to this device (sign-out). */
export async function deleteDevice(id: string): Promise<void> {
  await request<void>({ path: `/devices/${id}`, method: 'DELETE' });
}
