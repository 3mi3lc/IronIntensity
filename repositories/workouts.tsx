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
    data: Omit<NewWorkout, 'id' | 'created_at' | 'updated_at' | 'is_synced'>,
    options?: { returnData?: boolean }
): Promise<Workout | boolean> {
    const id = newId();
    const ts = now();

    const query = db.insert(workouts).values({
        ...data,
        id,
        created_at: ts,
        updated_at: ts,
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