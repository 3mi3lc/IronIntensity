import { db } from '@/db/client';
import { body_weight_entries, exercise_body_parts, workout_exercise_sets, workout_exercises, workouts } from '@/db/schema';
import { and, eq, isNull, isNotNull, sql } from 'drizzle-orm';
import { getUnlockedAchievementIds, getUnlockedAchievementMap, unlockAchievements } from '@/repositories/userAchievements';

export type AchievementCategory =
    | 'volume' | 'workouts' | 'streak' | 'pr' | 'bodyweight'
    | 'variety' | 'strength' | 'reps' | 'muscles' | 'milestone';

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
    /** When this badge was recorded as unlocked (null if unlocked only by live metric, not yet persisted). */
    unlockedAt: string | null;
    /** Current value of this achievement's metric (e.g. workouts completed). */
    progress: number;
    /** progress toward the threshold, clamped to 0..1 (1 once unlocked). */
    progressPercent: number;
}

export const ACHIEVEMENTS: AchievementDef[] = [
    // Getting started (always unlocked — the board never reads 0%)
    { id: 'welcome', title: 'Welcome Aboard', description: 'Created your account', icon: '🎉', category: 'milestone', threshold: 0 },

    // Volume (total kg lifted)
    { id: 'volume_1k', title: 'First Steps', description: 'Lift 1,000 kg total', icon: '🥉', category: 'volume', threshold: 1000 },
    { id: 'volume_5k', title: 'Warming Up', description: 'Lift 5,000 kg total', icon: '🏋️', category: 'volume', threshold: 5000 },
    { id: 'volume_10k', title: 'Getting Serious', description: 'Lift 10,000 kg total', icon: '🥈', category: 'volume', threshold: 10000 },
    { id: 'volume_25k', title: 'Iron Appetite', description: 'Lift 25,000 kg total', icon: '⚙️', category: 'volume', threshold: 25000 },
    { id: 'volume_50k', title: 'Dedicated Lifter', description: 'Lift 50,000 kg total', icon: '🥇', category: 'volume', threshold: 50000 },
    { id: 'volume_100k', title: 'Iron Warrior', description: 'Lift 100,000 kg total', icon: '💪', category: 'volume', threshold: 100000 },
    { id: 'volume_250k', title: 'Powerhouse', description: 'Lift 250,000 kg total', icon: '🛡️', category: 'volume', threshold: 250000 },
    { id: 'volume_500k', title: 'Elite Athlete', description: 'Lift 500,000 kg total', icon: '🏆', category: 'volume', threshold: 500000 },
    { id: 'volume_1m', title: 'Iron Legend', description: 'Lift 1,000,000 kg total', icon: '👑', category: 'volume', threshold: 1000000 },
    { id: 'volume_2m', title: 'Beyond Limits', description: 'Lift 2,000,000 kg total', icon: '🌟', category: 'volume', threshold: 2000000 },

    // Workouts (completed)
    { id: 'workouts_5', title: 'First Five', description: 'Complete 5 workouts', icon: '🌟', category: 'workouts', threshold: 5 },
    { id: 'workouts_10', title: 'Just Getting Started', description: 'Complete 10 workouts', icon: '🌱', category: 'workouts', threshold: 10 },
    { id: 'workouts_25', title: 'Building Habits', description: 'Complete 25 workouts', icon: '⚡', category: 'workouts', threshold: 25 },
    { id: 'workouts_50', title: 'Consistent', description: 'Complete 50 workouts', icon: '🔥', category: 'workouts', threshold: 50 },
    { id: 'workouts_75', title: 'Grinding', description: 'Complete 75 workouts', icon: '⚙️', category: 'workouts', threshold: 75 },
    { id: 'workouts_100', title: 'Century Club', description: 'Complete 100 workouts', icon: '💎', category: 'workouts', threshold: 100 },
    { id: 'workouts_150', title: 'Seasoned', description: 'Complete 150 workouts', icon: '🏋️', category: 'workouts', threshold: 150 },
    { id: 'workouts_250', title: 'Unstoppable', description: 'Complete 250 workouts', icon: '🚀', category: 'workouts', threshold: 250 },
    { id: 'workouts_500', title: 'Iron Veteran', description: 'Complete 500 workouts', icon: '👑', category: 'workouts', threshold: 500 },
    { id: 'workouts_750', title: 'Iron Master', description: 'Complete 750 workouts', icon: '🏅', category: 'workouts', threshold: 750 },

    // Streak (consecutive weeks)
    { id: 'streak_2', title: 'Two in a Row', description: '2 week streak', icon: '📆', category: 'streak', threshold: 2 },
    { id: 'streak_4', title: 'Month Warrior', description: '4 week streak', icon: '📅', category: 'streak', threshold: 4 },
    { id: 'streak_6', title: 'Six Week Surge', description: '6 week streak', icon: '🔥', category: 'streak', threshold: 6 },
    { id: 'streak_8', title: 'Two Month Streak', description: '8 week streak', icon: '🌊', category: 'streak', threshold: 8 },
    { id: 'streak_12', title: 'Quarter Year', description: '12 week streak', icon: '⚡', category: 'streak', threshold: 12 },
    { id: 'streak_16', title: 'Four Months Strong', description: '16 week streak', icon: '🗓️', category: 'streak', threshold: 16 },
    { id: 'streak_26', title: 'Half Year Strong', description: '26 week streak', icon: '💪', category: 'streak', threshold: 26 },
    { id: 'streak_52', title: 'Full Year Grind', description: '52 week streak', icon: '👑', category: 'streak', threshold: 52 },
    { id: 'streak_78', title: 'Eighteen Months', description: '78 week streak', icon: '🌟', category: 'streak', threshold: 78 },

    // Personal records (number of PR sets)
    { id: 'pr_1', title: 'First PR', description: 'Set your first personal record', icon: '🎯', category: 'pr', threshold: 1 },
    { id: 'pr_3', title: 'On a Roll', description: 'Set 3 personal records', icon: '✨', category: 'pr', threshold: 3 },
    { id: 'pr_5', title: 'Getting Stronger', description: 'Set 5 personal records', icon: '💪', category: 'pr', threshold: 5 },
    { id: 'pr_10', title: 'Record Breaker', description: 'Set 10 personal records', icon: '🏅', category: 'pr', threshold: 10 },
    { id: 'pr_15', title: 'Breaking Barriers', description: 'Set 15 personal records', icon: '🚧', category: 'pr', threshold: 15 },
    { id: 'pr_25', title: 'PR Machine', description: 'Set 25 personal records', icon: '🔥', category: 'pr', threshold: 25 },
    { id: 'pr_50', title: 'Peak Performer', description: 'Set 50 personal records', icon: '💥', category: 'pr', threshold: 50 },
    { id: 'pr_75', title: 'Relentless', description: 'Set 75 personal records', icon: '⚡', category: 'pr', threshold: 75 },
    { id: 'pr_100', title: 'Record Hunter', description: 'Set 100 personal records', icon: '🏆', category: 'pr', threshold: 100 },
    { id: 'pr_200', title: 'Limitless', description: 'Set 200 personal records', icon: '👑', category: 'pr', threshold: 200 },
    { id: 'pr_300', title: 'Unbreakable', description: 'Set 300 personal records', icon: '💎', category: 'pr', threshold: 300 },

    // Bodyweight tracking (number of entries)
    { id: 'bw_1', title: 'Step on the Scale', description: 'Log your bodyweight for the first time', icon: '⚖️', category: 'bodyweight', threshold: 1 },
    { id: 'bw_3', title: 'Getting the Habit', description: 'Log your bodyweight 3 times', icon: '📝', category: 'bodyweight', threshold: 3 },
    { id: 'bw_5', title: 'Checking In', description: 'Log your bodyweight 5 times', icon: '📋', category: 'bodyweight', threshold: 5 },
    { id: 'bw_10', title: 'Tracking Progress', description: 'Log your bodyweight 10 times', icon: '📊', category: 'bodyweight', threshold: 10 },
    { id: 'bw_15', title: 'Staying Accountable', description: 'Log your bodyweight 15 times', icon: '✅', category: 'bodyweight', threshold: 15 },
    { id: 'bw_25', title: 'Data Driven', description: 'Log your bodyweight 25 times', icon: '📈', category: 'bodyweight', threshold: 25 },
    { id: 'bw_50', title: 'Consistency Counts', description: 'Log your bodyweight 50 times', icon: '🎯', category: 'bodyweight', threshold: 50 },
    { id: 'bw_100', title: 'Scale Master', description: 'Log your bodyweight 100 times', icon: '🏆', category: 'bodyweight', threshold: 100 },
    { id: 'bw_150', title: 'Weigh Warrior', description: 'Log your bodyweight 150 times', icon: '👑', category: 'bodyweight', threshold: 150 },

    // Exercise variety (distinct exercises performed)
    { id: 'variety_5', title: 'Explorer', description: 'Perform 5 different exercises', icon: '🧭', category: 'variety', threshold: 5 },
    { id: 'variety_10', title: 'Well Rounded', description: 'Perform 10 different exercises', icon: '🎨', category: 'variety', threshold: 10 },
    { id: 'variety_15', title: 'Versatile', description: 'Perform 15 different exercises', icon: '🤹', category: 'variety', threshold: 15 },
    { id: 'variety_20', title: 'Broad Horizons', description: 'Perform 20 different exercises', icon: '🌐', category: 'variety', threshold: 20 },
    { id: 'variety_25', title: 'Jack of All Lifts', description: 'Perform 25 different exercises', icon: '🃏', category: 'variety', threshold: 25 },
    { id: 'variety_30', title: 'Movement Collector', description: 'Perform 30 different exercises', icon: '🎪', category: 'variety', threshold: 30 },
    { id: 'variety_40', title: 'Exercise Encyclopedia', description: 'Perform 40 different exercises', icon: '📚', category: 'variety', threshold: 40 },
    { id: 'variety_50', title: 'Master of Movements', description: 'Perform 50 different exercises', icon: '🎓', category: 'variety', threshold: 50 },
    { id: 'variety_75', title: 'Living Exercise Library', description: 'Perform 75 different exercises', icon: '🏛️', category: 'variety', threshold: 75 },

    // Strength (heaviest single set, kg)
    { id: 'strength_40', title: 'Lift Off', description: 'Lift 40 kg in a single set', icon: '🪶', category: 'strength', threshold: 40 },
    { id: 'strength_60', title: 'Warmed Up', description: 'Lift 60 kg in a single set', icon: '💪', category: 'strength', threshold: 60 },
    { id: 'strength_80', title: 'Strong', description: 'Lift 80 kg in a single set', icon: '🏋️', category: 'strength', threshold: 80 },
    { id: 'strength_100', title: 'Triple Digits', description: 'Lift 100 kg in a single set', icon: '💯', category: 'strength', threshold: 100 },
    { id: 'strength_120', title: 'Powerful', description: 'Lift 120 kg in a single set', icon: '⚡', category: 'strength', threshold: 120 },
    { id: 'strength_140', title: 'Beast Mode', description: 'Lift 140 kg in a single set', icon: '🦍', category: 'strength', threshold: 140 },
    { id: 'strength_160', title: 'Powerlifter', description: 'Lift 160 kg in a single set', icon: '🏆', category: 'strength', threshold: 160 },
    { id: 'strength_180', title: 'Superhuman', description: 'Lift 180 kg in a single set', icon: '🦸', category: 'strength', threshold: 180 },
    { id: 'strength_200', title: 'Iron Titan', description: 'Lift 200 kg in a single set', icon: '🗿', category: 'strength', threshold: 200 },
    { id: 'strength_225', title: 'Crushing It', description: 'Lift 225 kg in a single set', icon: '💥', category: 'strength', threshold: 225 },
    { id: 'strength_250', title: 'Unreal', description: 'Lift 250 kg in a single set', icon: '🌟', category: 'strength', threshold: 250 },
    { id: 'strength_300', title: 'Godlike', description: 'Lift 300 kg in a single set', icon: '👑', category: 'strength', threshold: 300 },

    // Total reps (cumulative)
    { id: 'reps_500', title: 'Rep Rookie', description: 'Complete 500 total reps', icon: '🔢', category: 'reps', threshold: 500 },
    { id: 'reps_1k', title: 'Rep Collector', description: 'Complete 1,000 total reps', icon: '🧮', category: 'reps', threshold: 1000 },
    { id: 'reps_5k', title: 'Rep Grinder', description: 'Complete 5,000 total reps', icon: '⚙️', category: 'reps', threshold: 5000 },
    { id: 'reps_10k', title: 'Rep Machine', description: 'Complete 10,000 total reps', icon: '🤖', category: 'reps', threshold: 10000 },
    { id: 'reps_25k', title: 'Rep Beast', description: 'Complete 25,000 total reps', icon: '🐘', category: 'reps', threshold: 25000 },
    { id: 'reps_50k', title: 'Rep Legend', description: 'Complete 50,000 total reps', icon: '🏆', category: 'reps', threshold: 50000 },
    { id: 'reps_100k', title: 'Rep Immortal', description: 'Complete 100,000 total reps', icon: '👑', category: 'reps', threshold: 100000 },

    // Muscle coverage (distinct body parts trained)
    { id: 'muscles_3', title: 'Getting Balanced', description: 'Train 3 different muscle groups', icon: '🧩', category: 'muscles', threshold: 3 },
    { id: 'muscles_5', title: 'Full Body Focus', description: 'Train 5 different muscle groups', icon: '🎯', category: 'muscles', threshold: 5 },
    { id: 'muscles_8', title: 'Well Developed', description: 'Train 8 different muscle groups', icon: '🏗️', category: 'muscles', threshold: 8 },
    { id: 'muscles_12', title: 'Total Package', description: 'Train 12 different muscle groups', icon: '🗿', category: 'muscles', threshold: 12 },
    { id: 'muscles_16', title: 'Anatomy Master', description: 'Train 16 different muscle groups', icon: '🧬', category: 'muscles', threshold: 16 },
];

