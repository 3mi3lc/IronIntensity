// src/repositories/workoutExerciseSets.ts
import { db } from '@/db/client';
import { workout_exercise_sets } from '@/db/schema';
import { eq, and, isNull, sql, gt, lte, gte, lt } from 'drizzle-orm';
import { newId, now } from '@/utils/id';
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
        .where(eq(workout_exercise_sets.workout_exercise_id, workoutExerciseId));

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
        .set({ ...patch, updated_at: now(), is_synced: 0 })
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
    const query = db
        .update(workout_exercise_sets)
        .set({ deleted_at: now(), updated_at: now(), is_synced: 0 })
        .where(eq(workout_exercise_sets.id, id));

    if (options?.returnData) {
        const [deletedSet] = await query.returning();
        return deletedSet ?? null;
    }

    const result = await query;
    return result.changes > 0;
}

export async function getSetsForWorkoutExercise(
    workoutExerciseId: string,
    options?: { returnData?: boolean }
): Promise<WorkoutExerciseSet[] | boolean> {
    const query = db
        .select()
        .from(workout_exercise_sets)
        .where(
            and(
                eq(workout_exercise_sets.workout_exercise_id, workoutExerciseId),
                isNull(workout_exercise_sets.deleted_at)
            )
        )
        .orderBy(workout_exercise_sets.set_number);

    if (options?.returnData) {
        // Return full data set
        return query;
    }

    // If not returnData, just check if any sets exist (returns boolean)
    const sets = await query.limit(1);
    return sets.length > 0;
}

export async function reorderSetsForWorkoutExercise(
    workoutExerciseId: string,
    orderedSetIds: string[]
) {
    const ts = now();

    await db.transaction(async (tx) => {
        for (let i = 0; i < orderedSetIds.length; i++) {
            await tx
                .update(workout_exercise_sets)
                .set({ set_number: i + 1, updated_at: ts, is_synced: 0 })
                .where(
                    and(
                        eq(workout_exercise_sets.id, orderedSetIds[i]),
                        eq(workout_exercise_sets.workout_exercise_id, workoutExerciseId)
                    )
                );
        }
    });
}

export async function reorderSet(
    setId: string,
    newSetNumber: number
): Promise<boolean> {
    const [target] = await db
        .select({
            id: workout_exercise_sets.id,
            workoutExerciseId: workout_exercise_sets.workout_exercise_id,
            oldSetNumber: workout_exercise_sets.set_number,
        })
        .from(workout_exercise_sets)
        .where(eq(workout_exercise_sets.id, setId))
        .limit(1);

    if (!target) return false;

    const { workoutExerciseId, oldSetNumber } = target;

    if (newSetNumber === oldSetNumber) return true;

    // Start a transaction
    await db.transaction(async (tx) => {
        if (newSetNumber < oldSetNumber) {
            // Moving up: shift others down
            await tx
                .update(workout_exercise_sets)
                .set({ set_number: sql`${workout_exercise_sets.set_number} + 1` })
                .where(
                    and(
                        eq(workout_exercise_sets.workout_exercise_id, workoutExerciseId!),
                        gte(workout_exercise_sets.set_number, newSetNumber),
                        lt(workout_exercise_sets.set_number, oldSetNumber)
                    )
                );
        } else {
            // Moving down: shift others up
            await tx
                .update(workout_exercise_sets)
                .set({ set_number: sql`${workout_exercise_sets.set_number} - 1` })
                .where(
                    and(
                        eq(workout_exercise_sets.workout_exercise_id, workoutExerciseId!),
                        gt(workout_exercise_sets.set_number, oldSetNumber),
                        lte(workout_exercise_sets.set_number, newSetNumber)
                    )
                );
        }

        // Finally, update the target set
        await tx
            .update(workout_exercise_sets)
            .set({ set_number: newSetNumber, updated_at: now(), is_synced: 0 })
            .where(eq(workout_exercise_sets.id, setId));
    });

    return true;
}

