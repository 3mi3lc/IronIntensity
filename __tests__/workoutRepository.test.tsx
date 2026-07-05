// Repository tests run against a real in-memory SQLite database (see
// test-utils/db.ts) so they exercise actual query behavior — soft-delete
// filtering, cascades, ordering — rather than asserting Drizzle call shapes.
import * as testDb from '@/test-utils/db';

jest.mock('@/db/client', () => require('@/test-utils/db'));

import {
    createWorkout,
    getAllWorkouts,
    updateWorkoutNameById,
    softDeleteWorkoutById,
    getWorkoutById,
    getWorkoutWithExercisesAndSets,
} from '@/repositories/workouts';
import { workout_exercise_sets, workout_exercises } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { seedUser, seedExercise, createWorkoutWithSets, resetSeq } from '@/test-utils/fixtures';

beforeEach(() => {
    testDb.resetTestDb();
    resetSeq();
});
afterAll(() => testDb.closeTestDb());

describe('createWorkout', () => {
    it('inserts a workout with is_synced=0 and returns the row', async () => {
        await seedUser('user-1');
        const result = await createWorkout(
            { user_id: 'user-1', name: 'My Workout', deleted_at: null },
            { returnData: true },
        );

        expect(typeof result).toBe('object');
        const workout = result as Exclude<typeof result, boolean>;
        expect(workout.name).toBe('My Workout');
        expect(workout.is_synced).toBe(0);
        expect(workout.id).toBeTruthy();
    });

    it('honors an explicit created_at', async () => {
        await seedUser('user-1');
        const result = await createWorkout(
            { user_id: 'user-1', name: 'Dated', created_at: '2025-05-01T00:00:00.000Z', deleted_at: null },
            { returnData: true },
        ) as { created_at: string };
        expect(result.created_at).toBe('2025-05-01T00:00:00.000Z');
    });
});

describe('getAllWorkouts', () => {
    it('returns only non-deleted workouts', async () => {
        const userId = await seedUser();
        const exerciseId = await seedExercise(userId);
        await createWorkoutWithSets({ userId, exerciseId, completedAt: '2026-01-01T00:00:00.000Z', sets: [] });
        await createWorkoutWithSets({
            userId, exerciseId, completedAt: '2026-01-02T00:00:00.000Z', sets: [],
            deletedAt: '2026-01-03T00:00:00.000Z',
        });

        const all = await getAllWorkouts();
        expect(all).toHaveLength(1);
    });
});

describe('updateWorkoutNameById', () => {
    it('updates the name and flags for sync', async () => {
        const userId = await seedUser();
        const exerciseId = await seedExercise(userId);
        const { workoutId } = await createWorkoutWithSets({
            userId, exerciseId, completedAt: '2026-01-01T00:00:00.000Z', sets: [],
        });

        await updateWorkoutNameById(workoutId, 'Renamed');

        const w = await getWorkoutById(workoutId);
        expect(w?.name).toBe('Renamed');
        expect(w?.is_synced).toBe(0);
    });
});

describe('softDeleteWorkoutById', () => {
    it('cascades the soft-delete to workout_exercises and their sets', async () => {
        const userId = await seedUser();
        const exerciseId = await seedExercise(userId);
        const { workoutId, workoutExerciseId, setIds } = await createWorkoutWithSets({
            userId, exerciseId, completedAt: '2026-01-01T00:00:00.000Z',
            sets: [{ reps: 10, weight: 100 }, { reps: 8, weight: 110 }],
        });

        const ok = await softDeleteWorkoutById(workoutId);
        expect(ok).toBe(true);

        // Workout hidden from reads
        expect(await getWorkoutById(workoutId)).toBeNull();

        // workout_exercise marked deleted
        const [we] = await testDb.db.select().from(workout_exercises).where(eq(workout_exercises.id, workoutExerciseId));
        expect(we.deleted_at).not.toBeNull();
        expect(we.is_synced).toBe(0);

        // every set marked deleted
        for (const setId of setIds) {
            const [s] = await testDb.db.select().from(workout_exercise_sets).where(eq(workout_exercise_sets.id, setId));
            expect(s.deleted_at).not.toBeNull();
            expect(s.is_synced).toBe(0);
        }
    });
});

describe('getWorkoutById', () => {
    it('returns null for a deleted workout', async () => {
        const userId = await seedUser();
        const exerciseId = await seedExercise(userId);
        const { workoutId } = await createWorkoutWithSets({
            userId, exerciseId, completedAt: '2026-01-01T00:00:00.000Z', sets: [],
            deletedAt: '2026-01-02T00:00:00.000Z',
        });
        expect(await getWorkoutById(workoutId)).toBeNull();
    });

    it('returns null for an unknown id', async () => {
        expect(await getWorkoutById('nope')).toBeNull();
    });
});

describe('getWorkoutWithExercisesAndSets', () => {
    it('returns exercises with their non-deleted sets ordered by set_number', async () => {
        const userId = await seedUser();
        const exerciseId = await seedExercise(userId, 'ex-bench', 'Bench');
        const { workoutId } = await createWorkoutWithSets({
            userId, exerciseId, completedAt: '2026-01-01T00:00:00.000Z',
            sets: [{ reps: 10, weight: 100 }, { reps: 8, weight: 110 }],
        });

        const data = await getWorkoutWithExercisesAndSets(workoutId);
        expect(data).toHaveLength(1);
        expect(data[0].exercise.name).toBe('Bench');
        expect(data[0].sets.map(s => s.setNumber)).toEqual([1, 2]);
    });
});
