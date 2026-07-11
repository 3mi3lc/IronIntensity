import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { logger } from '@/utils/logger';

/**
 * Notifications core: foreground display handler, permission + Expo push token
 * registration, and thin local-scheduling helpers. All best-effort; failures
 * are logged, never thrown, so notifications can never break a flow.
 */

// Show banners/sound while the app is foregrounded.
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
    }),
});

/** Android needs an explicit channel for notifications to appear. */
export async function setupAndroidChannel(): Promise<void> {
    if (Platform.OS !== 'android') return;
    try {
        await Notifications.setNotificationChannelAsync('default', {
            name: 'Default',
            importance: Notifications.AndroidImportance.DEFAULT,
            lightColor: '#eb0202',
        });
    } catch (e) {
        logger.warn('Failed to set Android notification channel', e);
    }
}

/** Ask for permission if not already granted. Returns whether granted. */
export async function ensureNotificationPermissions(): Promise<boolean> {
    try {
        const { status } = await Notifications.getPermissionsAsync();
        if (status === 'granted') return true;
        const req = await Notifications.requestPermissionsAsync();
        return req.status === 'granted';
    } catch (e) {
        logger.warn('Failed to check notification permissions', e);
        return false;
    }
}

/**
 * Register for remote push and return the Expo push token, or null when it is
 * not available (simulator, no permission, or no EAS project id configured).
 */
export async function getExpoPushToken(): Promise<string | null> {
    if (!Device.isDevice) return null;
    try {
        await setupAndroidChannel();
        const projectId =
            Constants.expoConfig?.extra?.eas?.projectId ?? (Constants as any).easConfig?.projectId;
        if (!projectId) {
            logger.warn('No EAS projectId, skipping push token registration');
            return null;
        }
        const token = await Notifications.getExpoPushTokenAsync({ projectId });
        return token.data;
    } catch (e) {
        logger.warn('Failed to get Expo push token', e);
        return null;
    }
}

/**
 * Schedule a one-off local notification at a specific time. Pass a stable
 * `identifier` to make it replaceable/cancellable later. Returns its id, or null
 * if the time is in the past or scheduling failed.
 */
export async function scheduleAt(
    date: Date,
    title: string,
    body: string,
    data: Record<string, unknown> = {},
    identifier?: string
): Promise<string | null> {
    if (identifier) await cancelScheduled(identifier);
    if (date.getTime() <= Date.now()) return null;
    try {
        return await Notifications.scheduleNotificationAsync({
            ...(identifier ? { identifier } : {}),
            content: { title, body, data },
            trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date },
        });
    } catch (e) {
        logger.warn('Failed to schedule notification', e);
        return null;
    }
}

/**
 * Schedule (or replace) a daily repeating notification under a stable id, so
 * calling again updates the time rather than stacking duplicates.
 */
export async function scheduleDaily(
    identifier: string,
    hour: number,
    minute: number,
    title: string,
    body: string
): Promise<void> {
    try {
        await Notifications.cancelScheduledNotificationAsync(identifier).catch(() => {});
        await Notifications.scheduleNotificationAsync({
            identifier,
            content: { title, body },
            trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour, minute },
        });
    } catch (e) {
        logger.warn('Failed to schedule daily notification', e);
    }
}

/** Cancel a scheduled notification by id (no-op if it does not exist). */
export async function cancelScheduled(identifier: string): Promise<void> {
    try {
        await Notifications.cancelScheduledNotificationAsync(identifier);
    } catch (e) {
        logger.warn('Failed to cancel notification', e);
    }
}
