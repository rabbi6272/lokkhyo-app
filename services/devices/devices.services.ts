import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { isApiError } from '@/lib/api';

import { deleteDevice, registerDevice } from './devices.api';

/** The server's id for this device's registration, kept for sign-out. */
const DEVICE_ID_KEY = 'lokkhyo.push.deviceId';
const LAST_TOKENS_KEY = 'lokkhyo.push.lastTokens';

const FALLBACK_PROJECT_ID = '7659946e-748e-4d65-a240-ae5e1e7ecd4d';

interface CachedDeviceRegistration {
  expoPushToken?: string;
  fcmToken?: string;
  registeredAt: number;
}

let inFlightRegistration: Promise<void> | null = null;
let isInternalDeviceTokenFetch = false;
let memoryCachedRegistration: CachedDeviceRegistration | null = null;
let lastAttemptTimestamp = 0;
const REGISTRATION_COOLDOWN_MS = 60_000; // 60 seconds cooldown between attempts

/**
 * Returns whether an internal getDevicePushTokenAsync call is currently active.
 * Used by push listeners to ignore the event fired by our own fetch.
 */
export function isFetchingDevicePushToken(): boolean {
  return isInternalDeviceTokenFetch;
}

/**
 * Register this device for server push (Expo Push Service, Android + iOS).
 *
 * Obtains an Expo push token (`ExponentPushToken[...]`), with native FCM
 * fallback on Android.
 *
 * Debounced & deduplicated:
 * 1. Shares an in-flight promise across concurrent callers.
 * 2. Checks in-memory session cache and AsyncStorage cache first (24h freshness).
 * 3. Enforces a 60-second cooldown between network attempts to prevent request storms.
 */
export async function registerThisDevice(token?: string, force = false): Promise<void> {
  const now = Date.now();

  // Rate-limit registration attempts
  if (!force && now - lastAttemptTimestamp < REGISTRATION_COOLDOWN_MS) {
    return;
  }

  // Fast-path in-memory cache check
  if (!force && memoryCachedRegistration) {
    if (now - memoryCachedRegistration.registeredAt < 24 * 60 * 60 * 1000) {
      return;
    }
  }

  if (inFlightRegistration) {
    return inFlightRegistration;
  }

  inFlightRegistration = (async () => {
    lastAttemptTimestamp = Date.now();

    // Fast-path persisted cache check before calling native token APIs
    if (!force && !token) {
      try {
        const rawCached = await AsyncStorage.getItem(LAST_TOKENS_KEY);
        if (rawCached) {
          const cached: CachedDeviceRegistration = JSON.parse(rawCached);
          if (Date.now() - cached.registeredAt < 24 * 60 * 60 * 1000) {
            memoryCachedRegistration = cached;
            return;
          }
        }
      } catch {
        // Continue to fresh registration
      }
    }

    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') return;

    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      Constants.easConfig?.projectId ??
      FALLBACK_PROJECT_ID;

    let expoPushToken: string | undefined;
    try {
      const tokenResult = await Notifications.getExpoPushTokenAsync({ projectId });
      expoPushToken = tokenResult.data;
    } catch (err) {
      console.warn('[devices] Failed to get Expo push token:', err);
    }

    // Only query native FCM if Expo push token is unavailable or caller supplied one
    let fcmToken: string | undefined = token;
    if (!expoPushToken && !fcmToken && Platform.OS === 'android') {
      try {
        isInternalDeviceTokenFetch = true;
        const fcmData = await Notifications.getDevicePushTokenAsync();
        fcmToken = String(fcmData.data);
      } catch {
        // Optional fallback
      } finally {
        isInternalDeviceTokenFetch = false;
      }
    }

    if (!expoPushToken && !fcmToken) return;

    // Check if we already registered these exact tokens recently
    if (!force) {
      try {
        const rawCached = await AsyncStorage.getItem(LAST_TOKENS_KEY);
        if (rawCached) {
          const cached: CachedDeviceRegistration = JSON.parse(rawCached);
          const isSameExpo = (cached.expoPushToken ?? null) === (expoPushToken ?? null);
          const isSameFcm = (cached.fcmToken ?? null) === (fcmToken ?? null);
          const isFresh = Date.now() - cached.registeredAt < 24 * 60 * 60 * 1000;

          if (isSameExpo && isSameFcm && isFresh) {
            memoryCachedRegistration = cached;
            return;
          }
        }
      } catch {
        // On cache error, proceed to register
      }
    }

    const device = await registerDevice({
      expoPushToken,
      fcmToken,
      pushProvider: expoPushToken ? 'EXPO' : 'FCM',
      platform: Platform.OS === 'ios' ? 'IOS' : 'ANDROID',
      deviceName: `${Platform.OS} ${String(Platform.Version)}`,
    });

    const cachedData: CachedDeviceRegistration = {
      expoPushToken,
      fcmToken,
      registeredAt: Date.now(),
    };
    memoryCachedRegistration = cachedData;

    await Promise.all([
      AsyncStorage.setItem(DEVICE_ID_KEY, device.id),
      AsyncStorage.setItem(LAST_TOKENS_KEY, JSON.stringify(cachedData)),
    ]);
  })().finally(() => {
    inFlightRegistration = null;
  });

  return inFlightRegistration;
}

/**
 * Stop pushes to this device. Called before Firebase sign-out, while the ID
 * token that authorises the delete is still valid. Never throws: a failed
 * unregister must not block signing out, and the server also drops tokens FCM
 * reports as dead.
 */
export async function unregisterThisDevice(): Promise<void> {
  try {
    const id = await AsyncStorage.getItem(DEVICE_ID_KEY);
    if (id) {
      await deleteDevice(id).catch((error: unknown) => {
        // Already gone (another sign-out, or the account was deleted) is fine.
        if (!(isApiError(error) && error.code === 'NOT_FOUND')) throw error;
      });
    }
  } catch (error) {
    console.warn('[devices] Unregister failed:', error);
  } finally {
    memoryCachedRegistration = null;
    await AsyncStorage.multiRemove([DEVICE_ID_KEY, LAST_TOKENS_KEY]).catch(() => undefined);
  }
}

/** Forget the stored registration without calling the server (account deleted). */
export async function forgetThisDevice(): Promise<void> {
  memoryCachedRegistration = null;
  await AsyncStorage.multiRemove([DEVICE_ID_KEY, LAST_TOKENS_KEY]).catch(() => undefined);
}
