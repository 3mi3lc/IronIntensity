// src/repositories/workouts.ts
import {db} from '@/db/client';
import { workouts} from '@/db/schema';
import {and, eq, isNull} from 'drizzle-orm';
import {newId, now} from '@/utils/id';
import type {NewWorkout, Workout} from './types';

export async function getAllWorkouts(): Promise<Workout[]> {
    return db.select().from(workouts);
}

export async function createWorkout(
    data: Omit<NewWorkout, 'id' | 'created_at' | 'updated_at' | 'is_synced'>
): Promise<Workout> {
    const id = newId();
    const ts = now();

    // Insert and get the inserted row back directly
    const [insertedWorkout] = await db.insert(workouts).values({
        ...data,
        id,
        created_at: ts,
        updated_at: ts,
        is_synced: 0,
    }).returning();

    return insertedWorkout;
}

export async function updateWorkoutName(id: string, name: string) {
    await db
        .update(workouts)
        .set({ name, updated_at: now(), is_synced: 0 })
        .where(eq(workouts.id, id));
}

export async function softDeleteWorkout(id: string) {
    await db
        .update(workouts)
        .set({ deleted_at: now(), updated_at: now(), is_synced: 0 })
        .where(eq(workouts.id, id));
}

export async function getWorkoutById(id: string) {
    const [row] = await db
        .select()
        .from(workouts)
        .where(and(eq(workouts.id, id), isNull(workouts.deleted_at)));
    return row ?? null;
}