import * as testDb from '@/test-utils/db';
import * as fakeSb from '@/test-utils/fakeSupabase';

jest.mock('@/db/client', () => require('@/test-utils/db'));
jest.mock('@/utils/supabase', () => require('@/test-utils/fakeSupabase'));

import { unlockAchievements, getUnlockedAchievementIds } from '@/repositories/userAchievements';
import { SyncService } from '@/db/sync';
import { user_achievements } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { seedUser, resetSeq } from '@/test-utils/fixtures';

beforeEach(() => {
    testDb.resetTestDb();
    fakeSb.resetSupabase();
    resetSeq();
});
afterAll(() => testDb.closeTestDb());

describe('userAchievements repository', () => {
    it('persists unlocked ids and reads them back', async () => {
        await seedUser('u1');
        await unlockAchievements('u1', ['welcome', 'pr_1']);

        const ids = await getUnlockedAchievementIds('u1');
        expect([...ids].sort()).toEqual(['pr_1', 'welcome']);
    });

    it('is idempotent — re-unlocking neither throws nor duplicates', async () => {
        await seedUser('u1');
        await unlockAchievements('u1', ['welcome']);
        await unlockAchievements('u1', ['welcome', 'pr_1']); // welcome already present

        const ids = await getUnlockedAchievementIds('u1');
        expect([...ids].sort()).toEqual(['pr_1', 'welcome']);
    });

    it('scopes unlocked ids per user', async () => {
        await seedUser('u1');
        await seedUser('u2');
        await unlockAchievements('u1', ['welcome']);
        await unlockAchievements('u2', ['pr_1']);

        expect([...await getUnlockedAchievementIds('u1')]).toEqual(['welcome']);
        expect([...await getUnlockedAchievementIds('u2')]).toEqual(['pr_1']);
    });
});

describe('SyncService — user achievements', () => {
    it('pushes the right columns (no is_synced) and marks rows synced', async () => {
        await seedUser('u1');
        await unlockAchievements('u1', ['welcome']);

        const ok = await new SyncService('u1').pushUserAchievements();

        expect(ok).toBe(true);
        const payload = fakeSb.store.upserts.user_achievements[0];
        expect(payload).toMatchObject({ user_id: 'u1', achievement_id: 'welcome' });
        expect(payload).not.toHaveProperty('is_synced'); // local-only column

        const [row] = await testDb.db.select().from(user_achievements)
            .where(eq(user_achievements.achievement_id, 'welcome'));
        expect(row.is_synced).toBe(1);
    });

    it('pulls remote achievements into the local table as synced', async () => {
        await seedUser('u1');
        fakeSb.store.remote.user_achievements = [{
            user_id: 'u1', achievement_id: 'pr_10', unlocked_at: '2026-01-01T00:00:00.000Z',
            created_at: '2026-01-01T00:00:00.000Z', updated_at: '2026-01-01T00:00:00.000Z', deleted_at: null,
        }];

        const ok = await new SyncService('u1').pullUserAchievements();

        expect(ok).toBe(true);
        expect((await getUnlockedAchievementIds('u1')).has('pr_10')).toBe(true);
    });
});
