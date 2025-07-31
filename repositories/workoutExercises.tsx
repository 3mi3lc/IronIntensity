// src/repositories/workoutExercises.ts
import { db } from '@/db/client';
import { workout_exercises } from '@/db/schema';
import { eq, and, isNull, asc, sql } from 'drizzle-orm';
import { newId, now } from '@/utils/id';
import type { WorkoutExercise } from './types';

export async function addExerciseToWorkoutById(
    workoutId: string,
    exerciseId: string
): Promise<WorkoutExercise> {
    // Determine next order_index
    const [{ max }] = await db
        .select({ max: sql<number>`COALESCE(MAX(${workout_exercises.order_index}), 0)` })
        .from(workout_exercises)
        .where(eq(workout_exercises.workout_id, workoutId));

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
