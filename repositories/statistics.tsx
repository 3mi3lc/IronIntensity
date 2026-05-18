// repositories/statistics.ts
import {db} from '@/db/client';
import {exercises, workout_exercise_sets, workout_exercises, workouts,} from '@/db/schema';
import {and, desc, eq, gte, isNotNull, isNull, lte, sql} from 'drizzle-orm';

// ==================== BASIC STATS ====================

export async function getTotalWorkouts(
    userId: string,
    startDate: string,
    endDate: string
): Promise<number> {
    const result = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(workouts)
        .where(
            and(
                eq(workouts.user_id, userId),
                isNotNull(workouts.completed_at),
                gte(workouts.completed_at, startDate),
                lte(workouts.completed_at, endDate),
                isNull(workouts.deleted_at)
            )
        );

    return result[0]?.count || 0;
}

export async function getTotalVolume(
    userId: string,
    startDate: string,
    endDate: string
): Promise<number> {
    const result = await db
        .select({
            totalVolume: sql<number>`COALESCE(SUM(${workout_exercise_sets.weight} * ${workout_exercise_sets.reps}), 0)`
        })
        .from(workout_exercise_sets)
        .innerJoin(
            workout_exercises,
            eq(workout_exercise_sets.workout_exercise_id, workout_exercises.id)
        )
        .innerJoin(workouts, eq(workout_exercises.workout_id, workouts.id))
        .where(
            and(
                eq(workouts.user_id, userId),
                isNotNull(workouts.completed_at),
                gte(workouts.completed_at, startDate),
                lte(workouts.completed_at, endDate),
                isNull(workouts.deleted_at),
                isNull(workout_exercise_sets.deleted_at)
            )
        );

    return Math.round(result[0]?.totalVolume || 0);
}

export async function getWorkoutStreak(userId: string): Promise<{ current: number; longest: number }> {
    const result = await db
        .select({
            week: sql<string>`strftime('%Y-%W', ${workouts.completed_at})`,
        })
        .from(workouts)
        .where(
            and(
                eq(workouts.user_id, userId),
                isNotNull(workouts.completed_at),
                isNull(workouts.deleted_at)
            )
        )
        .groupBy(sql`strftime('%Y-%W', ${workouts.completed_at})`)
        .orderBy(sql`strftime('%Y-%W', ${workouts.completed_at})`);

    if (result.length === 0) return { current: 0, longest: 0 };

    // Parse each week into a number of weeks since a fixed point
    const toWeekNumber = (weekStr: string): number => {
        const [year, week] = weekStr.split('-').map(Number);
        return year * 53 + week; // 53 weeks per year max
    };

    const weeks = result.map(r => toWeekNumber(r.week));

    // Calculate longest streak
    let longest = 1;
    let streak = 1;
    for (let i = 1; i < weeks.length; i++) {
        if (weeks[i] - weeks[i - 1] === 1) {
            streak++;
            longest = Math.max(longest, streak);
        } else {
            streak = 1;
        }
    }
    longest = Math.max(longest, streak);

    // Check if streak is still active (workout this week or last week)
    const now = new Date();
    const thisWeekStr = `${now.getFullYear()}-${String(
        Math.ceil((((now.getTime() - new Date(now.getFullYear(), 0, 1).getTime()) / 86400000)
            + new Date(now.getFullYear(), 0, 1).getDay() + 1) / 7)
    ).padStart(2, '0')}`;
    const thisWeekNum = toWeekNumber(thisWeekStr);
    const lastWeekNum = thisWeekNum - 1;
    const lastWorkoutWeek = weeks[weeks.length - 1];

    if (lastWorkoutWeek !== thisWeekNum && lastWorkoutWeek !== lastWeekNum) {
        return { current: 0, longest };
    }

    // Count back current streak
    let current = 1;
    for (let i = weeks.length - 1; i > 0; i--) {
        if (weeks[i] - weeks[i - 1] === 1) {
            current++;
        } else {
            break;
        }
    }

    return { current, longest };
}

// ==================== VOLUME BY TIME PERIOD ====================

interface VolumeDataPoint {
    date: string;
    volume: number;
}

