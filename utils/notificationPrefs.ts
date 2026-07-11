import AsyncStorage from '@react-native-async-storage/async-storage';

/** User notification preferences, persisted locally. */
export interface NotifPrefs {
    /** Remote push (kudos, RSVPs, reports). */
    push: boolean;
    /** Local reminder before a planned session you created or RSVP'd to. */
    sessionReminders: boolean;
    /** Daily local nudge to train. */
    workoutReminder: boolean;
    /** Time for the daily nudge, 'HH:mm'. */
    workoutReminderTime: string;
    /** Local reminder when a weekly streak is about to lapse. */
    streakReminder: boolean;
}

export const DEFAULT_NOTIF_PREFS: NotifPrefs = {
    push: true,
    sessionReminders: true,
    workoutReminder: false,
    workoutReminderTime: '18:00',
    streakReminder: true,
};

const KEY = 'notifPrefs';

export async function getNotifPrefs(): Promise<NotifPrefs> {
    try {
        const raw = await AsyncStorage.getItem(KEY);
        return raw ? { ...DEFAULT_NOTIF_PREFS, ...JSON.parse(raw) } : DEFAULT_NOTIF_PREFS;
    } catch {
        return DEFAULT_NOTIF_PREFS;
    }
}

export async function setNotifPrefs(prefs: NotifPrefs): Promise<void> {
    try {
        await AsyncStorage.setItem(KEY, JSON.stringify(prefs));
    } catch {
        // best-effort
    }
}
