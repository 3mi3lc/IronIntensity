// src/repositories/workouts.ts
import {db} from '@/db/client';
import {exercises, workout_exercise_sets, workout_exercises, workouts} from '@/db/schema';
import {and, eq, isNull} from 'drizzle-orm';
import {newId, now} from '@/utils/id';
import type {ExerciseWithSets, NewWorkout, Workout} from './types';

export async function getAllWorkouts(): Promise<Workout[]> {
    return db.select().from(workouts);
}

export async function createWorkout(
    data: Omit<NewWorkout, 'id' | 'updated_at' | 'is_synced'> & { created_at?: string },
    options?: { returnData?: boolean }
): Promise<Workout | boolean> {
    const id = newId();
    const ts = now();

    const createdAt = data.created_at ?? ts; // use passed created_at or fallback to now()

    const query = db.insert(workouts).values({
        ...data,
        id,
        created_at: createdAt,
        updated_at: ts,  // updated_at can remain now()
        is_synced: 0,
    });

    if (options?.returnData) {
        const [insertedWorkout] = await query.returning();
        return insertedWorkout;
    }

    const result = await query;
    return result.changes > 0;
}

export async function updateWorkoutNameById(
    id: string,
    name: string,
    options?: {returnData: boolean}):Promise<Workout | boolean> {

    const query = db
        .update(workouts)
        .set({name, updated_at: now(), is_synced: 0})
        .where(and(eq(workouts.id, id), isNull(workouts.deleted_at)));

    if(options?.returnData) {
        const [updatedWorkout] = await query.returning();
        return updatedWorkout;
    }

    const result = await query ;
    return result.changes > 0;
}

export async function softDeleteWorkoutById(id: string, options?: {returnData : boolean}):Promise<Workout | boolean> {
    const query = db
        .update(workouts)
        .set({ deleted_at: now(), updated_at: now(), is_synced: 0 })
        .where(and(eq(workouts.id, id), isNull(workouts.deleted_at)));

    if(options?.returnData) {
        const [deletedWorkout] = await query.returning();
        return deletedWorkout;
    }

    const result = await query;
    return result.changes > 0;
}

export async function getWorkoutById(id: string):Promise<Workout | null> {
    const [workout] = await db
        .select()
        .from(workouts)
        .where(and(eq(workouts.id, id), isNull(workouts.deleted_at)));

    return workout ?? null;
}

export async function getWorkoutWithExercisesAndSets(workoutId: string): Promise<ExerciseWithSets[]> {
    const workoutExercises = await db
        .select({
            workoutExerciseId: workout_exercises.id,
            orderIndex: workout_exercises.order_index,
            exerciseId: exercises.id,
            exerciseName: exercises.name,
            exerciseDescription: exercises.description,
        })
        .from(workout_exercises)
        .leftJoin(exercises, eq(workout_exercises.exercise_id, exercises.id))
        .where(
            and(
                eq(workout_exercises.workout_id, workoutId),
                isNull(workout_exercises.deleted_at)
            )
        )
        .orderBy(workout_exercises.order_index);

    const results: ExerciseWithSets[] = [];

    for (const we of workoutExercises) {
        const sets = await db
            .select({
                id: workout_exercise_sets.id,
                setNumber: workout_exercise_sets.set_number,
                reps: workout_exercise_sets.reps,
                weight: workout_exercise_sets.weight,
            })
            .from(workout_exercise_sets)
            .where(
                and(
                    eq(workout_exercise_sets.workout_exercise_id, we.workoutExerciseId),
                    isNull(workout_exercise_sets.deleted_at)
                )
            )
            .orderBy(workout_exercise_sets.set_number);

        results.push({
            workoutExerciseId: we.workoutExerciseId,
            orderIndex: we.orderIndex,
            exercise: {
                id: we.exerciseId!,
                name: we.exerciseName!,
                description: we.exerciseDescription,
                order_index: we.orderIndex!,
            },
            sets,
        });
    }

    return results;
}
