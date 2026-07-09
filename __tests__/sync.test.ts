// SyncService tests — the regression anchor for Phase 1 (sync layer collapse).
// The local side uses the real in-memory SQLite harness; the remote side uses a
// fake Supabase client that records upsert payloads and serves preset data.
import * as testDb from '@/test-utils/db';
import * as fakeSb from '@/test-utils/fakeSupabase';

jest.mock('@/db/client', () => require('@/test-utils/db'));
jest.mock('@/utils/supabase', () => require('@/test-utils/fakeSupabase'));

import { SyncService } from '@/db/sync';
import {
    exercises,
    workouts,
    workout_exercises,
    workout_exercise_sets,
    sync_metadata,
} from '@/db/schema';
import { eq } from 'drizzle-orm';
import { seedUser, seedExercise, createWorkoutWithSets, resetSeq } from '@/test-utils/fixtures';

const USER = 'user-1';
const TS = '2026-01-01T00:00:00.000Z';

beforeEach(() => {
    testDb.resetTestDb();
    fakeSb.resetSupabase();
    resetSeq();
});
afterAll(() => testDb.closeTestDb());

describe('SyncService.pushExercises', () => {
    it('sends the exact column projection and marks rows synced locally', async () => {
        await seedUser(USER);
        await seedExercise(USER, 'ex-1', 'Bench');

        const ok = await new SyncService(USER).pushExercises();

        expect(ok).toBe(true);
        expect(fakeSb.store.upserts.exercises).toEqual([{
            id: 'ex-1',
            user_id: USER,
            name: 'Bench',
            description: null,
            created_at: TS,
            updated_at: TS,
            deleted_at: null,
        }]);

        const [ex] = await testDb.db.select().from(exercises).where(eq(exercises.id, 'ex-1'));
        expect(ex.is_synced).toBe(1);
    });

    it('is a no-op when there is nothing unsynced', async () => {
        const ok = await new SyncService(USER).pushExercises();
        expect(ok).toBe(true);
        expect(fakeSb.store.upserts.exercises).toBeUndefined();
    });

    it('returns false and does NOT mark synced when the remote upsert fails', async () => {
        await seedUser(USER);
        await seedExercise(USER, 'ex-1', 'Bench');
        fakeSb.store.failUpsert.add('exercises');

        const ok = await new SyncService(USER).pushExercises();

        expect(ok).toBe(false);
        const [ex] = await testDb.db.select().from(exercises).where(eq(exercises.id, 'ex-1'));
        expect(ex.is_synced).toBe(0); // still needs syncing on next attempt

        const [meta] = await testDb.db.select().from(sync_metadata)
            .where(eq(sync_metadata.key, 'last_sync_exercises'));
        expect(meta.status).toBe('failed');
    });
});

describe('SyncService.pushWorkouts', () => {
    it('includes completed_at in the pushed columns', async () => {
        await seedUser(USER);
        const exerciseId = await seedExercise(USER);
        await createWorkoutWithSets({
            userId: USER, exerciseId, completedAt: TS, sets: [], workoutId: 'w-1',
        });

        const ok = await new SyncService(USER).pushWorkouts();

        expect(ok).toBe(true);
        expect(fakeSb.store.upserts.workouts[0]).toMatchObject({
            id: 'w-1',
            user_id: USER,
            completed_at: TS,
            deleted_at: null,
        });
    });
});

describe('SyncService.pushSets — parent cascade', () => {
    it('soft-deletes sets whose workout_exercise is deleted, then pushes them deleted', async () => {
        await seedUser(USER);
        const exerciseId = await seedExercise(USER);
        const { workoutExerciseId, setIds } = await createWorkoutWithSets({
            userId: USER, exerciseId, completedAt: TS,
            sets: [{ reps: 10, weight: 100 }],
        });
        // Parent workout_exercise is deleted, but the set was not marked yet.
        await testDb.db.update(workout_exercises)
            .set({ deleted_at: TS })
            .where(eq(workout_exercises.id, workoutExerciseId));

        const ok = await new SyncService(USER).pushSets();

        expect(ok).toBe(true);
        const [set] = await testDb.db.select().from(workout_exercise_sets)
            .where(eq(workout_exercise_sets.id, setIds[0]));
        expect(set.deleted_at).not.toBeNull(); // cascade applied
        expect(set.is_synced).toBe(1);         // pushed
        expect(fakeSb.store.upserts.workout_exercise_sets[0]).toMatchObject({
            id: setIds[0],
            deleted_at: TS,
        });
    });
});

describe('SyncService.pushWorkoutExercises — parent cascade', () => {
    it('soft-deletes workout_exercises whose workout is deleted', async () => {
        await seedUser(USER);
        const exerciseId = await seedExercise(USER);
        const { workoutId, workoutExerciseId } = await createWorkoutWithSets({
            userId: USER, exerciseId, completedAt: TS, sets: [],
        });
        await testDb.db.update(workouts).set({ deleted_at: TS }).where(eq(workouts.id, workoutId));

        const ok = await new SyncService(USER).pushWorkoutExercises();

        expect(ok).toBe(true);
        const [we] = await testDb.db.select().from(workout_exercises)
            .where(eq(workout_exercises.id, workoutExerciseId));
        expect(we.deleted_at).not.toBeNull();
    });
});

describe('SyncService.pullExercises', () => {
    it('upserts remote rows locally as synced and records last-sync time', async () => {
        await seedUser(USER);
        fakeSb.store.remote.exercises = [{
            id: 'remote-ex', user_id: USER, name: 'Deadlift', description: null,
            created_at: TS, updated_at: TS, deleted_at: null,
        }];

        const ok = await new SyncService(USER).pullExercises();

        expect(ok).toBe(true);
        const [ex] = await testDb.db.select().from(exercises).where(eq(exercises.id, 'remote-ex'));
        expect(ex.name).toBe('Deadlift');
        expect(ex.is_synced).toBe(1); // pulled rows are already in sync

        const [meta] = await testDb.db.select().from(sync_metadata)
            .where(eq(sync_metadata.key, 'last_sync_exercises'));
        expect(meta.last_sync).toBeTruthy();
    });
});

describe('SyncService.pullWorkoutExercises', () => {
    it('lands remote rows locally despite the nested join object', async () => {
        await seedUser(USER);
        fakeSb.store.remote.workout_exercises = [{
            id: 'we-remote', workout_id: 'w-remote', exercise_id: 'ex-remote', order_index: 1,
            created_at: TS, updated_at: TS, deleted_at: null,
            workouts: { user_id: USER }, // nested join Supabase returns; must be stripped
        }];

        const ok = await new SyncService(USER).pullWorkoutExercises();

        expect(ok).toBe(true);
        const [we] = await testDb.db.select().from(workout_exercises)
            .where(eq(workout_exercises.id, 'we-remote'));
        expect(we.workout_id).toBe('w-remote');
        expect(we.is_synced).toBe(1);
    });
});
