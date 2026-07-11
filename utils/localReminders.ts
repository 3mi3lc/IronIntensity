import { scheduleDaily, scheduleAt, cancelScheduled } from '@/utils/notifications';
import { getWorkoutStreak, getTotalWorkouts } from '@/repositories/statistics';
import { NotifPrefs } from '@/utils/notificationPrefs';
import { logger } from '@/utils/logger';

/**
 * Local (on-device) reminder scheduling. All best-effort. Reminders are keyed by
 * stable identifiers so re-running replaces rather than stacks them.
 */

const WORKOUT_ID = 'workout-reminder';
const STREAK_ID = 'streak-reminder';
const SESSION_PREFIX = 'session:';

/** (Re)schedule or clear the daily workout nudge from prefs. */
export async function refreshWorkoutReminder(prefs: NotifPrefs): Promise<void> {
    if (!prefs.workoutReminder) {
        await cancelScheduled(WORKOUT_ID);
        return;
    }
    const [h, m] = prefs.workoutReminderTime.split(':').map(Number);
    await scheduleDaily(
        WORKOUT_ID,
        Number.isFinite(h) ? h : 18,
        Number.isFinite(m) ? m : 0,
        'Time to train 💪',
        'Keep the momentum going — log a workout today.'
    );
}

/**
 * Schedule a streak-at-risk reminder for this evening when a weekly streak is
 * active but no workout has been logged this week and the week is nearly over.
 * Safe to call on every app open; clears itself when not applicable.
 */
export async function refreshStreakReminder(userId: string, prefs: NotifPrefs): Promise<void> {
    await cancelScheduled(STREAK_ID);
    if (!prefs.streakReminder) return;
    try {
        const { current } = await getWorkoutStreak(userId);
        if (current < 1) return;

        const now = new Date();
        const dow = (now.getDay() + 6) % 7; // 0 = Monday
        if (dow < 4) return; // only Fri/Sat/Sun

        const monday = new Date(now);
        monday.setHours(0, 0, 0, 0);
        monday.setDate(now.getDate() - dow);
        const count = await getTotalWorkouts(userId, monday.toISOString(), now.toISOString());
        if (count > 0) return; // already trained this week

        const remind = new Date(now);
        remind.setHours(19, 0, 0, 0);
        if (remind.getTime() <= now.getTime()) {
            remind.setTime(now.getTime() + 2 * 60 * 60 * 1000); // in 2h if past 7pm
        }
        await scheduleAt(
            remind,
            'Streak at risk 🔥',
            `Don't lose your ${current}-week streak — train before the week ends!`,
            { type: 'streak' },
            STREAK_ID
        );
    } catch (e) {
        logger.warn('Failed to refresh streak reminder', e);
    }
}

/** Schedule (or clear) a reminder one hour before a planned session. */
export async function scheduleSessionReminder(
    sessionId: string,
    scheduledDate: string,          // 'YYYY-MM-DD'
    scheduledTime: string | null,   // 'HH:mm'
    title: string | null,
    prefs: NotifPrefs
): Promise<void> {
    const id = SESSION_PREFIX + sessionId;
    await cancelScheduled(id);
    if (!prefs.sessionReminders || !scheduledTime) return;

    const [h, m] = scheduledTime.split(':').map(Number);
    const when = new Date(`${scheduledDate}T00:00:00`);
    when.setHours(Number.isFinite(h) ? h : 0, Number.isFinite(m) ? m : 0, 0, 0);
    const remind = new Date(when.getTime() - 60 * 60 * 1000);

    await scheduleAt(
        remind,
        'Training soon ⏰',
        `${title ? `${title} — ` : ''}your planned session starts in an hour`,
        { type: 'session' },
        id
    );
}

/** Cancel a planned-session reminder (on delete / un-RSVP). */
export async function cancelSessionReminder(sessionId: string): Promise<void> {
    await cancelScheduled(SESSION_PREFIX + sessionId);
}
