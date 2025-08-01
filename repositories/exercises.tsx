// src/repositories/exercises.ts
import { db } from '@/db/client';
import { exercises } from '@/db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { newId, now } from '@/utils/id';
import type { Exercise, NewExercise } from './types';

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
    const query = db
        .update(exercises)
        .set({ deleted_at: now(), updated_at: now(), is_synced: 0 })
        .where(eq(exercises.id, id));

    if (options?.returnData) {
        const [deletedExercise] = await query.returning();
        return deletedExercise ?? null;
    }

    const result = await query;
    return result.changes > 0;
}

export async function getExerciseById(id: string): Promise<Exercise | null> {
    const [exercise] = await db
        .select()
        .from(exercises)
        .where(and(eq(exercises.id, id), isNull(exercises.deleted_at)));

    return exercise ?? null;
}
