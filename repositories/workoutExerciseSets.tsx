// src/repositories/workoutExerciseSets.ts
import { db } from '@/db/client';
import {workout_exercise_sets, workout_exercises, workouts} from '@/db/schema';
import { eq, and, isNull, isNotNull, lt , sql, desc, ne, inArray} from 'drizzle-orm';
import { newId, now } from '@/utils/id';
import { softDeleteFields, touch } from './_helpers';
import type {
    WorkoutExerciseSet,
    NewWorkoutExerciseSet,
} from './types';

export async function addSet(
    workoutExerciseId: string,
    data: Omit<
        NewWorkoutExerciseSet,
        'id' | 'set_number' | 'workout_exercise_id' | 'created_at' | 'updated_at' | 'is_synced'
    >,
    options?: { returnData?: boolean }
): Promise<WorkoutExerciseSet | boolean> {
    const id = newId();
    const ts = now();

    // First, get max set_number for this workoutExerciseId
    const [{ maxSet }] = await db
        .select({ maxSet: sql<number>`COALESCE(MAX(${workout_exercise_sets.set_number}), 0)` })
        .from(workout_exercise_sets)
        .where(and(eq(workout_exercise_sets.workout_exercise_id, workoutExerciseId), isNull(workout_exercise_sets.deleted_at) ));

    const query = db.insert(workout_exercise_sets).values({
        id,
        workout_exercise_id: workoutExerciseId,
        set_number: (maxSet ?? 0) + 1,
        created_at: ts,
        updated_at: ts,
        is_synced: 0,
        ...data,
    });

    if (options?.returnData) {
        const [insertedSet] = await query.returning();
        return insertedSet;
    }

    const result = await query;
    return result.changes > 0;
}

export async function updateSet(
    id: string,
    patch: Partial<Pick<NewWorkoutExerciseSet, 'reps' | 'weight' | 'set_number'>>,
    options?: { returnData?: boolean }
): Promise<WorkoutExerciseSet | boolean> {

    const query = db
        .update(workout_exercise_sets)
        .set({ ...patch, ...touch() })
        .where(eq(workout_exercise_sets.id, id));

    if (options?.returnData) {
        const [updatedSet] = await query.returning();
        return updatedSet ?? null;
    }

    const result = await query;
    return result.changes > 0;
}

export async function softDeleteSet(
    id: string,
    options?: { returnData?: boolean }
): Promise<WorkoutExerciseSet | boolean> {
    const ts = now();

    // First, fetch the set that we want to delete (to get workoutExerciseId and set_number)
    const [setToDelete] = await db
        .select()
        .from(workout_exercise_sets)
        .where(eq(workout_exercise_sets.id, id))
        .limit(1);

    if (!setToDelete) {
        // Set not found
        return options?.returnData ? false : false;
    }

    // Soft delete the set by updating deleted_at, updated_at, and is_synced
    const query = db
        .update(workout_exercise_sets)
        .set(softDeleteFields(ts))
        .where(eq(workout_exercise_sets.id, id));

    let deletedSet: WorkoutExerciseSet | null = null;

    if (options?.returnData) {
        [deletedSet] = await query.returning();
    } else {
        const result = await query;
        if (result.changes === 0) {
            return false;
        }
    }

    if (!setToDelete.workout_exercise_id) {
        // If this happens, either throw or return false because the logic depends on this ID
        return options?.returnData ? false : false;
    }

    // Now reorder sets: decrement set_number for all sets with set_number > deleted set's number and not deleted
    await db
        .update(workout_exercise_sets)
        .set({
            set_number: sql`set_number - 1`,
            updated_at: ts,
            is_synced: 0,
        })
        .where(
            and(
                eq(workout_exercise_sets.workout_exercise_id, setToDelete.workout_exercise_id),
                sql`set_number > ${setToDelete.set_number}`,
                isNull(workout_exercise_sets.deleted_at)
            )
        );

    if (options?.returnData) {
        return deletedSet ?? false;  // return the deletedSet or false if none found
    }
    return true;
}