export async function getVolumeByDay(
    userId: string,
    startDate: string,
    endDate: string
): Promise<VolumeDataPoint[]> {
    const result = await db
        .select({
            date: sql<string>`DATE(${workouts.completed_at})`,
            volume: sql<number>`COALESCE(SUM(${workout_exercise_sets.weight} * ${workout_exercise_sets.reps}), 0)`
        })
        .from(workout_exercise_sets)
        .innerJoin(
            workout_exercises,
            eq(workout_exercise_sets.workout_exercise_id, workout_exercises.id)
        )
        .innerJoin(workouts, eq(workout_exercises.workout_id, workouts.id))
        .where(
            and(
                eq(workouts.user_id, userId),
                isNotNull(workouts.completed_at),
                gte(workouts.completed_at, startDate),
                lte(workouts.completed_at, endDate),
                isNull(workouts.deleted_at),
                isNull(workout_exercise_sets.deleted_at)
            )
        )
        .groupBy(sql`DATE(${workouts.completed_at})`)
        .orderBy(sql`DATE(${workouts.completed_at})`);

    return result.map(r => ({
        date: r.date,
        volume: Math.round(r.volume)
    }));
}

export async function getVolumeByWeek(
    userId: string,
    startDate: string,
    endDate: string
): Promise<VolumeDataPoint[]> {
    const result = await db
        .select({
            date: sql<string>`strftime('%Y-W%W', ${workouts.completed_at})`,
            volume: sql<number>`COALESCE(SUM(${workout_exercise_sets.weight} * ${workout_exercise_sets.reps}), 0)`
        })
        .from(workout_exercise_sets)
        .innerJoin(
            workout_exercises,
            eq(workout_exercise_sets.workout_exercise_id, workout_exercises.id)
        )
        .innerJoin(workouts, eq(workout_exercises.workout_id, workouts.id))
        .where(
            and(
                eq(workouts.user_id, userId),
                isNotNull(workouts.completed_at),
                gte(workouts.completed_at, startDate),
                lte(workouts.completed_at, endDate),
                isNull(workouts.deleted_at),
                isNull(workout_exercise_sets.deleted_at)
            )
        )
        .groupBy(sql`strftime('%Y-W%W', ${workouts.completed_at})`)
        .orderBy(sql`strftime('%Y-W%W', ${workouts.completed_at})`);

    return result.map(r => ({
        date: r.date,
        volume: Math.round(r.volume)
    }));
}

export async function getVolumeByMonth(
    userId: string,
    startDate: string,
    endDate: string
): Promise<VolumeDataPoint[]> {
    const result = await db
        .select({
            date: sql<string>`strftime('%Y-%m', ${workouts.completed_at})`,
            volume: sql<number>`COALESCE(SUM(${workout_exercise_sets.weight} * ${workout_exercise_sets.reps}), 0)`
        })
        .from(workout_exercise_sets)
        .innerJoin(
            workout_exercises,
            eq(workout_exercise_sets.workout_exercise_id, workout_exercises.id)
        )
        .innerJoin(workouts, eq(workout_exercises.workout_id, workouts.id))
        .where(
            and(
                eq(workouts.user_id, userId),
                isNotNull(workouts.completed_at),
                gte(workouts.completed_at, startDate),
                lte(workouts.completed_at, endDate),
                isNull(workouts.deleted_at),
                isNull(workout_exercise_sets.deleted_at)
            )
        )
        .groupBy(sql`strftime('%Y-%m', ${workouts.completed_at})`)
        .orderBy(sql`strftime('%Y-%m', ${workouts.completed_at})`);

    return result.map(r => ({
        date: r.date,
        volume: Math.round(r.volume)
    }));
}

// ==================== WORKOUTS BY TIME PERIOD ====================

interface WorkoutDataPoint {
    date: string;
    count: number;
}

export async function getWorkoutsByDay(
    userId: string,
    startDate: string,
    endDate: string
): Promise<WorkoutDataPoint[]> {
    return db
        .select({
            date: sql<string>`DATE(
            ${workouts.completed_at}
            )`,
            count: sql<number>`COUNT(*)`
        })
        .from(workouts)
        .where(
            and(
                eq(workouts.user_id, userId),
                isNotNull(workouts.completed_at),
                gte(workouts.completed_at, startDate),
                lte(workouts.completed_at, endDate),
                isNull(workouts.deleted_at)
            )
        )
        .groupBy(sql`DATE(
        ${workouts.completed_at}
        )`)
        .orderBy(sql`DATE(
        ${workouts.completed_at}
        )`);
}

