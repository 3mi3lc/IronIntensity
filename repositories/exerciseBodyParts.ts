import {db} from '@/db/client';
import { logger } from '@/utils/logger';
import { exercise_body_parts} from '@/db/schema';
import {and, eq} from 'drizzle-orm';
import { ExerciseBodyPart} from "@/repositories/types";

// Add a body part to an exercise
export async function addBodyPartToExercise(
    exercise_id: string,
    body_part_id: string,
    options?: { returnData?: boolean }
): Promise<ExerciseBodyPart | boolean> {
    const query = db.insert(exercise_body_parts).values({
        exercise_id,
        body_part_id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        is_synced: 0
    });

    if (options?.returnData) {
        const [insertedRecord] = await query.returning();
        return insertedRecord;
    }

    const result = await query;
    return result.changes > 0;
}

export async function getUnsyncedExerciseBodyParts(): Promise<ExerciseBodyPart[]> {
    return db
        .select()
        .from(exercise_body_parts)
        .where(eq(exercise_body_parts.is_synced, 0));
}

export async function markExerciseBodyPartsAsSynced(
    items: Array<{ exercise_id: string; body_part_id: string }>
): Promise<boolean> {
    if (items.length === 0) return true;

    // Since exercise_body_parts has a composite primary key,
    // we need to update each one individually
    let successCount = 0;

    for (const item of items) {
        const result = await db
            .update(exercise_body_parts)
            .set({ is_synced: 1 })
            .where(
                and(
                    eq(exercise_body_parts.exercise_id, item.exercise_id),
                    eq(exercise_body_parts.body_part_id, item.body_part_id)
                )
            );

        if (result.changes > 0) successCount++;
    }

    return successCount === items.length;
}

// For upserting exercise body parts from remote (pull operation)
export async function upsertExerciseBodyPartFromRemote(exerciseBodyPart: ExerciseBodyPart): Promise<boolean> {
    try {
        await db.insert(exercise_body_parts)
            .values({
                exercise_id: exerciseBodyPart.exercise_id,
                body_part_id: exerciseBodyPart.body_part_id,
                created_at: exerciseBodyPart.created_at,
                updated_at: exerciseBodyPart.updated_at,
                deleted_at: exerciseBodyPart.deleted_at,
                is_synced: 1,
            })
            .onConflictDoUpdate({
                target: [exercise_body_parts.exercise_id, exercise_body_parts.body_part_id],
                set: {
                    updated_at: exerciseBodyPart.updated_at,
                    deleted_at: exerciseBodyPart.deleted_at,
                    is_synced: 1,
                }
            });
        return true;
    } catch (error) {
        logger.error('Failed to upsert exercise body part:', error);
        return false;
    }
}

// Batch upsert exercise body parts from remote
export async function upsertExerciseBodyPartsFromRemote(exerciseBodyPartsData: ExerciseBodyPart[]): Promise<boolean> {
    if (exerciseBodyPartsData.length === 0) return true;

    try {
        for (const exerciseBodyPart of exerciseBodyPartsData) {
            const success = await upsertExerciseBodyPartFromRemote(exerciseBodyPart);
            if (!success) return false;
        }
        return true;
    } catch (error) {
        logger.error('Failed to batch upsert exercise body parts:', error);
        return false;
    }
}
