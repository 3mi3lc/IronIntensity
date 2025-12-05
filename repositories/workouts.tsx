// src/repositories/workouts.ts
import {db} from '@/db/client';
import {exercises, workout_exercise_sets, workout_exercises, workouts} from '@/db/schema';
import {and, desc, eq, isNull, sql} from 'drizzle-orm';
import {newId, now} from '@/utils/id';
import type {ExerciseWithSets, NewWorkout, Workout} from './types';

interface UpdateWorkoutInput {
    name?: string;
    created_at?: string;
}

export async function getAllWorkouts(): Promise<Workout[]> {
    return db
        .select()
        .from(workouts)
        .where(isNull(workouts.deleted_at))
        .orderBy(workouts.created_at); // Order by date, most recent first
}

export async function getWorkoutsForCalendar(userId: string, limit = 200) {
    return db
        .select()
        .from(workouts)
        .where(
            and(
                eq(workouts.user_id, userId),
                isNull(workouts.deleted_at)          // <-- ignore deleted
            )
        )
        .orderBy(desc(workouts.created_at))
        .limit(limit);
}

export async function getWorkoutsByDate(userId: string, date: string) {
    return db
        .select()
        .from(workouts)
        .where(
            and(
                eq(workouts.user_id, userId),
                isNull(workouts.deleted_at),         // <-- ignore deleted
                eq(sql`date(
                ${workouts.created_at}
                )`, date)
            )
        )
        .orderBy(desc(workouts.created_at));
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

export async function updateWorkoutById(
    id: string,
    patch: UpdateWorkoutInput,
    options?: { returnData?: boolean }
): Promise<Workout | boolean> {
    const query = db
        .update(workouts)
        .set({
            ...patch,
            updated_at: now(),
            is_synced: 0
        })
        .where(and(eq(workouts.id, id), isNull(workouts.deleted_at)));

    if (options?.returnData) {
        const [updatedWorkout] = await query.returning();
        return updatedWorkout ?? null;
    }

    const result = await query;
    return result.changes > 0;
}

export async function duplicateWorkout(
    workoutId: string,
    userId: string,
    options?: { returnData?: boolean }
): Promise<Workout | boolean> {
    try {
        // Get original workout
        const [originalWorkout] = await db
            .select()
            .from(workouts)
            .where(and(eq(workouts.id, workoutId), isNull(workouts.deleted_at)));

        if (!originalWorkout) {
            throw new Error('Workout not found');
        }

        // Create new workout with copy suffix
        const newWorkoutId = newId();
        const ts = now();

        const query = db.insert(workouts).values({
            id: newWorkoutId,
            user_id: userId,
            name: originalWorkout.name,
            created_at: ts,
            updated_at: ts,
            deleted_at: null,
            is_synced: 0,
        });

        let newWorkout: Workout;
        if (options?.returnData) {
            [newWorkout] = await query.returning();
        } else {
            await query;
        }

        // Get all workout exercises from original
        const originalExercises = await db
            .select()
            .from(workout_exercises)
            .where(
                and(
                    eq(workout_exercises.workout_id, workoutId),
                    isNull(workout_exercises.deleted_at)
                )
            )
            .orderBy(workout_exercises.order_index);

        // Copy exercises and their sets to new workout
        for (const exercise of originalExercises) {
            const newWorkoutExerciseId = newId();

            // Copy the workout exercise
            await db.insert(workout_exercises).values({
                id: newWorkoutExerciseId,
                workout_id: newWorkoutId,
                exercise_id: exercise.exercise_id,
                order_index: exercise.order_index,
                created_at: ts,
                updated_at: ts,
                deleted_at: null,
                is_synced: 0,
            });

            // Get all sets for this exercise
            const originalSets = await db
                .select()
                .from(workout_exercise_sets)
                .where(
                    and(
                        eq(workout_exercise_sets.workout_exercise_id, exercise.id),
                        isNull(workout_exercise_sets.deleted_at)
                    )
                )
                .orderBy(workout_exercise_sets.set_number);

            // Copy all sets
            for (const set of originalSets) {
                await db.insert(workout_exercise_sets).values({
                    id: newId(),
                    workout_exercise_id: newWorkoutExerciseId,
                    set_number: set.set_number,
                    reps: set.reps,
                    weight: set.weight,
                    created_at: ts,
                    updated_at: ts,
                    deleted_at: null,
                    is_synced: 0,
                });
            }
        }

        if (options?.returnData) {
            console.log("duplicated workout with id: ", newWorkoutId, " old id: ", workoutId);
            return newWorkout!;
        }

        return true;
    } catch (error) {
        console.error('Failed to duplicate workout:', error);
        throw error;
    }
}