export async function getWorkoutsByWeek(
    userId: string,
    startDate: string,
    endDate: string
): Promise<WorkoutDataPoint[]> {
    return db
        .select({
            date: sql<string>`strftime
            ('%Y-W%W',
            ${workouts.completed_at}
            )`,
            count: sql<number>`COUNT(*)`
        })
        .from(workouts)
        .where(
            and(
                eq(workouts.user_id, userId),
                isNotNull(workouts.completed_at),
                gte(workouts.completed_at, startDate),
                lte(workouts.completed_at, endDate),
                isNull(workouts.deleted_at)
            )
        )
        .groupBy(sql`strftime
        ('%Y-W%W',
        ${workouts.completed_at}
        )`)
        .orderBy(sql`strftime
        ('%Y-W%W',
        ${workouts.completed_at}
        )`);
}

// ==================== TOP EXERCISES ====================

interface TopExercise {
    exerciseId: string;
    exerciseName: string;
    totalVolume: number;
}

export async function getTopExercisesByVolume(
    userId: string,
    startDate: string,
    endDate: string,
    limit: number = 10
): Promise<TopExercise[]> {
    const result = await db
        .select({
            exerciseId: exercises.id,
            exerciseName: exercises.name,
            totalVolume: sql<number>`COALESCE(SUM(${workout_exercise_sets.weight} * ${workout_exercise_sets.reps}), 0)`
        })
        .from(workout_exercise_sets)
        .innerJoin(
            workout_exercises,
            eq(workout_exercise_sets.workout_exercise_id, workout_exercises.id)
        )
        .innerJoin(workouts, eq(workout_exercises.workout_id, workouts.id))
        .innerJoin(exercises, eq(workout_exercises.exercise_id, exercises.id))
        .where(
            and(
                eq(workouts.user_id, userId),
                isNotNull(workouts.completed_at),
                gte(workouts.completed_at, startDate),
                lte(workouts.completed_at, endDate),
                isNull(workouts.deleted_at),
                isNull(workout_exercise_sets.deleted_at),
                isNull(exercises.deleted_at)
            )
        )
        .groupBy(exercises.id, exercises.name)
        .orderBy(desc(sql`SUM(${workout_exercise_sets.weight} * ${workout_exercise_sets.reps})`))
        .limit(limit);

    return result.map(r => ({
        exerciseId: r.exerciseId,
        exerciseName: r.exerciseName,
        totalVolume: Math.round(r.totalVolume)
    }));
}

// ==================== EXERCISE-SPECIFIC STATS ====================

interface ChartDataPoint {
    labels: string[];
    data: number[];
}

export async function getExerciseVolumeByDay(
    userId: string,
    exerciseId: string,
    startDate: string,
    endDate: string
): Promise<ChartDataPoint> {
    const result = await db
        .select({
            date: sql<string>`DATE(${workouts.completed_at})`,
            volume: sql<number>`COALESCE(SUM(${workout_exercise_sets.weight} * ${workout_exercise_sets.reps}), 0)`
        })
        .from(workout_exercise_sets)
        .innerJoin(
            workout_exercises,
            eq(workout_exercise_sets.workout_exercise_id, workout_exercises.id)
        )
        .innerJoin(workouts, eq(workout_exercises.workout_id, workouts.id))
        .where(
            and(
                eq(workouts.user_id, userId),
                eq(workout_exercises.exercise_id, exerciseId),
                isNotNull(workouts.completed_at),
                gte(workouts.completed_at, startDate),
                lte(workouts.completed_at, endDate),
                isNull(workouts.deleted_at),
                isNull(workout_exercise_sets.deleted_at)
            )
        )
        .groupBy(sql`DATE(${workouts.completed_at})`)
        .orderBy(sql`DATE(${workouts.completed_at})`);

    if (result.length === 0) {
        return { labels: [], data: [] };
    }

    const labels = result.map(r => {
        const date = new Date(r.date + 'T00:00:00');
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    });

    const data = result.map(r => Math.round(r.volume));

    return { labels, data };
}

export async function getExerciseMaxWeightByDay(
    userId: string,
    exerciseId: string,
    startDate: string,
    endDate: string
): Promise<ChartDataPoint> {
    const result = await db
        .select({
            date: sql<string>`DATE(${workouts.completed_at})`,
            maxWeight: sql<number>`MAX(${workout_exercise_sets.weight})`
        })
        .from(workout_exercise_sets)
        .innerJoin(
            workout_exercises,
            eq(workout_exercise_sets.workout_exercise_id, workout_exercises.id)
        )
        .innerJoin(workouts, eq(workout_exercises.workout_id, workouts.id))
        .where(
            and(
                eq(workouts.user_id, userId),
                eq(workout_exercises.exercise_id, exerciseId),
                isNotNull(workouts.completed_at),
                isNotNull(workout_exercise_sets.weight),
                gte(workouts.completed_at, startDate),
                lte(workouts.completed_at, endDate),
                isNull(workouts.deleted_at),
                isNull(workout_exercise_sets.deleted_at)
            )
        )
        .groupBy(sql`DATE(${workouts.completed_at})`)
        .orderBy(sql`DATE(${workouts.completed_at})`);

    if (result.length === 0) {
        return { labels: [], data: [] };
    }

    const labels = result.map(r => {
        const date = new Date(r.date + 'T00:00:00');
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    });

    const data = result.map(r => r.maxWeight);

    return { labels, data };
}

