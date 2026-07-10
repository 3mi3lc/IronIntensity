import { db } from '@/db/client';
import { pending_kudos } from '@/db/schema';
import { and, eq } from 'drizzle-orm';
import { now } from '@/utils/id';

export type KudosAction = 'add' | 'remove';
export type PendingKudos = typeof pending_kudos.$inferSelect;

/**
 * Local outbox for kudos toggled while offline. One row per (event, user) holds
 * the latest intended state, so repeated toggles collapse to the final action.
 * Flushed by SyncService on the next sync.
 */
export async function enqueueKudos(
    feedEventId: string,
    userId: string,
    action: KudosAction
): Promise<void> {
    await db
        .insert(pending_kudos)
        .values({ feed_event_id: feedEventId, user_id: userId, action, updated_at: now() })
        .onConflictDoUpdate({
            target: [pending_kudos.feed_event_id, pending_kudos.user_id],
            set: { action, updated_at: now() },
        });
}

/** Clear a queued kudos op (e.g. once it has been delivered online). */
export async function clearPendingKudos(feedEventId: string, userId: string): Promise<void> {
    await db
        .delete(pending_kudos)
        .where(
            and(
                eq(pending_kudos.feed_event_id, feedEventId),
                eq(pending_kudos.user_id, userId),
            )
        );
}

/** All queued kudos ops, oldest first. */
export async function getPendingKudos(): Promise<PendingKudos[]> {
    return db.select().from(pending_kudos);
}

/** Map of feed_event_id -> intended action, for overlaying onto a loaded feed. */
export async function getPendingKudosMap(): Promise<Map<string, KudosAction>> {
    const rows = await getPendingKudos();
    return new Map(rows.map(r => [r.feed_event_id, r.action as KudosAction]));
}
