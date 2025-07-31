// src/repositories/exercises.ts
import { db } from '@/db/client';
import {exercises} from '@/db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { newId, now } from '@/utils/id';
import type {Exercise, NewExercise } from './types';

export async function createExercise(
    data: Omit<NewExercise, 'id' | 'created_at' | 'updated_at' | 'is_synced'>
): Promise<Exercise> {
    const id = newId();
    const ts = now();

    // Insert and get the inserted row back directly
    const [insertedExercise] = await db.insert(exercises).values({
        ...data,
        id,
        created_at: ts,
        updated_at: ts,
        is_synced: 0,
    }).returning();

    return insertedExercise;
}

export async function updateExerciseById(
    id: string,
    patch: Partial<Omit<NewExercise, 'id' | 'user_id'>>
) {
    await db
        .update(exercises)
        .set({ ...patch, updated_at: now(), is_synced: 0 })
        .where(eq(exercises.id, id));
}

export async function softDeleteExerciseById(id: string) {
    await db
        .update(exercises)
        .set({ deleted_at: now(), updated_at: now(), is_synced: 0 })
        .where(eq(exercises.id, id));
}

export async function getExerciseById(id: string) {
    const [row] = await db
        .select()
        .from(exercises)
        .where(and(eq(exercises.id, id), isNull(exercises.deleted_at)));
    return row ?? null;
}