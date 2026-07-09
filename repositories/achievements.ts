import { db } from '@/db/client';
import { workout_exercise_sets, workout_exercises, workouts } from '@/db/schema';
import { and, eq, isNull, isNotNull, sql } from 'drizzle-orm';

export interface Achievement {
    id: string;
    title: string;
    description: string;
    icon: string;
    category: 'volume' | 'workouts' | 'streak';
    threshold: number;
    unlocked: boolean;
}

export const ACHIEVEMENTS: Omit<Achievement, 'unlocked'>[] = [
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
];

export async function getAllAchievementsWithStatus(
    userId: string,
    currentStreak: number,
    longestStreak: number
): Promise<Achievement[]> {
    // Get total volume
    const [volumeResult] = await db
        .select({
            total: sql<number>`COALESCE(SUM(${workout_exercise_sets.weight} * ${workout_exercise_sets.reps}), 0)`,
        })
        .from(workout_exercise_sets)
        .innerJoin(workout_exercises, eq(workout_exercise_sets.workout_exercise_id, workout_exercises.id))
        .innerJoin(workouts, eq(workout_exercises.workout_id, workouts.id))
        .where(
            and(
                eq(workouts.user_id, userId),
                isNotNull(workouts.completed_at),
                isNull(workouts.deleted_at),
                isNull(workout_exercise_sets.deleted_at),
                isNotNull(workout_exercise_sets.weight),
            )
        );

    const totalVolume = volumeResult?.total ?? 0;

    // Get total workout count
    const [countResult] = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(workouts)
        .where(
            and(
                eq(workouts.user_id, userId),
                isNotNull(workouts.completed_at),
                isNull(workouts.deleted_at),
            )
        );

    const totalWorkouts = countResult?.count ?? 0;

    return ACHIEVEMENTS.map(achievement => {
        let unlocked = false;

        if (achievement.category === 'volume') {
            unlocked = totalVolume >= achievement.threshold;
        } else if (achievement.category === 'workouts') {
            unlocked = totalWorkouts >= achievement.threshold;
        } else if (achievement.category === 'streak') {
            unlocked = longestStreak >= achievement.threshold; // ✅ use longestStreak
        }

        return { ...achievement, unlocked };
    });

}

export async function checkAchievements(
    userId: string,
    currentStreak: number,
    previousWorkoutCount: number,
    previousVolume: number,
    previousStreak: number,
    longestStreak: number
): Promise<Achievement[]> {
    const all = await getAllAchievementsWithStatus(userId, currentStreak, longestStreak);

    // Return only achievements that are newly unlocked
    // i.e. unlocked now but wouldn't have been before this workout
    return all.filter(a => {
        if (!a.unlocked) return false;

        if (a.category === 'volume') return previousVolume < a.threshold;
        if (a.category === 'workouts') return previousWorkoutCount < a.threshold;
        if (a.category === 'streak') return previousStreak < a.threshold;

        return false;
    });
}