export async function getHistoricalSetsForExercise(
    exerciseId: string,
    excludeWorkoutId?: string
): Promise<Array<{ setNumber: number; reps: number; weight: number }> | null> {
    try {
        console.log('Step 1: Looking for most recent workout with exercise:', exerciseId, 'excluding:', excludeWorkoutId);

        // Build the where conditions
        const whereConditions = [
            eq(workout_exercises.exercise_id, exerciseId),
            isNull(workouts.deleted_at),
            isNull(workout_exercises.deleted_at)
        ];

        // Exclude the current workout if provided
        if (excludeWorkoutId) {
            whereConditions.push(ne(workouts.id, excludeWorkoutId));
        }

        // Get the most recent workout that contains this exercise
        const recentWorkouts = await db
            .select({
                workoutId: workouts.id,
                workoutCreatedAt: workouts.created_at,
                workoutName: workouts.name,
            })
            .from(workouts)
            .innerJoin(
                workout_exercises,
                eq(workout_exercises.workout_id, workouts.id)
            )
            .where(and(...whereConditions))
            .orderBy(desc(workouts.created_at))
            .limit(5);

        console.log('Recent workouts found:', recentWorkouts);

        if (recentWorkouts.length === 0) {
            console.log('No workouts found for this exercise');
            return null;
        }

        const mostRecentWorkout = recentWorkouts[0];
        console.log('Using most recent workout:', mostRecentWorkout);

        // Get all sets from that workout for this exercise
        const sets = await db
            .select({
                setNumber: workout_exercise_sets.set_number,
                reps: workout_exercise_sets.reps,
                weight: workout_exercise_sets.weight,
                setId: workout_exercise_sets.id,
            })
            .from(workout_exercise_sets)
            .innerJoin(
                workout_exercises,
                eq(workout_exercise_sets.workout_exercise_id, workout_exercises.id)
            )
            .where(
                and(
                    eq(workout_exercises.exercise_id, exerciseId),
                    eq(workout_exercises.workout_id, mostRecentWorkout.workoutId),
                    isNull(workout_exercise_sets.deleted_at),
                    isNull(workout_exercises.deleted_at)
                )
            )
            .orderBy(workout_exercise_sets.set_number);

        console.log('Sets found for workout:', sets);

        if (sets.length === 0) {
            console.log('No sets found in most recent workout');
            return null;
        }

        return sets.map(s => ({
            setNumber: s.setNumber,
            reps: s.reps ?? 10,
            weight: s.weight ?? 0,
        }));
    } catch (error) {
        console.error('Error fetching historical sets for exercise:', error);
        return null;
    }
}

export async function getUnsyncedWorkoutExerciseSets(): Promise<WorkoutExerciseSet[]> {
    return db
        .select()
        .from(workout_exercise_sets)
        .where(eq(workout_exercise_sets.is_synced, 0));
}

export async function markWorkoutExerciseSetAsDeleted(setId: string, deletedAt: string): Promise<boolean> {
    const result = await db
        .update(workout_exercise_sets)
        .set({ deleted_at: deletedAt })
        .where(eq(workout_exercise_sets.id, setId));

    return result.changes > 0;
}

export async function markWorkoutExerciseSetsAsSynced(setIds: string[]): Promise<boolean> {
    if (setIds.length === 0) return true;

    const result = await db
        .update(workout_exercise_sets)
        .set({ is_synced: 1 })
        .where(inArray(workout_exercise_sets.id, setIds));

    return result.changes > 0;
}

// For upserting workout exercise sets from remote (pull operation)
export async function upsertWorkoutExerciseSetFromRemote(set: WorkoutExerciseSet): Promise<boolean> {
    try {
        await db.insert(workout_exercise_sets)
            .values({
                id: set.id,
                workout_exercise_id: set.workout_exercise_id,
                set_number: set.set_number,
                reps: set.reps,
                weight: set.weight,
                created_at: set.created_at,
                updated_at: set.updated_at,
                deleted_at: set.deleted_at,
                is_synced: 1,
            })
            .onConflictDoUpdate({
                target: workout_exercise_sets.id,
                set: {
                    set_number: set.set_number,
                    reps: set.reps,
                    weight: set.weight,
                    updated_at: set.updated_at,
                    deleted_at: set.deleted_at,
                    is_synced: 1,
                }
            });
        return true;
    } catch (error) {
        console.error('Failed to upsert workout exercise set:', error);
        return false;
    }
}

// Batch upsert workout exercise sets from remote
export async function upsertWorkoutExerciseSetsFromRemote(setsData: WorkoutExerciseSet[]): Promise<boolean> {
    if (setsData.length === 0) return true;
    try {
        await db.insert(workout_exercise_sets)
            .values(setsData.map(s => ({
                id: s.id,
                workout_exercise_id: s.workout_exercise_id,
                set_number: s.set_number,
                reps: s.reps,
                weight: s.weight,
                is_pr: s.is_pr,
                created_at: s.created_at,
                updated_at: s.updated_at,
                deleted_at: s.deleted_at,
                is_synced: 1,
            })))
            .onConflictDoUpdate({
                target: workout_exercise_sets.id,
                set: {
                    set_number: sql`excluded.set_number`,
                    reps: sql`excluded.reps`,
                    weight: sql`excluded.weight`,
                    is_pr: sql`excluded.is_pr`,
                    updated_at: sql`excluded.updated_at`,
                    deleted_at: sql`excluded.deleted_at`,
                    is_synced: 1,
                }
            });
        return true;
    } catch (error) {
        console.error('Failed to batch upsert workout exercise sets:', error);
        return false;
    }
}

