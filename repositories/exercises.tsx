// src/repositories/exercises.ts
import {db} from '@/db/client';
import {exercise_body_parts, exercises} from '@/db/schema';
import {and, eq, inArray, isNull} from 'drizzle-orm';
import {newId, now} from '@/utils/id';
import type {BodypartWithExercises, Exercise, NewExercise} from './types';
import {getAllBodyParts} from "@/repositories/bodyParts";

export async function createExercise(
    data: Omit<NewExercise, 'id' | 'created_at' | 'updated_at' | 'is_synced'>,
    options?: { returnData?: boolean }
): Promise<Exercise | boolean> {
    const id = newId();
    const ts = now();

    const query = db.insert(exercises).values({
        ...data,
        id,
        created_at: ts,
        updated_at: ts,
        is_synced: 0,
    });

    if (options?.returnData) {
        const [insertedExercise] = await query.returning();
        return insertedExercise;
    }

    const result = await query;
    return result.changes > 0;
}

export async function updateExerciseById(
    id: string,
    patch: Partial<Omit<NewExercise, 'id' | 'user_id'>>,
    options?: { returnData?: boolean }
): Promise<Exercise | boolean> {
    const query = db
        .update(exercises)
        .set({ ...patch, updated_at: now(), is_synced: 0 })
        .where(eq(exercises.id, id));

    if (options?.returnData) {
        const [updatedExercise] = await query.returning();
        return updatedExercise ?? null;
    }

    const result = await query;
    return result.changes > 0;
}

export async function softDeleteExerciseById(
    id: string,
    options?: { returnData?: boolean }
): Promise<Exercise | boolean> {
    const deletedAt = now();

    try {
        // Mark exercise_body_parts junction records as deleted
        await db
            .update(exercise_body_parts)
            .set({ deleted_at: deletedAt, updated_at: deletedAt, is_synced: 0 })
            .where(
                and(
                    eq(exercise_body_parts.exercise_id, id),
                    isNull(exercise_body_parts.deleted_at)
                )
            );

        // Mark exercise as deleted
        const query = db
            .update(exercises)
            .set({ deleted_at: deletedAt, updated_at: deletedAt, is_synced: 0 })
            .where(and(eq(exercises.id, id), isNull(exercises.deleted_at)));

        if (options?.returnData) {
            const [deletedExercise] = await query.returning();
            return deletedExercise;
        }

        const result = await query;
        return result.changes > 0;
    } catch (error) {
        console.error('Failed to soft delete exercise with cascade:', error);
        return false;
    }
}


export async function getExerciseById(id: string): Promise<Exercise | null> {
    const [exercise] = await db
        .select()
        .from(exercises)
        .where(and(eq(exercises.id, id), isNull(exercises.deleted_at)));

    return exercise ?? null;
}

export async function getAllExercises(): Promise<Exercise[]> {
    return db.select().from(exercises).where(isNull(exercises.deleted_at));
}

export async function getAllExercisesWithBodyPart(): Promise<BodypartWithExercises[]> {
    //  Fetch all body parts
    const allBodyParts = await getAllBodyParts();

    //  Fetch all active exercises
    const allExercises = await getAllExercises();

    //  Fetch junction table linking exercises to body parts
    const allExerciseBodyParts = await db
        .select({
            exercise_id: exercise_body_parts.exercise_id,
            body_part_id: exercise_body_parts.body_part_id,
        })
        .from(exercise_body_parts);

    //  Map body part IDs to exercises
    const bodyPartMap: Record<string, Exercise[]> = {};
    allBodyParts.forEach((bp) => {
        bodyPartMap[bp.id] = [];
    });

    allExerciseBodyParts.forEach((ebp) => {
        const exercise = allExercises.find((ex) => ex.id === ebp.exercise_id);
        if (exercise) {
            bodyPartMap[ebp.body_part_id].push(exercise);
        }
    });

    //  Build final array of BodypartWithExercises
    return allBodyParts.map((bp) => ({
        ...bp,
        exercises: bodyPartMap[bp.id] || [],
    }));
}

export async function getUnsyncedExercises(): Promise<Exercise[]> {
    return db
        .select()
        .from(exercises)
        .where(
            eq(exercises.is_synced, 0)
        );
}

export async function markExercisesAsSynced(exerciseIds: string[]): Promise<boolean> {
    if (exerciseIds.length === 0) return true;

    const result = await db
        .update(exercises)
        .set({ is_synced: 1 })
        .where(inArray(exercises.id, exerciseIds));

    return result.changes > 0;
}

// For upserting exercises from remote (pull operation)
export async function upsertExerciseFromRemote(exercise: Exercise): Promise<boolean> {
    try {
        await db.insert(exercises)
            .values({
                id: exercise.id,
                user_id: exercise.user_id,
                name: exercise.name,
                description: exercise.description,
                created_at: exercise.created_at,
                updated_at: exercise.updated_at,
                deleted_at: exercise.deleted_at,
                is_synced: 1,
            })
            .onConflictDoUpdate({
                target: exercises.id,
                set: {
                    name: exercise.name,
                    description: exercise.description,
                    updated_at: exercise.updated_at,
                    deleted_at: exercise.deleted_at,
                    is_synced: 1,
                }
            });
        return true;
    } catch (error) {
        console.error('Failed to upsert exercise:', error);
        return false;
    }
}

// Batch upsert exercises from remote
export async function upsertExercisesFromRemote(exercisesData: Exercise[]): Promise<boolean> {
    if (exercisesData.length === 0) return true;

    try {
        for (const exercise of exercisesData) {
            const success = await upsertExerciseFromRemote(exercise);
            if (!success) return false;
        }
        return true;
    } catch (error) {
        console.error('Failed to batch upsert exercises:', error);
        return false;
    }
}