type Metrics = Record<AchievementCategory, number>;

/** Conditions restricting a set/exercise join to the user's completed, live workouts. */
const completedWorkoutSets = (userId: string) => [
    eq(workouts.user_id, userId),
    isNotNull(workouts.completed_at),
    isNull(workouts.deleted_at),
    isNull(workout_exercise_sets.deleted_at),
];

/** Current value of every achievement metric for a user. */
async function getMetrics(userId: string, longestStreak: number): Promise<Metrics> {
    const [volumeRow] = await db
        .select({ total: sql<number>`COALESCE(SUM(${workout_exercise_sets.weight} * ${workout_exercise_sets.reps}), 0)` })
        .from(workout_exercise_sets)
        .innerJoin(workout_exercises, eq(workout_exercise_sets.workout_exercise_id, workout_exercises.id))
        .innerJoin(workouts, eq(workout_exercises.workout_id, workouts.id))
        .where(and(...completedWorkoutSets(userId), isNotNull(workout_exercise_sets.weight)));

    const [workoutRow] = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(workouts)
        .where(and(eq(workouts.user_id, userId), isNotNull(workouts.completed_at), isNull(workouts.deleted_at)));

    const [prRow] = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(workout_exercise_sets)
        .innerJoin(workout_exercises, eq(workout_exercise_sets.workout_exercise_id, workout_exercises.id))
        .innerJoin(workouts, eq(workout_exercises.workout_id, workouts.id))
        .where(and(...completedWorkoutSets(userId), eq(workout_exercise_sets.is_pr, 1)));

    const [bodyweightRow] = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(body_weight_entries)
        .where(and(eq(body_weight_entries.user_id, userId), isNull(body_weight_entries.deleted_at)));

    const [strengthRow] = await db
        .select({ max: sql<number>`COALESCE(MAX(${workout_exercise_sets.weight}), 0)` })
        .from(workout_exercise_sets)
        .innerJoin(workout_exercises, eq(workout_exercise_sets.workout_exercise_id, workout_exercises.id))
        .innerJoin(workouts, eq(workout_exercises.workout_id, workouts.id))
        .where(and(...completedWorkoutSets(userId), isNotNull(workout_exercise_sets.weight)));

    const [repsRow] = await db
        .select({ total: sql<number>`COALESCE(SUM(${workout_exercise_sets.reps}), 0)` })
        .from(workout_exercise_sets)
        .innerJoin(workout_exercises, eq(workout_exercise_sets.workout_exercise_id, workout_exercises.id))
        .innerJoin(workouts, eq(workout_exercises.workout_id, workouts.id))
        .where(and(...completedWorkoutSets(userId)));

    const [varietyRow] = await db
        .select({ count: sql<number>`COUNT(DISTINCT ${workout_exercises.exercise_id})` })
        .from(workout_exercises)
        .innerJoin(workouts, eq(workout_exercises.workout_id, workouts.id))
        .where(and(
            eq(workouts.user_id, userId),
            isNotNull(workouts.completed_at),
            isNull(workouts.deleted_at),
            isNull(workout_exercises.deleted_at),
        ));

    const [musclesRow] = await db
        .select({ count: sql<number>`COUNT(DISTINCT ${exercise_body_parts.body_part_id})` })
        .from(workout_exercises)
        .innerJoin(workouts, eq(workout_exercises.workout_id, workouts.id))
        .innerJoin(exercise_body_parts, eq(exercise_body_parts.exercise_id, workout_exercises.exercise_id))
        .where(and(
            eq(workouts.user_id, userId),
            isNotNull(workouts.completed_at),
            isNull(workouts.deleted_at),
            isNull(workout_exercises.deleted_at),
            isNull(exercise_body_parts.deleted_at),
        ));

    return {
        volume: volumeRow?.total ?? 0,
        workouts: workoutRow?.count ?? 0,
        streak: longestStreak,
        pr: prRow?.count ?? 0,
        bodyweight: bodyweightRow?.count ?? 0,
        strength: strengthRow?.max ?? 0,
        reps: repsRow?.total ?? 0,
        variety: varietyRow?.count ?? 0,
        muscles: musclesRow?.count ?? 0,
        milestone: 1, // the seed metric is always satisfied
    };
}

function toAchievement(def: AchievementDef, value: number, unlockedAt: string | null): Achievement {
    const unlocked = unlockedAt !== null || value >= def.threshold;
    const denom = def.threshold <= 0 ? 1 : def.threshold;
    return {
        ...def,
        unlocked,
        unlockedAt,
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
    const [metrics, unlockedMap] = await Promise.all([
        getMetrics(userId, longestStreak),
        getUnlockedAchievementMap(userId),
    ]);

    return ACHIEVEMENTS.map(def =>
        toAchievement(def, metrics[def.category], unlockedMap.get(def.id) ?? null)
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

    const unlockedAt = new Date().toISOString();
    return newlyUnlocked.map(def => toAchievement(def, metrics[def.category], unlockedAt));
}