// Re-evaluates is_pr for every completed workout belonging to a user,
// processing them in chronological order so historical PRs are correctly marked.
// Run this once to back-fill PRs for workouts completed before PR tracking was added.
export async function recalculateAllPRs(userId: string): Promise<void> {
    const completedWorkouts = await db
        .select({ id: workouts.id })
        .from(workouts)
        .where(
            and(
                eq(workouts.user_id, userId),
                isNotNull(workouts.completed_at),
                isNull(workouts.deleted_at),
            )
        )
        .orderBy(workouts.completed_at); // oldest first — required for time-aware logic

    for (const workout of completedWorkouts) {
        await markPRsForWorkout(workout.id);
    }
}

// Returns the historical max weight per rep count for an exercise from all completed workouts,
// optionally excluding one workout (typically the current one being evaluated).
// Returns a map of { [reps]: maxWeight } — empty object if no history.
export async function getMaxWeightsByRepsForExercise(
    exerciseId: string,
    excludeWorkoutId?: string
): Promise<Record<number, number>> {
    const conditions = [
        eq(workout_exercises.exercise_id, exerciseId),
        isNotNull(workouts.completed_at),
        isNull(workouts.deleted_at),
        isNull(workout_exercise_sets.deleted_at),
        isNull(workout_exercises.deleted_at),
    ];

    if (excludeWorkoutId) {
        conditions.push(ne(workouts.id, excludeWorkoutId));
    }

    const rows = await db
        .select({
            reps: workout_exercise_sets.reps,
            maxWeight: sql<number>`COALESCE(MAX(${workout_exercise_sets.weight}), 0)`,
        })
        .from(workout_exercise_sets)
        .innerJoin(workout_exercises, eq(workout_exercise_sets.workout_exercise_id, workout_exercises.id))
        .innerJoin(workouts, eq(workout_exercises.workout_id, workouts.id))
        .where(and(...conditions, isNotNull(workout_exercise_sets.weight)))
        .groupBy(workout_exercise_sets.reps);

    const result: Record<number, number> = {};
    for (const row of rows) {
        result[row.reps] = row.maxWeight;
    }
    return result;
}

export async function checkAndMarkSetAsPR(
    setId: string,
    exerciseId: string,
    weight: number,
    reps: number,
): Promise<boolean> {
    try {
        const ts = now();

        // Get previous values before updating
        const [currentSet] = await db
            .select({
                isPr: workout_exercise_sets.is_pr,
                weight: workout_exercise_sets.weight,
                reps: workout_exercise_sets.reps,
            })
            .from(workout_exercise_sets)
            .where(eq(workout_exercise_sets.id, setId))
            .limit(1);

        const wasAlreadyPr = currentSet?.isPr === 1;
        const previousWeight = currentSet?.weight ?? 0;
        const previousReps = currentSet?.reps ?? 0;

        const allPriorSets = await db
            .select({
                weight: workout_exercise_sets.weight,
                reps: workout_exercise_sets.reps,
            })
            .from(workout_exercise_sets)
            .innerJoin(workout_exercises, eq(workout_exercise_sets.workout_exercise_id, workout_exercises.id))
            .innerJoin(workouts, eq(workout_exercises.workout_id, workouts.id))
            .where(
                and(
                    eq(workout_exercises.exercise_id, exerciseId),
                    ne(workout_exercise_sets.id, setId),
                    isNotNull(workout_exercise_sets.weight),
                    isNull(workout_exercise_sets.deleted_at),
                    isNull(workout_exercises.deleted_at),
                    isNull(workouts.deleted_at),
                )
            );

        if (allPriorSets.length === 0) {
            await db.update(workout_exercise_sets)
                .set({ is_pr: 0, ...touch(ts) })
                .where(eq(workout_exercise_sets.id, setId));
            return false;
        }

        const best = allPriorSets.reduce((best, s) => {
            if (s.weight! > best.weight! || (s.weight === best.weight && s.reps > best.reps)) return s;
            return best;
        }, allPriorSets[0]);

        const isPr = weight > best.weight! || (weight === best.weight && reps > best.reps);

        await db.update(workout_exercise_sets)
            .set({ is_pr: isPr ? 1 : 0, ...touch(ts) })
            .where(eq(workout_exercise_sets.id, setId));

        // Show toast if it newly became a PR, or was already a PR but values improved
        const valuesImproved = isPr && wasAlreadyPr && (
            weight > previousWeight ||
            (weight === previousWeight && reps > previousReps)
        );

        return isPr && (!wasAlreadyPr || valuesImproved);
    } catch (err) {
        console.error('checkAndMarkSetAsPR error:', err);
        return false;
    }
}

