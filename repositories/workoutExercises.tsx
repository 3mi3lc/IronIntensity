// src/repositories/workoutExercises.ts
import {db} from '@/db/client';
import {workout_exercise_sets, workout_exercises} from '@/db/schema';
import {and, eq, isNull, sql, inArray} from 'drizzle-orm';
import {newId, now} from '@/utils/id';
import type {WorkoutExercise } from './types';

export async function addExerciseToWorkoutById(
    workoutId: string,
    exerciseId: string
): Promise<WorkoutExercise> {
    // Determine next order_index
    const [{ max }] = await db
        .select({ max: sql<number>`COALESCE(MAX(${workout_exercises.order_index}), 0)` })
        .from(workout_exercises)
        .where(
            and(
                eq(workout_exercises.workout_id, workoutId),
                isNull(workout_exercises.deleted_at)
            )
        );

    const id = newId();
    const ts = now();
    await db.insert(workout_exercises).values({
        id,
        workout_id: workoutId,
        exercise_id: exerciseId,
        order_index: (max ?? 0) + 1,
        created_at: ts,
        updated_at: ts,
        is_synced: 0,
    });

    const [we] = await db
        .select()
        .from(workout_exercises)
        .where(eq(workout_exercises.id, id));
    return we;
}

export async function reorderWorkoutExercises(
    workoutId: string,
    orderedIds: string[]
) {
    const ts = now();
    // simple sequential update in a transaction
    await db.transaction(async (tx) => {
        for (let i = 0; i < orderedIds.length; i++) {
            await tx
                .update(workout_exercises)
                .set({ order_index: i + 1, updated_at: ts, is_synced: 0 })
                .where(
                    and(
                        eq(workout_exercises.id, orderedIds[i]),
                        eq(workout_exercises.workout_id, workoutId)
                    )
                );
        }
    });
}

export async function softDeleteWorkoutExerciseById(
    id: string,
    options?: { returnData?: boolean }
): Promise<WorkoutExercise | boolean> {
    const deletedAt = now();

    try {
        // 1. Cascade delete to all sets first
        await db
            .update(workout_exercise_sets)
            .set({ deleted_at: deletedAt, updated_at: deletedAt, is_synced: 0 })
            .where(
                and(
                    eq(workout_exercise_sets.workout_exercise_id, id),
                    isNull(workout_exercise_sets.deleted_at)
                )
            );

        // 2. Then delete the workout_exercise itself
        const query = db
            .update(workout_exercises)
            .set({ deleted_at: deletedAt, updated_at: deletedAt, is_synced: 0 })
            .where(and(eq(workout_exercises.id, id), isNull(workout_exercises.deleted_at)));

        if (options?.returnData) {
            const [deletedExercise] = await query.returning();
            return deletedExercise ?? null;
        }

        const result = await query;
        return result.changes > 0;
    } catch (error) {
        console.error('Failed to soft delete workout_exercise with cascade:', error);
        return false;
    }
}


export async function getUnsyncedWorkoutExercises(): Promise<WorkoutExercise[]> {
    return db.select().from(workout_exercises).where(eq(workout_exercises.is_synced, 0));
}

export async function markWorkoutExerciseAsDeleted(workoutExerciseId: string, deletedAt: string): Promise<boolean> {
    const result = await db
        .update(workout_exercises)
        .set({ deleted_at: deletedAt })
        .where(eq(workout_exercises.id, workoutExerciseId));

    return result.changes > 0;
}

export async function markWorkoutExercisesAsSynced(workoutExerciseIds: string[]): Promise<boolean> {
    if (workoutExerciseIds.length === 0) return true;

    const result = await db
        .update(workout_exercises)
        .set({ is_synced: 1 })
        .where(inArray(workout_exercises.id, workoutExerciseIds));

    return result.changes > 0;
}

export async function getWorkoutExercisesByIdsWithDeletedStatus(workoutExerciseIds: string[]): Promise<Array<{ id: string; deleted_at: string | null }>> {
    if (workoutExerciseIds.length === 0) return [];

    return db
        .select({id: workout_exercises.id, deleted_at: workout_exercises.deleted_at})
        .from(workout_exercises)
        .where(inArray(workout_exercises.id, workoutExerciseIds));
}

// For upserting workout exercises from remote (pull operation)
export async function upsertWorkoutExerciseFromRemote(workoutExercise: WorkoutExercise): Promise<boolean> {
    try {
        await db.insert(workout_exercises)
            .values({
                id: workoutExercise.id,
                workout_id: workoutExercise.workout_id,
                exercise_id: workoutExercise.exercise_id,
                order_index: workoutExercise.order_index,
                created_at: workoutExercise.created_at,
                updated_at: workoutExercise.updated_at,
                deleted_at: workoutExercise.deleted_at,
                is_synced: 1,
            })
            .onConflictDoUpdate({
                target: workout_exercises.id,
                set: {
                    order_index: workoutExercise.order_index,
                    updated_at: workoutExercise.updated_at,
                    deleted_at: workoutExercise.deleted_at,
                    is_synced: 1,
                }
            });
        return true;
    } catch (error) {
        console.error('Failed to upsert workout exercise:', error);
        return false;
    }
}

// Batch upsert workout exercises from remote
export async function upsertWorkoutExercisesFromRemote(workoutExercisesData: WorkoutExercise[]): Promise<boolean> {
    if (workoutExercisesData.length === 0) return true;
    try {
        await db.insert(workout_exercises)
            .values(workoutExercisesData.map(we => ({
                id: we.id,
                workout_id: we.workout_id,
                exercise_id: we.exercise_id,
                order_index: we.order_index,
                created_at: we.created_at,
                updated_at: we.updated_at,
                deleted_at: we.deleted_at,
                is_synced: 1,
            })))
            .onConflictDoUpdate({
                target: workout_exercises.id,
                set: {
                    order_index: sql`excluded.order_index`,
                    updated_at: sql`excluded.updated_at`,
                    deleted_at: sql`excluded.deleted_at`,
                    is_synced: 1,
                }
            });
        return true;
    } catch (error) {
        console.error('Failed to batch upsert workout exercises:', error);
        return false;
    }
}
