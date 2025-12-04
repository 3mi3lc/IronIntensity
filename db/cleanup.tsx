// db/cleanup.ts
import { db } from '@/db/client';
import {
    users,
    exercises,
    workouts,
    workout_exercises,
    workout_exercise_sets,
    exercise_body_parts,
    // Don't delete body_parts - they're shared static data
} from '@/db/schema';

export async function clearAllUserData() {
    console.log('Clearing all local user data...');
    try {
        // Delete in reverse order of foreign key dependencies
        await db.delete(workout_exercise_sets);
        console.log('Cleared workout_exercise_sets');

        await db.delete(workout_exercises);
        console.log('Cleared workout_exercises');

        await db.delete(workouts);
        console.log('Cleared workouts');

        await db.delete(exercise_body_parts);
        console.log('Cleared exercise_body_parts');

        await db.delete(exercises);
        console.log('Cleared exercises');

        await db.delete(users);
        console.log('Cleared users');

        console.log('✅ All local user data cleared');
        return true;
    } catch (error) {
        console.error('❌ Failed to clear local data:', error);
        return false;
    }
}