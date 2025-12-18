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
        const date = new Date(r.date);
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
        const date = new Date(r.date);
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
    limit: number = 10
): Promise<PersonalRecord[]> {
    const result = await db
        .select({
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
                isNull(workouts.deleted_at),
                isNull(workout_exercise_sets.deleted_at)
            )
        )
        .orderBy(desc(workouts.completed_at))
        .limit(limit);

    return result as PersonalRecord[];
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
    sets: ExerciseHistorySet[];
}

export async function getExerciseHistory(
    userId: string,
    exerciseId: string,
    limit: number = 20
): Promise<ExerciseHistoryWorkout[]> {
    const result = await db
        .select({
            workoutId: workouts.id,
            workoutName: workouts.name,
            completedAt: workouts.completed_at,
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
        .limit(limit * 10); // Fetch more to account for multiple sets per workout

    // Group by workout
    const workoutMap = new Map<string, ExerciseHistoryWorkout>();

    result.forEach((row) => {
        if (!workoutMap.has(row.workoutId)) {
            workoutMap.set(row.workoutId, {
                workoutId: row.workoutId,
                workoutName: row.workoutName,
                completedAt: row.completedAt!,
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

    // Convert to array and limit
    return Array.from(workoutMap.values())
        .slice(0, limit)
        .map(workout => ({
            ...workout,
            sets: workout.sets.sort((a, b) => a.setNumber - b.setNumber)
        }));
}