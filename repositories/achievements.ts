import { db } from '@/db/client';
import { body_weight_entries, workout_exercise_sets, workout_exercises, workouts } from '@/db/schema';
import { and, eq, isNull, isNotNull, sql } from 'drizzle-orm';
import { getUnlockedAchievementIds, unlockAchievements } from '@/repositories/userAchievements';

export type AchievementCategory = 'volume' | 'workouts' | 'streak' | 'pr' | 'bodyweight' | 'milestone';

export interface AchievementDef {
    id: string;
    title: string;
    description: string;
    icon: string;
    category: AchievementCategory;
    threshold: number;
}

export interface Achievement extends AchievementDef {
    unlocked: boolean;
    /** Current value of this achievement's metric (e.g. workouts completed). */
    progress: number;
    /** progress toward the threshold, clamped to 0..1 (1 once unlocked). */
    progressPercent: number;
}

export const ACHIEVEMENTS: AchievementDef[] = [
    // Getting started (always unlocked — the board never reads 0%)
    { id: 'welcome', title: 'Welcome Aboard', description: 'Created your account', icon: '🎉', category: 'milestone', threshold: 0 },

    // Volume
    { id: 'volume_1k', title: 'First Steps', description: 'Lift 1,000 kg total', icon: '🥉', category: 'volume', threshold: 1000 },
    { id: 'volume_10k', title: 'Getting Serious', description: 'Lift 10,000 kg total', icon: '🥈', category: 'volume', threshold: 10000 },
    { id: 'volume_50k', title: 'Dedicated Lifter', description: 'Lift 50,000 kg total', icon: '🥇', category: 'volume', threshold: 50000 },
    { id: 'volume_100k', title: 'Iron Warrior', description: 'Lift 100,000 kg total', icon: '💪', category: 'volume', threshold: 100000 },
    { id: 'volume_500k', title: 'Elite Athlete', description: 'Lift 500,000 kg total', icon: '🏆', category: 'volume', threshold: 500000 },
    { id: 'volume_1m', title: 'Iron Legend', description: 'Lift 1,000,000 kg total', icon: '👑', category: 'volume', threshold: 1000000 },

    // Workouts
    { id: 'workouts_10', title: 'Just Getting Started', description: 'Complete 10 workouts', icon: '🌱', category: 'workouts', threshold: 10 },
    { id: 'workouts_25', title: 'Building Habits', description: 'Complete 25 workouts', icon: '⚡', category: 'workouts', threshold: 25 },
    { id: 'workouts_50', title: 'Consistent', description: 'Complete 50 workouts', icon: '🔥', category: 'workouts', threshold: 50 },
    { id: 'workouts_100', title: 'Century Club', description: 'Complete 100 workouts', icon: '💎', category: 'workouts', threshold: 100 },
    { id: 'workouts_250', title: 'Unstoppable', description: 'Complete 250 workouts', icon: '🚀', category: 'workouts', threshold: 250 },
    { id: 'workouts_500', title: 'Iron Veteran', description: 'Complete 500 workouts', icon: '👑', category: 'workouts', threshold: 500 },

    // Streak
    { id: 'streak_4', title: 'Month Warrior', description: '4 week streak', icon: '📅', category: 'streak', threshold: 4 },
    { id: 'streak_8', title: 'Two Month Streak', description: '8 week streak', icon: '🔥', category: 'streak', threshold: 8 },
    { id: 'streak_12', title: 'Quarter Year', description: '12 week streak', icon: '⚡', category: 'streak', threshold: 12 },
    { id: 'streak_26', title: 'Half Year Strong', description: '26 week streak', icon: '💪', category: 'streak', threshold: 26 },
    { id: 'streak_52', title: 'Full Year Grind', description: '52 week streak', icon: '👑', category: 'streak', threshold: 52 },

    // Personal records (metric = number of PR sets)
    { id: 'pr_1', title: 'First PR', description: 'Set your first personal record', icon: '🎯', category: 'pr', threshold: 1 },
    { id: 'pr_5', title: 'Getting Stronger', description: 'Set 5 personal records', icon: '💪', category: 'pr', threshold: 5 },
    { id: 'pr_10', title: 'Record Breaker', description: 'Set 10 personal records', icon: '🏅', category: 'pr', threshold: 10 },
    { id: 'pr_25', title: 'PR Machine', description: 'Set 25 personal records', icon: '🔥', category: 'pr', threshold: 25 },
    { id: 'pr_50', title: 'Peak Performer', description: 'Set 50 personal records', icon: '💥', category: 'pr', threshold: 50 },
    { id: 'pr_100', title: 'Record Hunter', description: 'Set 100 personal records', icon: '🏆', category: 'pr', threshold: 100 },
    { id: 'pr_200', title: 'Limitless', description: 'Set 200 personal records', icon: '👑', category: 'pr', threshold: 200 },

    // Bodyweight tracking (metric = number of bodyweight entries)
    { id: 'bw_1', title: 'Step on the Scale', description: 'Log your bodyweight for the first time', icon: '⚖️', category: 'bodyweight', threshold: 1 },
    { id: 'bw_5', title: 'Checking In', description: 'Log your bodyweight 5 times', icon: '📋', category: 'bodyweight', threshold: 5 },
    { id: 'bw_10', title: 'Tracking Progress', description: 'Log your bodyweight 10 times', icon: '📊', category: 'bodyweight', threshold: 10 },
    { id: 'bw_25', title: 'Data Driven', description: 'Log your bodyweight 25 times', icon: '📈', category: 'bodyweight', threshold: 25 },
    { id: 'bw_50', title: 'Consistency Counts', description: 'Log your bodyweight 50 times', icon: '🎯', category: 'bodyweight', threshold: 50 },
    { id: 'bw_100', title: 'Scale Master', description: 'Log your bodyweight 100 times', icon: '🏆', category: 'bodyweight', threshold: 100 },
];