// ==================== PERSONAL RECORDS ====================

interface PersonalRecord {
    exerciseName: string;
    weight: number;
    reps: number;
    completedAt: string;
    workoutName: string;
}

export async function getRecentPRs(
    userId: string,
    startDate: string,
    endDate: string
): Promise<PersonalRecord[]> {
    const result = await db
        .select({
            exerciseId: exercises.id,
            exerciseName: exercises.name,
            weight: workout_exercise_sets.weight,
            reps: workout_exercise_sets.reps,
            completedAt: workouts.completed_at,
            workoutName: workouts.name,
        })
        .from(workout_exercise_sets)
        .innerJoin(
            workout_exercises,
            eq(workout_exercise_sets.workout_exercise_id, workout_exercises.id)
        )
        .innerJoin(workouts, eq(workout_exercises.workout_id, workouts.id))
        .innerJoin(exercises, eq(workout_exercises.exercise_id, exercises.id))
        .where(
            and(
                eq(workouts.user_id, userId),
                eq(workout_exercise_sets.is_pr, 1),
                isNotNull(workouts.completed_at),
                gte(workouts.completed_at, startDate),
                lte(workouts.completed_at, endDate),
                isNull(workouts.deleted_at),
                isNull(workout_exercise_sets.deleted_at)
            )
        )
        // Most recent workout first; within the same workout, heaviest set first
        .orderBy(desc(workouts.completed_at), desc(workout_exercise_sets.weight));

    // One entry per exercise — first row is the most recent PR (and heaviest within that workout)
    const seen = new Set<string>();
    return result.filter(row => {
        if (seen.has(row.exerciseId)) return false;
        seen.add(row.exerciseId);
        return true;
    }) as PersonalRecord[];
}

// ==================== COMPARISON DATA ====================

export async function getVolumeComparison(
    userId: string,
    currentStartDate: string,
    currentEndDate: string,
    previousStartDate: string,
    previousEndDate: string
): Promise<{ current: number; previous: number; changePercent: number }> {
    const current = await getTotalVolume(userId, currentStartDate, currentEndDate);
    const previous = await getTotalVolume(userId, previousStartDate, previousEndDate);

    const changePercent = previous > 0 ? Math.round(((current - previous) / previous) * 100) : 0;

    return {
        current,
        previous,
        changePercent
    };
}

export async function getWorkoutCountComparison(
    userId: string,
    currentStartDate: string,
    currentEndDate: string,
    previousStartDate: string,
    previousEndDate: string
): Promise<{ current: number; previous: number; change: number }> {
    const current = await getTotalWorkouts(userId, currentStartDate, currentEndDate);
    const previous = await getTotalWorkouts(userId, previousStartDate, previousEndDate);

    return {
        current,
        previous,
        change: current - previous
    };
}

export async function getCumulativeVolumeByDay(
    userId: string,
    startDate: string,
    endDate: string
): Promise<VolumeDataPoint[]> {
    const dailyVolumes = await getVolumeByDay(userId, startDate, endDate);

    // Convert to cumulative
    let cumulative = 0;
    return dailyVolumes.map(point => {
        cumulative += point.volume;
        return {
            date: point.date,
            volume: cumulative
        };
    });
}

export async function getCumulativeVolumeByWeek(
    userId: string,
    startDate: string,
    endDate: string
): Promise<VolumeDataPoint[]> {
    const weeklyVolumes = await getVolumeByWeek(userId, startDate, endDate);

    let cumulative = 0;
    return weeklyVolumes.map(point => {
        cumulative += point.volume;
        return {
            date: point.date,
            volume: cumulative
        };
    });
}

export async function getCumulativeVolumeByMonth(
    userId: string,
    startDate: string,
    endDate: string
): Promise<VolumeDataPoint[]> {
    const monthlyVolumes = await getVolumeByMonth(userId, startDate, endDate);

    let cumulative = 0;
    return monthlyVolumes.map(point => {
        cumulative += point.volume;
        return {
            date: point.date,
            volume: cumulative
        };
    });
}

