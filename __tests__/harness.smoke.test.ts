import * as testDb from '@/test-utils/db';
import { body_parts, workouts } from '@/db/schema';
import { eq } from 'drizzle-orm';

jest.mock('@/db/client', () => require('@/test-utils/db'));

beforeEach(() => testDb.resetTestDb());
afterAll(() => testDb.closeTestDb());

describe('test harness', () => {
    it('applies migrations and seeds body_parts', async () => {
        const rows = await testDb.db.select().from(body_parts);
        expect(rows.length).toBe(16);
    });

    it('supports insert + async read on the migrated schema', async () => {
        await testDb.db.insert(workouts).values({
            id: 'w1',
            user_id: 'u1',
            name: 'Test',
            created_at: '2026-01-01T00:00:00Z',
            updated_at: '2026-01-01T00:00:00Z',
            is_synced: 0,
        });
        const [row] = await testDb.db.select().from(workouts).where(eq(workouts.id, 'w1'));
        expect(row.name).toBe('Test');
        expect(row.completed_at).toBeNull();
    });
});
