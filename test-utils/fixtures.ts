// Fixture builders for repository tests. These write directly to the harness db
// (bypassing repositories) so a test can set up arbitrary state independently of
// the code under test.
import * as testDb from './db';
import {
    users,
    exercises,
    workouts,
    workout_exercises,
    workout_exercise_sets,
} from '@/db/schema';

let seq = 0;
const uid = (prefix: string) => `${prefix}-${++seq}`;

export function resetSeq(): void {
    seq = 0;
}

export async function seedUser(id = 'u1'): Promise<string> {
    await testDb.db.insert(users).values({ id, email: `${id}@example.com`, username: id });
    return id;
}

export async function seedExercise(userId: string, id = uid('ex'), name = 'Bench Press'): Promise<string> {
    const ts = '2026-01-01T00:00:00.000Z';
    await testDb.db.insert(exercises).values({
        id, user_id: userId, name, description: null,
        created_at: ts, updated_at: ts, is_synced: 0,
    });
    return id;
}

interface CreateWorkoutOpts {
    userId: string;
    exerciseId: string;
    completedAt: string | null;
    sets: Array<{ reps: number; weight: number | null }>;
    workoutId?: string;
    deletedAt?: string | null;
}

/**
 * Insert a workout with one exercise and its sets. `completedAt` null means an
 * in-progress workout. Returns the created ids for assertions.
 */
export async function createWorkoutWithSets(opts: CreateWorkoutOpts): Promise<{
    workoutId: string;
    workoutExerciseId: string;
    setIds: string[];
}> {
    const workoutId = opts.workoutId ?? uid('w');
    const workoutExerciseId = uid('we');
    const ts = opts.completedAt ?? '2026-01-01T00:00:00.000Z';

    await testDb.db.insert(workouts).values({
        id: workoutId,
        user_id: opts.userId,
        name: 'Workout',
        completed_at: opts.completedAt,
        created_at: ts,
        updated_at: ts,
        deleted_at: opts.deletedAt ?? null,
        is_synced: 0,
    });

    await testDb.db.insert(workout_exercises).values({
        id: workoutExerciseId,
        workout_id: workoutId,
        exercise_id: opts.exerciseId,
        order_index: 1,
        created_at: ts,
        updated_at: ts,
        deleted_at: opts.deletedAt ?? null,
        is_synced: 0,
    });

    const setIds: string[] = [];
    for (let i = 0; i < opts.sets.length; i++) {
        const setId = uid('set');
        setIds.push(setId);
        await testDb.db.insert(workout_exercise_sets).values({
            id: setId,
            workout_exercise_id: workoutExerciseId,
            set_number: i + 1,
            reps: opts.sets[i].reps,
            weight: opts.sets[i].weight,
            is_pr: 0,
            created_at: ts,
            updated_at: ts,
            deleted_at: opts.deletedAt ?? null,
            is_synced: 0,
        });
    }

    return { workoutId, workoutExerciseId, setIds };
}
