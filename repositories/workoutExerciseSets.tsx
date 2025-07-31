// src/repositories/workoutExerciseSets.ts
import { db } from '@/db/client';
import { workout_exercise_sets } from '@/db/schema';
import { eq, and, isNull, asc, sql } from 'drizzle-orm';
import { newId, now } from '@/utils/id';
import type {
    WorkoutExerciseSet,
    NewWorkoutExerciseSet,
} from './types';

export async function addSet(
    workoutExerciseId: string,
    data: Omit<NewWorkoutExerciseSet, 'id' | 'set_number' | 'workout_exercise_id' | 'created_at' | 'updated_at' | 'is_synced'>
): Promise<WorkoutExerciseSet> {
    // auto set_number
    const [{ maxSet }] = await db
        .select({ maxSet: sql<number>`COALESCE(MAX(${workout_exercise_sets.set_number}), 0)` })
        .from(workout_exercise_sets)
        .where(eq(workout_exercise_sets.workout_exercise_id, workoutExerciseId));

    const id = newId();
    const ts = now();
    await db.insert(workout_exercise_sets).values({
        id,
        workout_exercise_id: workoutExerciseId,
        set_number: (maxSet ?? 0) + 1,
        created_at: ts,
        updated_at: ts,
        is_synced: 0,
        ...data,
    });

    const [set] = await db
        .select()
        .from(workout_exercise_sets)
        .where(eq(workout_exercise_sets.id, id));
    return set;
}

export async function updateSet(
    id: string,
    patch: Partial<Pick<NewWorkoutExerciseSet, 'reps' | 'weight' | 'set_number'>>
) {
    await db
        .update(workout_exercise_sets)
        .set({ ...patch, updated_at: now(), is_synced: 0 })
        .where(eq(workout_exercise_sets.id, id));
}

export async function softDeleteSet(id: string) {
    await db
        .update(workout_exercise_sets)
        .set({ deleted_at: now(), updated_at: now(), is_synced: 0 })
        .where(eq(workout_exercise_sets.id, id));
}

export async function listSetsForWorkoutExercise(workoutExerciseId: string) {
    return db
        .select()
        .from(workout_exercise_sets)
        .where(
            and(
                eq(workout_exercise_sets.workout_exercise_id, workoutExerciseId),
                isNull(workout_exercise_sets.deleted_at)
            )
        )
        .orderBy(asc(workout_exercise_sets.set_number));
}