export async function markPRsForWorkout(workoutId: string): Promise<void> {
    const ts = now();

    const [thisWorkout] = await db
        .select({ completedAt: workouts.completed_at })
        .from(workouts)
        .where(eq(workouts.id, workoutId))
        .limit(1);

    if (!thisWorkout?.completedAt) return;
    const completedAt = thisWorkout.completedAt;

    // Reset PRs for this workout
    await db
        .update(workout_exercise_sets)
        .set({ is_pr: 0, updated_at: ts, is_synced: 0 })
        .where(
            and(
                eq(workout_exercise_sets.is_pr, 1),
                isNull(workout_exercise_sets.deleted_at),
                sql`${workout_exercise_sets.workout_exercise_id} IN (
                    SELECT id FROM workout_exercises WHERE workout_id = ${workoutId}
                )`
            )
        );

    // Fetch all sets in this workout ordered by set_number
    const sets = await db
        .select({
            setId: workout_exercise_sets.id,
            exerciseId: workout_exercises.exercise_id,
            weight: workout_exercise_sets.weight,
            reps: workout_exercise_sets.reps,
        })
        .from(workout_exercise_sets)
        .innerJoin(workout_exercises, eq(workout_exercise_sets.workout_exercise_id, workout_exercises.id))
        .where(
            and(
                eq(workout_exercises.workout_id, workoutId),
                isNotNull(workout_exercise_sets.weight),
                isNull(workout_exercise_sets.deleted_at),
                isNull(workout_exercises.deleted_at),
            )
        )
        .orderBy(workout_exercise_sets.set_number);

    // Get unique exercise IDs
    const exerciseIds = [...new Set(sets.map(s => s.exerciseId).filter((id): id is string => id !== null))];

    // For each exercise, fetch all historical sets from prior workouts
    const historicalSets = new Map<string, Array<{ weight: number; reps: number }>>();

    for (const exerciseId of exerciseIds) {
        const rows = await db
            .select({
                weight: workout_exercise_sets.weight,
                reps: workout_exercise_sets.reps,
            })
            .from(workout_exercise_sets)
            .innerJoin(workout_exercises, eq(workout_exercise_sets.workout_exercise_id, workout_exercises.id))
            .innerJoin(workouts, eq(workout_exercises.workout_id, workouts.id))
            .where(
                and(
                    eq(workout_exercises.exercise_id, exerciseId),
                    lt(workouts.completed_at, completedAt),
                    ne(workouts.id, workoutId),
                    isNotNull(workouts.completed_at),
                    isNotNull(workout_exercise_sets.weight),
                    isNull(workouts.deleted_at),
                    isNull(workout_exercise_sets.deleted_at),
                    isNull(workout_exercises.deleted_at),
                )
            );

        historicalSets.set(exerciseId, rows.map(r => ({ weight: r.weight!, reps: r.reps })));
    }

    // Helper to pick the better of two sets
    const isBetter = (a: { weight: number; reps: number }, b: { weight: number; reps: number }) =>
        a.weight > b.weight || (a.weight === b.weight && a.reps > b.reps);

    const getBest = (sets: Array<{ weight: number; reps: number }>): { weight: number; reps: number } | null => {
        if (sets.length === 0) return null;
        return sets.reduce((best, s) => isBetter(s, best) ? s : best, sets[0]);
    };

    // Process each set incrementally, tracking running best per exercise
    const runningBest = new Map<string, { weight: number; reps: number } | null>();

    for (const set of sets) {
        if (!set.exerciseId || !set.weight) continue;

        const history = historicalSets.get(set.exerciseId) ?? [];
        const historicalBest = getBest(history);
        const currentRunning = runningBest.get(set.exerciseId) ?? null;

        // Pick the better of historical and running best
        let best: { weight: number; reps: number } | null;
        if (!historicalBest && !currentRunning) {
            best = null;
        } else if (!historicalBest) {
            best = currentRunning;
        } else if (!currentRunning) {
            best = historicalBest;
        } else {
            best = isBetter(currentRunning, historicalBest) ? currentRunning : historicalBest;
        }

        // No prior history at all — this is a baseline, not a PR
        if (!best) {
            runningBest.set(set.exerciseId, { weight: set.weight, reps: set.reps });
            continue;
        }

        const isPR =
            set.weight > best.weight ||
            (set.weight === best.weight && set.reps > best.reps);

        // Update running best if this set is better
        if (isPR) {
            runningBest.set(set.exerciseId, { weight: set.weight, reps: set.reps });
            await db
                .update(workout_exercise_sets)
                .set({ is_pr: 1, ...touch(ts) })
                .where(eq(workout_exercise_sets.id, set.setId));
        } else {
            runningBest.set(set.exerciseId, best);
        }
    }
}