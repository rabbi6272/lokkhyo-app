import { useCallback, useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import * as Notifications from 'expo-notifications';

import { useAuth } from '@/providers/auth-provider';
import { useRoutines } from '@/hooks/useRoutines';
import {
  ensureNotificationChannels,
  NOTIFICATION_TYPE_ASSESSMENT_REMINDER,
  NOTIFICATION_TYPE_DAILY_ROUTINE,
  NOTIFICATION_TYPE_SERVER_PUSH,
  requestNotificationPermissions,
} from '@/services/notifications/notificationsCore';
import {
  isFetchingDevicePushToken,
  registerThisDevice,
} from '@/services/devices/devices.services';
import { syncRoutineNotifications, cancelRoutineNotifications } from '@/services/notifications/routineNotifications';
import { syncAssessmentReminders, cancelAssessmentReminders } from '@/services/notifications/assessmentReminders';

/**
 * Orchestrates all notification lifecycle:
 * - Auth state: sync on login, cancel on logout
 * - Routine slot changes: re-sync
 * - AppState foreground: refresh
 * - Notification taps: navigate to routine or course screen
 */
export function useScheduledNotifications() {
  const { user } = useAuth();
  const { slots } = useRoutines();
  const router = useRouter();

  const lastUidRef = useRef<string | null>(null);
  const appState = useRef(AppState.currentState);
  const lastSyncRef = useRef(0);

  const syncAll = useCallback(async (uid: string) => {
    const token = uid;
    lastUidRef.current = token;
    lastSyncRef.current = Date.now();

    await Promise.allSettled([
      syncRoutineNotifications(uid),
      syncAssessmentReminders(uid),
    ]);

    if (lastUidRef.current !== token) return;
  }, []);

  const cancelAll = useCallback(async () => {
    await Promise.allSettled([
      cancelRoutineNotifications(),
      cancelAssessmentReminders(),
    ]);
  }, []);

  const didRequestPermissionRef = useRef(false);

  useEffect(() => {
    const requestOnce = () => {
      if (didRequestPermissionRef.current) return;
      didRequestPermissionRef.current = true;
      void requestNotificationPermissions();
    };

    if (AppState.currentState === 'active') {
      const t = setTimeout(() => {
        if (AppState.currentState === 'active') requestOnce();
      }, 1000);
      return () => clearTimeout(t);
    }

    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') requestOnce();
    });
    return () => sub.remove();
  }, []);

  const registeredUserRef = useRef<string | null>(null);

  useEffect(() => {
    if (!user) {
      registeredUserRef.current = null;
      void cancelAll();
      return;
    }

    if (registeredUserRef.current !== user.uid) {
      registeredUserRef.current = user.uid;
      void requestNotificationPermissions().then(async (granted) => {
        if (!granted) return;
        await ensureNotificationChannels();
        await registerThisDevice();
      }).catch((e: unknown) => {
        console.warn('[notifications] Push registration failed:', e);
      });
    }

    void syncAll(user.uid);
  }, [user, syncAll, cancelAll]);

  // FCM rotates tokens; re-register so server pushes keep arriving.
  const signedIn = !!user;
  useEffect(() => {
    if (!signedIn) return;
    const sub = Notifications.addPushTokenListener((token) => {
      // Avoid infinite loop: ignore token event fired by our own getDevicePushTokenAsync
      if (isFetchingDevicePushToken()) return;
      // force: a rotated token must bypass the cooldown and 24h cache.
      void registerThisDevice(String(token.data), true).catch((e: unknown) =>
        console.warn('[notifications] Push re-registration failed:', e),
      );
    });
    return () => sub.remove();
  }, [signedIn]);

  useEffect(() => {
    if (!user) return;
    const now = Date.now();
    if (now - lastSyncRef.current < 30_000) return;
    void syncAll(user.uid);
  }, [slots, user, syncAll]);

  useEffect(() => {
    const handleAppState = (nextState: AppStateStatus) => {
      if (appState.current.match(/inactive|background/) && nextState === 'active') {
        appState.current = nextState;
        if (user) {
          const now = Date.now();
          if (now - lastSyncRef.current > 30_000) {
            void syncAll(user.uid);
          }
        }
      } else {
        appState.current = nextState;
      }
    };

    const sub = AppState.addEventListener('change', handleAppState);
    return () => sub.remove();
  }, [user, syncAll]);

  // Handle notification taps
  const openFromNotification = useCallback(
    (response: Notifications.NotificationResponse) => {
      if (response.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) return;
      const data = notificationData(response.notification);
      if (data.type === NOTIFICATION_TYPE_SERVER_PUSH && typeof data.link === 'string' && data.link) {
        router.push(data.link as Href);
      } else if (data.type === NOTIFICATION_TYPE_DAILY_ROUTINE) {
        router.push('/routine');
      } else if (data.type === NOTIFICATION_TYPE_ASSESSMENT_REMINDER && typeof data.courseId === 'string') {
        router.push({
          pathname: '/course/[id]',
          params: {
            id: data.courseId,
            ...(typeof data.reminderId === 'string'
              ? { reminderId: data.reminderId }
              : typeof data.assessmentId === 'string'
                ? { assessmentId: data.assessmentId }
                : {}),
          },
        });
      }
    },
    [router],
  );

  const lastNotificationResponse = Notifications.useLastNotificationResponse();

  useEffect(() => {
    if (lastNotificationResponse?.notification) openFromNotification(lastNotificationResponse);
  }, [lastNotificationResponse, openFromNotification]);

  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener(openFromNotification);
    return () => subscription.remove();
  }, [openFromNotification]);
}

/**
 * A notification's data payload. Local notifications carry it in
 * `content.data`; an FCM push tapped from the tray may carry it only on the
 * trigger's `remoteMessage`, so both are read.
 */
function notificationData(notification: Notifications.Notification): Record<string, unknown> {
  const content = (notification.request.content.data ?? {}) as Record<string, unknown>;
  const trigger = notification.request.trigger as { remoteMessage?: { data?: Record<string, unknown> } } | null;
  return { ...(trigger?.remoteMessage?.data ?? {}), ...content };
}