// ==================== CUMULATIVE WORKOUTS ====================

export async function getCumulativeWorkoutsByDay(
    userId: string,
    startDate: string,
    endDate: string
): Promise<WorkoutDataPoint[]> {
    const dailyWorkouts = await getWorkoutsByDay(userId, startDate, endDate);

    let cumulative = 0;
    return dailyWorkouts.map(point => {
        cumulative += point.count;
        return {
            date: point.date,
            count: cumulative
        };
    });
}

export async function getCumulativeWorkoutsByWeek(
    userId: string,
    startDate: string,
    endDate: string
): Promise<WorkoutDataPoint[]> {
    const weeklyWorkouts = await getWorkoutsByWeek(userId, startDate, endDate);

    let cumulative = 0;
    return weeklyWorkouts.map(point => {
        cumulative += point.count;
        return {
            date: point.date,
            count: cumulative
        };
    });
}

// ==================== EXERCISE HISTORY ====================

interface ExerciseHistorySet {
    id: string;
    setNumber: number;
    reps: number;
    weight: number;
    isPr: boolean;
    createdAt: string;
}

interface ExerciseHistoryWorkout {
    workoutId: string;
    workoutName: string;
    completedAt: string;
    workoutCreatedAt: string;
    sets: ExerciseHistorySet[];
}

export async function getCumulativeWorkoutsByMonth(
    userId: string,
    startDate: string,
    endDate: string
): Promise<WorkoutDataPoint[]> {
    const result = await db
        .select({
            date: sql<string>`strftime('%Y-%m', ${workouts.completed_at})`,
            count: sql<number>`COUNT(*)`
        })
        .from(workouts)
        .where(
            and(
                eq(workouts.user_id, userId),
                isNotNull(workouts.completed_at),
                gte(workouts.completed_at, startDate),
                lte(workouts.completed_at, endDate),
                isNull(workouts.deleted_at)
            )
        )
        .groupBy(sql`strftime('%Y-%m', ${workouts.completed_at})`)
        .orderBy(sql`strftime('%Y-%m', ${workouts.completed_at})`);

    let cumulative = 0;
    return result.map(point => {
        cumulative += point.count;
        return { date: point.date, count: cumulative };
    });
}


export async function getExerciseHistory(
    userId: string,
    exerciseId: string,
): Promise<ExerciseHistoryWorkout[]> {
    const result = await db
        .select({
            workoutId: workouts.id,
            workoutName: workouts.name,
            completedAt: workouts.completed_at,
            workoutCreatedAt: workouts.created_at,
            setId: workout_exercise_sets.id,
            setNumber: workout_exercise_sets.set_number,
            reps: workout_exercise_sets.reps,
            weight: workout_exercise_sets.weight,
            isPr: workout_exercise_sets.is_pr,
            setCreatedAt: workout_exercise_sets.created_at,
        })
        .from(workout_exercise_sets)
        .innerJoin(
            workout_exercises,
            eq(workout_exercise_sets.workout_exercise_id, workout_exercises.id)
        )
        .innerJoin(workouts, eq(workout_exercises.workout_id, workouts.id))
        .where(
            and(
                eq(workouts.user_id, userId),
                eq(workout_exercises.exercise_id, exerciseId),
                isNotNull(workouts.completed_at),
                isNull(workouts.deleted_at),
                isNull(workout_exercise_sets.deleted_at)
            )
        )
        .orderBy(desc(workouts.completed_at), workout_exercise_sets.set_number)

    // Group by workout
    const workoutMap = new Map<string, ExerciseHistoryWorkout>();

    result.forEach((row) => {
        if (!workoutMap.has(row.workoutId)) {
            workoutMap.set(row.workoutId, {
                workoutId: row.workoutId,
                workoutName: row.workoutName,
                completedAt: row.completedAt!,
                workoutCreatedAt: row.workoutCreatedAt!,
                sets: [],
            });
        }

        const workout = workoutMap.get(row.workoutId)!;
        workout.sets.push({
            id: row.setId,
            setNumber: row.setNumber,
            reps: row.reps,
            weight: row.weight || 0,
            isPr: row.isPr === 1,
            createdAt: row.setCreatedAt || '',
        });
    });

    return Array.from(workoutMap.values())
        .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime())
        .slice(0) //  limit workouts, not rows
        .map(workout => ({
            ...workout,
            sets: workout.sets.sort((a, b) => a.setNumber - b.setNumber)
        }));
}