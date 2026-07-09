// Tests for statistics aggregation — total workouts, volume, and the weekly
// streak algorithm. Previously untested.
import * as testDb from '@/test-utils/db';

jest.mock('@/db/client', () => require('@/test-utils/db'));

import { getTotalWorkouts, getTotalVolume, getWorkoutStreak } from '@/repositories/statistics';
import { workout_exercise_sets } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { seedUser, seedExercise, createWorkoutWithSets, resetSeq } from '@/test-utils/fixtures';

const RANGE_START = '2000-01-01T00:00:00.000Z';
const RANGE_END = '2100-01-01T00:00:00.000Z';

beforeEach(() => {
    testDb.resetTestDb();
    resetSeq();
});
afterAll(() => testDb.closeTestDb());

describe('getTotalWorkouts', () => {
    it('counts only completed, non-deleted workouts within the date range', async () => {
        const userId = await seedUser();
        const exerciseId = await seedExercise(userId);

        // in range, completed
        await createWorkoutWithSets({ userId, exerciseId, completedAt: '2026-01-01T00:00:00.000Z', sets: [] });
        await createWorkoutWithSets({ userId, exerciseId, completedAt: '2026-02-01T00:00:00.000Z', sets: [] });
        // in-progress (completed_at null) — excluded
        await createWorkoutWithSets({ userId, exerciseId, completedAt: null, sets: [] });
        // deleted — excluded
        await createWorkoutWithSets({
            userId, exerciseId, completedAt: '2026-03-01T00:00:00.000Z', sets: [],
            deletedAt: '2026-03-02T00:00:00.000Z',
        });

        const count = await getTotalWorkouts(userId, RANGE_START, RANGE_END);
        expect(count).toBe(2);
    });

    it('excludes workouts completed outside the range', async () => {
        const userId = await seedUser();
        const exerciseId = await seedExercise(userId);
        await createWorkoutWithSets({ userId, exerciseId, completedAt: '2026-06-15T00:00:00.000Z', sets: [] });

        const count = await getTotalWorkouts(userId, '2026-01-01T00:00:00.000Z', '2026-03-01T00:00:00.000Z');
        expect(count).toBe(0);
    });
});

describe('getTotalVolume', () => {
    it('sums weight × reps across sets of completed workouts', async () => {
        const userId = await seedUser();
        const exerciseId = await seedExercise(userId);
        await createWorkoutWithSets({
            userId, exerciseId, completedAt: '2026-01-01T00:00:00.000Z',
            sets: [{ reps: 10, weight: 100 }, { reps: 5, weight: 110 }],
        });

        // 100*10 + 110*5 = 1550
        expect(await getTotalVolume(userId, RANGE_START, RANGE_END)).toBe(1550);
    });

    it('excludes deleted sets from the volume', async () => {
        const userId = await seedUser();
        const exerciseId = await seedExercise(userId);
        const { setIds } = await createWorkoutWithSets({
            userId, exerciseId, completedAt: '2026-01-01T00:00:00.000Z',
            sets: [{ reps: 10, weight: 100 }, { reps: 10, weight: 100 }],
        });
        // soft-delete the second set
        await testDb.db.update(workout_exercise_sets)
            .set({ deleted_at: '2026-01-02T00:00:00.000Z' })
            .where(eq(workout_exercise_sets.id, setIds[1]));

        expect(await getTotalVolume(userId, RANGE_START, RANGE_END)).toBe(1000);
    });
});

describe('getWorkoutStreak', () => {
    it('returns zeros when there are no workouts', async () => {
        const userId = await seedUser();
        expect(await getWorkoutStreak(userId)).toEqual({ current: 0, longest: 0 });
    });

    it('computes the longest run of consecutive weeks', async () => {
        const userId = await seedUser();
        const exerciseId = await seedExercise(userId);
        // Three consecutive ISO %W weeks (Mondays), then a gap, then one more.
        for (const d of ['2026-01-05', '2026-01-12', '2026-01-19', '2026-02-09']) {
            await createWorkoutWithSets({
                userId, exerciseId, completedAt: `${d}T12:00:00.000Z`, sets: [],
            });
        }

        const { longest, current } = await getWorkoutStreak(userId);
        expect(longest).toBe(3);
        // last workout is far in the past relative to "now" → no active streak
        expect(current).toBe(0);
    });

    it('collapses multiple workouts in the same week into one streak week', async () => {
        const userId = await seedUser();
        const exerciseId = await seedExercise(userId);
        await createWorkoutWithSets({ userId, exerciseId, completedAt: '2026-01-05T12:00:00.000Z', sets: [] });
        await createWorkoutWithSets({ userId, exerciseId, completedAt: '2026-01-07T12:00:00.000Z', sets: [] });

        const { longest } = await getWorkoutStreak(userId);
        expect(longest).toBe(1);
    });
});
