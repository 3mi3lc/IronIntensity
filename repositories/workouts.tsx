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

export async function updateWorkoutNameById(id: string, name: string):Promise<Workout | null> {
    const [updatedWorkout] = await db
        .update(workouts)
        .set({name, updated_at: now(), is_synced: 0})
        .where(and(eq(workouts.id, id), isNull(workouts.deleted_at)))
        .returning();

    return updatedWorkout;
}

export async function softDeleteWorkoutById(id: string):Promise<Workout | null> {
    const [deletedWorkout] = await db
        .update(workouts)
        .set({ deleted_at: now(), updated_at: now(), is_synced: 0 })
        .where(eq(workouts.id, id))
        .returning();

    return deletedWorkout;
}

export async function getWorkoutById(id: string):Promise<Workout | null> {
    const [workout] = await db
        .select()
        .from(workouts)
        .where(and(eq(workouts.id, id), isNull(workouts.deleted_at)));

    return workout;
}