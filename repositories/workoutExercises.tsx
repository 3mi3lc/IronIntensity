// src/repositories/workoutExercises.ts
import {db} from '@/db/client';
import { workout_exercises} from '@/db/schema';
import {and, asc, eq, isNull, sql, gt, gte, lt, lte} from 'drizzle-orm';
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

export async function listWorkoutExercises(workoutId: string) {
    return db
        .select()
        .from(workout_exercises)
        .where(
            and(eq(workout_exercises.workout_id, workoutId), isNull(workout_exercises.deleted_at))
        )
        .orderBy(asc(workout_exercises.order_index));
}

export async function softDeleteWorkoutExercise(id: string) {
    await db
        .update(workout_exercises)
        .set({ deleted_at: now(), updated_at: now(), is_synced: 0 })
        .where(eq(workout_exercises.id, id));
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

export async function moveWorkoutExerciseToIndex(
    workoutExerciseId: string,
    newIndex: number,
    options?: { returnData?: boolean }
): Promise<boolean | typeof workout_exercises.$inferSelect | null> {
    const [current] = await db
        .select()
        .from(workout_exercises)
        .where(eq(workout_exercises.id, workoutExerciseId));

    if (!current || current.deleted_at == null) return false;

    const workoutId = current.workout_id;
    const oldIndex = current.order_index ?? 0;

    if (newIndex === oldIndex) {
        if (options?.returnData) return current;
        return true;
    }

    await db.transaction(async (tx) => {
        if (newIndex < oldIndex) {
            // Shift items between newIndex and oldIndex down
            await tx
                .update(workout_exercises)
                .set({
                    order_index: sql`${workout_exercises.order_index} + 1`,
                    updated_at: now(),
                    is_synced: 0,
                })
                .where(
                    and(
                        eq(workout_exercises.workout_id, workoutId!),
                        gte(workout_exercises.order_index, newIndex),
                        lt(workout_exercises.order_index, oldIndex),
                        isNull(workout_exercises.deleted_at)
                    )
                );
        } else {
            // Shift items between oldIndex and newIndex up
            await tx
                .update(workout_exercises)
                .set({
                    order_index: sql`${workout_exercises.order_index} - 1`,
                    updated_at: now(),
                    is_synced: 0,
                })
                .where(
                    and(
                        eq(workout_exercises.workout_id, workoutId!),
                        gt(workout_exercises.order_index, oldIndex),
                        lte(workout_exercises.order_index, newIndex),
                        isNull(workout_exercises.deleted_at)
                    )
                );
        }

        // Move the current item to the new index
        await tx
            .update(workout_exercises)
            .set({
                order_index: newIndex,
                updated_at: now(),
                is_synced: 0,
            })
            .where(eq(workout_exercises.id, workoutExerciseId));
    });

    if (options?.returnData) {
        const [updated] = await db
            .select()
            .from(workout_exercises)
            .where(eq(workout_exercises.id, workoutExerciseId));
        return updated ?? null;
    }

    return true;
}

export async function softDeleteWorkoutExerciseById(
    id: string,
    options?: { returnData?: boolean }
): Promise<WorkoutExercise | boolean> {
    const query = db
        .update(workout_exercises)
        .set({
            deleted_at: now(),
            updated_at: now(),
            is_synced: 0
        })
        .where(eq(workout_exercises.id, id));

    if (options?.returnData) {
        const [deletedExercise] = await query.returning();
        return deletedExercise ?? null;
    }

    const result = await query;
    return result.changes > 0;
}



