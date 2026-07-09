import * as testDb from '@/test-utils/db';

jest.mock('@/db/client', () => require('@/test-utils/db'));

import { getAllAchievementsWithStatus, syncUnlockedAchievements } from '@/repositories/achievements';
import { workout_exercise_sets, body_weight_entries, workouts, exercise_body_parts } from '@/db/schema';
import { eq, inArray } from 'drizzle-orm';
import { seedUser, seedExercise, createWorkoutWithSets, resetSeq } from '@/test-utils/fixtures';

beforeEach(() => {
    testDb.resetTestDb();
    resetSeq();
});
afterAll(() => testDb.closeTestDb());

const byId = <T extends { id: string }>(list: T[], id: string): T => list.find(a => a.id === id)!;

async function addBodyweightEntries(userId: string, n: number) {
    const ts = '2026-01-01T00:00:00.000Z';
    for (let i = 0; i < n; i++) {
        await testDb.db.insert(body_weight_entries).values({
            id: `bw-${userId}-${i}`, user_id: userId, weight: 80, recorded_at: ts,
            created_at: ts, updated_at: ts, is_synced: 0,
        });
    }
}

describe('getAllAchievementsWithStatus', () => {
    it('always unlocks the welcome seed badge (board never reads 0%)', async () => {
        const userId = await seedUser();
        const list = await getAllAchievementsWithStatus(userId, 0, 0);
        const welcome = byId(list, 'welcome');
        expect(welcome.unlocked).toBe(true);
        expect(welcome.progressPercent).toBe(1);
    });

    it('reports progress on a locked badge', async () => {
        const userId = await seedUser();
        const exerciseId = await seedExercise(userId);
        // 5 completed workouts → workouts_10 is half-way, still locked
        for (let i = 0; i < 5; i++) {
            await createWorkoutWithSets({ userId, exerciseId, completedAt: '2026-01-01T00:00:00.000Z', sets: [] });
        }

        const w10 = byId(await getAllAchievementsWithStatus(userId, 0, 0), 'workouts_10');
        expect(w10.unlocked).toBe(false);
        expect(w10.progress).toBe(5);
        expect(w10.progressPercent).toBe(0.5);
    });

    it('unlocks by volume, workouts, streak, PRs and bodyweight thresholds', async () => {
        const userId = await seedUser();
        const exerciseId = await seedExercise(userId);
        // volume 1000 (unlocks volume_1k) + a PR
        const { setIds } = await createWorkoutWithSets({
            userId, exerciseId, completedAt: '2026-01-01T00:00:00.000Z', sets: [{ reps: 10, weight: 100 }],
        });
        await testDb.db.update(workout_exercise_sets).set({ is_pr: 1 }).where(inArray(workout_exercise_sets.id, setIds));
        await addBodyweightEntries(userId, 1);

        const list = await getAllAchievementsWithStatus(userId, 4, 4); // streak 4

        expect(byId(list, 'volume_1k').unlocked).toBe(true);
        expect(byId(list, 'streak_4').unlocked).toBe(true);
        expect(byId(list, 'pr_1').unlocked).toBe(true);
        expect(byId(list, 'bw_1').unlocked).toBe(true);
        expect(byId(list, 'volume_10k').unlocked).toBe(false);
    });
});

describe('new categories (variety / strength / reps / muscles)', () => {
    it('tracks distinct exercises, heaviest lift, total reps and muscle coverage', async () => {
        const userId = await seedUser();
        const bench = await seedExercise(userId, 'ex-bench', 'Bench');
        const squat = await seedExercise(userId, 'ex-squat', 'Squat');
        const dead = await seedExercise(userId, 'ex-dead', 'Deadlift');

        const ts = '2026-01-01T00:00:00.000Z';
        await testDb.db.insert(exercise_body_parts).values([
            { exercise_id: 'ex-bench', body_part_id: 'chest', created_at: ts, updated_at: ts, is_synced: 0 },
            { exercise_id: 'ex-squat', body_part_id: 'quads', created_at: ts, updated_at: ts, is_synced: 0 },
            { exercise_id: 'ex-dead', body_part_id: 'back', created_at: ts, updated_at: ts, is_synced: 0 },
        ]);
        await createWorkoutWithSets({ userId, exerciseId: bench, completedAt: ts, sets: [{ reps: 10, weight: 80 }] });
        await createWorkoutWithSets({ userId, exerciseId: squat, completedAt: ts, sets: [{ reps: 5, weight: 120 }] });
        await createWorkoutWithSets({ userId, exerciseId: dead, completedAt: ts, sets: [{ reps: 8, weight: 100 }] });

        const list = await getAllAchievementsWithStatus(userId, 0, 0);

        // 3 distinct exercises
        expect(byId(list, 'variety_3').unlocked).toBe(true);
        expect(byId(list, 'variety_3').progress).toBe(3);
        expect(byId(list, 'variety_5').unlocked).toBe(false);

        // heaviest single set = 120 kg
        expect(byId(list, 'strength_100').unlocked).toBe(true);
        expect(byId(list, 'strength_140').unlocked).toBe(false);

        // total reps = 10 + 5 + 8 = 23
        expect(byId(list, 'reps_500').progress).toBe(23);
        expect(byId(list, 'reps_500').unlocked).toBe(false);

        // 3 distinct muscle groups
        expect(byId(list, 'muscles_3').unlocked).toBe(true);
        expect(byId(list, 'muscles_3').progress).toBe(3);
        expect(byId(list, 'muscles_5').unlocked).toBe(false);
    });
});

describe('syncUnlockedAchievements', () => {
    it('persists newly-met badges and returns only the new ones', async () => {
        const userId = await seedUser();
        const exerciseId = await seedExercise(userId);
        await createWorkoutWithSets({
            userId, exerciseId, completedAt: '2026-01-01T00:00:00.000Z', sets: [{ reps: 10, weight: 100 }],
        });

        const first = await syncUnlockedAchievements(userId, 0, 0);
        const ids = first.map(a => a.id).sort();
        expect(ids).toContain('welcome');
        expect(ids).toContain('volume_1k');

        // Second call: nothing new
        const second = await syncUnlockedAchievements(userId, 0, 0);
        expect(second).toEqual([]);
    });

    it('keeps a badge unlocked after its metric drops (persistence)', async () => {
        const userId = await seedUser();
        const exerciseId = await seedExercise(userId);
        const { workoutId } = await createWorkoutWithSets({
            userId, exerciseId, completedAt: '2026-01-01T00:00:00.000Z', sets: [{ reps: 10, weight: 100 }],
        });

        await syncUnlockedAchievements(userId, 0, 0); // persists volume_1k

        // Soft-delete the workout → live volume drops to 0
        await testDb.db.update(workouts).set({ deleted_at: '2026-02-01T00:00:00.000Z' }).where(eq(workouts.id, workoutId));

        const v1k = byId(await getAllAchievementsWithStatus(userId, 0, 0), 'volume_1k');
        expect(v1k.unlocked).toBe(true);        // stays unlocked (persisted)
        expect(v1k.progress).toBe(0);           // but live progress reflects reality
    });
});
