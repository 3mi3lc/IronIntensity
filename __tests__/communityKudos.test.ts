jest.mock('@/db/client', () => require('@/test-utils/db'));
jest.mock('@/utils/supabase', () => require('@/test-utils/fakeSupabase'));

import { applyPendingKudos, FeedEvent } from '@/repositories/communities';

const event = (over: Partial<FeedEvent> = {}): FeedEvent => ({
    id: 'e1',
    actor_user_id: 'u1',
    actor_username: 'Sam',
    type: 'workout_completed',
    payload: {},
    created_at: '2026-07-10T00:00:00.000Z',
    kudos_count: 2,
    i_kudosed: false,
    rsvp_count: 0,
    i_rsvped: false,
    ...over,
});

describe('applyPendingKudos', () => {
    it('returns the event unchanged when there is no pending op', () => {
        const e = event();
        expect(applyPendingKudos(e, undefined)).toBe(e);
    });

    it('applies a queued add: marks kudosed and increments the count', () => {
        const r = applyPendingKudos(event({ i_kudosed: false, kudos_count: 2 }), 'add');
        expect(r.i_kudosed).toBe(true);
        expect(r.kudos_count).toBe(3);
    });

    it('applies a queued remove: clears kudosed and decrements the count', () => {
        const r = applyPendingKudos(event({ i_kudosed: true, kudos_count: 2 }), 'remove');
        expect(r.i_kudosed).toBe(false);
        expect(r.kudos_count).toBe(1);
    });

    it('is a no-op when the queued op matches the current state', () => {
        expect(applyPendingKudos(event({ i_kudosed: true }), 'add').kudos_count).toBe(2);
        expect(applyPendingKudos(event({ i_kudosed: false }), 'remove').kudos_count).toBe(2);
    });

    it('never drives the count below zero', () => {
        const r = applyPendingKudos(event({ i_kudosed: true, kudos_count: 0 }), 'remove');
        expect(r.kudos_count).toBe(0);
    });
});
