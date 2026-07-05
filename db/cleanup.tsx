// db/cleanup.ts
import { db } from '@/db/client';
import {
    users,
    exercises,
    workouts,
    workout_exercises,
    workout_exercise_sets,
    exercise_body_parts, sync_metadata, body_weight_entries,
    // Don't delete body_parts - they're shared static data
} from '@/db/schema';
import { logger } from '@/utils/logger';

export async function clearAllUserData() {
    logger.debug('Clearing all local user data...');
    try {
        // Delete in reverse order of foreign key dependencies
        await db.delete(workout_exercise_sets);
        logger.debug('Cleared workout_exercise_sets');

        await db.delete(workout_exercises);
        logger.debug('Cleared workout_exercises');

        await db.delete(workouts);
        logger.debug('Cleared workouts');

        await db.delete(exercise_body_parts);
        logger.debug('Cleared exercise_body_parts');

        await db.delete(exercises);
        logger.debug('Cleared exercises');

        await db.delete(users);
        logger.debug('Cleared users');

        await db.delete(body_weight_entries);
        logger.debug('Cleared body_weight_entries');

        await db.delete(sync_metadata);
        logger.debug('Cleared sync_metadata');

        logger.debug('✅ All local user data cleared');
        return true;
    } catch (error) {
        logger.error('❌ Failed to clear local data:', error);
        return false;
    }
}