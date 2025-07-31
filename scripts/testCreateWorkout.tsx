import { createWorkout } from '@/repositories/workouts';
import { db } from '@/db/client';
import { workouts } from '@/db/schema';

async function main() {
    const workout = await createWorkout({
        user_id: 'user-1',
        name: 'Test Workout',
        deleted_at: null,
    });

    console.log('Workout created:', workout);
    console.log('All workouts:', await db.select().from(workouts));
    process.exit(0);
}

main();
