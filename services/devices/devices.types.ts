/** Wire types for devices — mirror `lokkhyo-server/schemas/notification.ts`. */

export type PushProviderDto = 'FCM' | 'EXPO';

export interface DeviceDto {
  id: string;
  fcmToken?: string | null;
  expoPushToken?: string | null;
  pushProvider?: PushProviderDto;
  platform: 'ANDROID' | 'IOS';
  deviceName: string | null;
  createdAt: string;
  lastSeenAt: string;
}

export interface RegisterDeviceDto {
  fcmToken?: string;
  expoPushToken?: string;
  pushProvider?: PushProviderDto;
  platform: 'ANDROID' | 'IOS';
  deviceName?: string;
}
