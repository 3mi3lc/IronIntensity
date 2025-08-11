import { db } from '@/db/client';
import {body_parts, exercise_body_parts, exercises} from '@/db/schema';
import {and, eq} from 'drizzle-orm';
import {BodyPart, Exercise, ExerciseBodyPart} from "@/repositories/types";

// Add a body part to an exercise
export async function addBodyPartToExercise(
    exercise_id: string,
    body_part_id: string,
    options?: { returnData?: boolean }
): Promise<ExerciseBodyPart | boolean> {
    await db.insert(exercise_body_parts).values({ exercise_id, body_part_id });

    if (options?.returnData) {
        const [record] = await db
            .select()
            .from(exercise_body_parts)
            .where(
                and(
                    eq(exercise_body_parts.exercise_id, exercise_id),
                    eq(exercise_body_parts.body_part_id, body_part_id)
                )
            );
        return record!;
    }

    return true;
}

// Remove a body part from an exercise (hard delete)
export async function removeBodyPartFromExercise(exercise_id: string, body_part_id: string) {
    return db
        .delete(exercise_body_parts)
        .where(
            and(
                eq(exercise_body_parts.exercise_id, exercise_id),
                eq(exercise_body_parts.body_part_id, body_part_id)
            )
        );
}

// Get all body parts linked to an exercise
export async function getBodyPartsForExercise(exercise_id: string): Promise<BodyPart[]> {
    const rows = await db
        .select()
        .from(body_parts)
        .innerJoin(
            exercise_body_parts,
            eq(body_parts.id, exercise_body_parts.body_part_id)
        )
        .where(eq(exercise_body_parts.exercise_id, exercise_id));

    return rows.map(row => row.body_parts);
}

// Get all exercises linked to a body part
export async function getExercisesForBodyPart(body_part_id: string): Promise<Exercise[]> {
    const rows = await db
        .select()
        .from(exercises)
        .innerJoin(
            exercise_body_parts,
            eq(exercises.id, exercise_body_parts.exercise_id)
        )
        .where(eq(exercise_body_parts.body_part_id, body_part_id));

    return rows.map(row => row.exercises);
}