type Metrics = Record<AchievementCategory, number>;

/** Current value of every achievement metric for a user. */
async function getMetrics(userId: string, longestStreak: number): Promise<Metrics> {
    const [volumeRow] = await db
        .select({ total: sql<number>`COALESCE(SUM(${workout_exercise_sets.weight} * ${workout_exercise_sets.reps}), 0)` })
        .from(workout_exercise_sets)
        .innerJoin(workout_exercises, eq(workout_exercise_sets.workout_exercise_id, workout_exercises.id))
        .innerJoin(workouts, eq(workout_exercises.workout_id, workouts.id))
        .where(and(
            eq(workouts.user_id, userId),
            isNotNull(workouts.completed_at),
            isNull(workouts.deleted_at),
            isNull(workout_exercise_sets.deleted_at),
            isNotNull(workout_exercise_sets.weight),
        ));

    const [workoutRow] = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(workouts)
        .where(and(
            eq(workouts.user_id, userId),
            isNotNull(workouts.completed_at),
            isNull(workouts.deleted_at),
        ));

    const [prRow] = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(workout_exercise_sets)
        .innerJoin(workout_exercises, eq(workout_exercise_sets.workout_exercise_id, workout_exercises.id))
        .innerJoin(workouts, eq(workout_exercises.workout_id, workouts.id))
        .where(and(
            eq(workouts.user_id, userId),
            eq(workout_exercise_sets.is_pr, 1),
            isNotNull(workouts.completed_at),
            isNull(workouts.deleted_at),
            isNull(workout_exercise_sets.deleted_at),
        ));

    const [bodyweightRow] = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(body_weight_entries)
        .where(and(
            eq(body_weight_entries.user_id, userId),
            isNull(body_weight_entries.deleted_at),
        ));

    return {
        volume: volumeRow?.total ?? 0,
        workouts: workoutRow?.count ?? 0,
        streak: longestStreak,
        pr: prRow?.count ?? 0,
        bodyweight: bodyweightRow?.count ?? 0,
        milestone: 1, // the seed metric is always satisfied
    };
}

function toAchievement(def: AchievementDef, value: number, persisted: boolean): Achievement {
    const unlocked = persisted || value >= def.threshold;
    const denom = def.threshold <= 0 ? 1 : def.threshold;
    return {
        ...def,
        unlocked,
        progress: value,
        progressPercent: unlocked ? 1 : Math.min(value / denom, 1),
    };
}

/**
 * Every achievement with its unlocked state (persisted OR currently met) and
 * live progress toward its threshold.
 */
export async function getAllAchievementsWithStatus(
    userId: string,
    currentStreak: number,
    longestStreak: number
): Promise<Achievement[]> {
    const [metrics, unlockedIds] = await Promise.all([
        getMetrics(userId, longestStreak),
        getUnlockedAchievementIds(userId),
    ]);

    return ACHIEVEMENTS.map(def =>
        toAchievement(def, metrics[def.category], unlockedIds.has(def.id))
    );
}

/**
 * Persist any achievements that are now met but not yet recorded, and return the
 * newly-unlocked ones (for toasts). Replaces the old previous-vs-current diff.
 */
export async function syncUnlockedAchievements(
    userId: string,
    currentStreak: number,
    longestStreak: number
): Promise<Achievement[]> {
    const [metrics, unlockedIds] = await Promise.all([
        getMetrics(userId, longestStreak),
        getUnlockedAchievementIds(userId),
    ]);

    const newlyUnlocked = ACHIEVEMENTS.filter(
        def => !unlockedIds.has(def.id) && metrics[def.category] >= def.threshold
    );

    if (newlyUnlocked.length > 0) {
        await unlockAchievements(userId, newlyUnlocked.map(a => a.id));
    }

    return newlyUnlocked.map(def => toAchievement(def, metrics[def.category], true));
}
