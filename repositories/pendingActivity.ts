import { db } from '@/db/client';
import { pending_activity } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { newId, now } from '@/utils/id';
import type { ActivityEvent } from '@/utils/activityEvents';

export type PendingActivity = typeof pending_activity.$inferSelect;

/**
 * Queue one finished workout's activity events for emission to the user's
 * communities. Stored as a JSON array; the sync push calls the emit_activity
 * RPC and marks the row synced. A no-op when there are no events.
 */
export async function queueActivity(events: ActivityEvent[]): Promise<void> {
    if (events.length === 0) return;

    await db.insert(pending_activity).values({
        id: newId(),
        payload: JSON.stringify(events),
        created_at: now(),
        is_synced: 0,
    });
}

/** Rows still awaiting emission. */
export async function getUnsyncedPendingActivity(): Promise<PendingActivity[]> {
    return db.select().from(pending_activity).where(eq(pending_activity.is_synced, 0));
}

/** Mark rows delivered so they are not re-emitted. */
export async function markPendingActivitySynced(ids: string[]): Promise<void> {
    for (const id of ids) {
        await db
            .update(pending_activity)
            .set({ is_synced: 1 })
            .where(eq(pending_activity.id, id));
    }
}
