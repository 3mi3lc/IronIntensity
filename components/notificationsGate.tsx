import { useEffect } from 'react';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { ensureNotificationPermissions, getExpoPushToken } from '@/utils/notifications';
import { registerPushToken } from '@/repositories/pushTokens';
import { getNotifPrefs } from '@/utils/notificationPrefs';
import { refreshWorkoutReminder, refreshStreakReminder } from '@/utils/localReminders';
import { logger } from '@/utils/logger';

/** Map a notification's data payload to an in-app route to open on tap. */
function routeForNotification(data: any): string | { pathname: any; params: any } | null {
    if (!data) return null;
    if ((data.type === 'rsvp' || data.type === 'report') && data.community_id) {
        return { pathname: '/communities/[id]', params: { id: String(data.community_id) } };
    }
    if (data.type === 'kudos' || data.type === 'session') return '/communities';
    if (data.type === 'streak') return '/logging';
    return null;
}

/**
 * Side-effect-only component mounted at the app root: registers the push token
 * and refreshes local reminders when a user is signed in, and deep-links when a
 * notification is tapped. Renders nothing.
 */
export function NotificationsGate() {
    const { user } = useAuth();

    useEffect(() => {
        if (!user?.id) return;
        let active = true;
        (async () => {
            try {
                const prefs = await getNotifPrefs();
                const granted = await ensureNotificationPermissions();
                if (!active || !granted) return;
                if (prefs.push) {
                    const token = await getExpoPushToken();
                    if (token && active) await registerPushToken(token);
                }
                await refreshWorkoutReminder(prefs);
                await refreshStreakReminder(user.id, prefs);
            } catch (e) {
                logger.warn('Notification setup failed', e);
            }
        })();
        return () => { active = false; };
    }, [user?.id]);

    useEffect(() => {
        const go = (data: any) => {
            const route = routeForNotification(data);
            if (route) router.push(route as any);
        };
        const sub = Notifications.addNotificationResponseReceivedListener(res => {
            go(res.notification.request.content.data);
        });
        // Cold start from a tapped notification.
        Notifications.getLastNotificationResponseAsync().then(res => {
            if (res) go(res.notification.request.content.data);
        });
        return () => sub.remove();
    }, []);

    return null;
}
