// Tests for personal-record logic — previously untested and among the most
// complex code in the repo (time-aware, incremental running-best per exercise).
import * as testDb from '@/test-utils/db';

jest.mock('@/db/client', () => require('@/test-utils/db'));

import { markPRsForWorkout, checkAndMarkSetAsPR } from '@/repositories/workoutExerciseSets';
import { workout_exercise_sets } from '@/db/schema';
import { eq, inArray } from 'drizzle-orm';
import { seedUser, seedExercise, createWorkoutWithSets, resetSeq } from '@/test-utils/fixtures';

beforeEach(() => {
    testDb.resetTestDb();
    resetSeq();
});
afterAll(() => testDb.closeTestDb());

async function prFlags(setIds: string[]): Promise<number[]> {
    const rows = await testDb.db
        .select({ id: workout_exercise_sets.id, is_pr: workout_exercise_sets.is_pr })
        .from(workout_exercise_sets)
        .where(inArray(workout_exercise_sets.id, setIds));
    const byId = new Map(rows.map(r => [r.id, r.is_pr]));
    return setIds.map(id => byId.get(id)!);
}

describe('markPRsForWorkout', () => {
    it('treats the first-ever set as a baseline, not a PR', async () => {
        const userId = await seedUser();
        const exerciseId = await seedExercise(userId);
        const { workoutId, setIds } = await createWorkoutWithSets({
            userId, exerciseId, completedAt: '2026-01-01T00:00:00.000Z',
            sets: [{ reps: 10, weight: 100 }],
        });

        await markPRsForWorkout(workoutId);

        expect(await prFlags(setIds)).toEqual([0]);
    });

    it('marks only sets that beat the running best within a workout', async () => {
        const userId = await seedUser();
        const exerciseId = await seedExercise(userId);
        // baseline 100x10, then 110x8 (heavier → PR), then 105x10 (not better)
        const { workoutId, setIds } = await createWorkoutWithSets({
            userId, exerciseId, completedAt: '2026-01-01T00:00:00.000Z',
            sets: [
                { reps: 10, weight: 100 },
                { reps: 8, weight: 110 },
                { reps: 10, weight: 105 },
            ],
        });

        await markPRsForWorkout(workoutId);

        expect(await prFlags(setIds)).toEqual([0, 1, 0]);
    });

    it('uses history from earlier workouts to judge a later workout', async () => {
        const userId = await seedUser();
        const exerciseId = await seedExercise(userId);
        await createWorkoutWithSets({
            userId, exerciseId, completedAt: '2026-01-01T00:00:00.000Z',
            sets: [{ reps: 10, weight: 100 }],
        });
        const later = await createWorkoutWithSets({
            userId, exerciseId, completedAt: '2026-01-08T00:00:00.000Z',
            sets: [{ reps: 10, weight: 105 }],
        });

        await markPRsForWorkout(later.workoutId);

        // 105 beats the historical best of 100 → PR
        expect(await prFlags(later.setIds)).toEqual([1]);
    });

    it('ties on weight require more reps to count as a PR', async () => {
        const userId = await seedUser();
        const exerciseId = await seedExercise(userId);
        await createWorkoutWithSets({
            userId, exerciseId, completedAt: '2026-01-01T00:00:00.000Z',
            sets: [{ reps: 8, weight: 100 }],
        });
        const w2 = await createWorkoutWithSets({
            userId, exerciseId, completedAt: '2026-01-08T00:00:00.000Z',
            sets: [{ reps: 8, weight: 100 }, { reps: 9, weight: 100 }],
        });

        await markPRsForWorkout(w2.workoutId);

        // same weight+reps as history → not PR; same weight but +1 rep → PR
        expect(await prFlags(w2.setIds)).toEqual([0, 1]);
    });

    it('clears a stale PR flag when it is no longer a record', async () => {
        const userId = await seedUser();
        const exerciseId = await seedExercise(userId);
        const { workoutId, setIds } = await createWorkoutWithSets({
            userId, exerciseId, completedAt: '2026-01-01T00:00:00.000Z',
            sets: [{ reps: 10, weight: 100 }],
        });
        // pretend it was wrongly flagged before
        await testDb.db.update(workout_exercise_sets)
            .set({ is_pr: 1 }).where(eq(workout_exercise_sets.id, setIds[0]));

        await markPRsForWorkout(workoutId);

        expect(await prFlags(setIds)).toEqual([0]);
    });
});

describe('checkAndMarkSetAsPR', () => {
    it('returns false and clears is_pr when there is no prior history', async () => {
        const userId = await seedUser();
        const exerciseId = await seedExercise(userId);
        const { setIds } = await createWorkoutWithSets({
            userId, exerciseId, completedAt: '2026-01-01T00:00:00.000Z',
            sets: [{ reps: 10, weight: 100 }],
        });

        const result = await checkAndMarkSetAsPR(setIds[0], exerciseId, 100, 10);

        expect(result).toBe(false);
        expect(await prFlags(setIds)).toEqual([0]);
    });

    it('marks a set as PR and returns true when it beats all other sets', async () => {
        const userId = await seedUser();
        const exerciseId = await seedExercise(userId);
        const { setIds } = await createWorkoutWithSets({
            userId, exerciseId, completedAt: '2026-01-01T00:00:00.000Z',
            sets: [{ reps: 10, weight: 100 }, { reps: 10, weight: 120 }],
        });

        // second set (120) vs other set (100) → PR
        const result = await checkAndMarkSetAsPR(setIds[1], exerciseId, 120, 10);

        expect(result).toBe(true);
        expect((await prFlags([setIds[1]]))[0]).toBe(1);
    });
});
