import {db} from "@/db/client";
import {sync_metadata} from "@/db/schema";
import {eq, sql} from "drizzle-orm";


export async function getLastSyncTime(entity: string): Promise<string | null> {
    try {
        const key = `last_sync_${entity}`;
        const [result] = await db
            .select()
            .from(sync_metadata)
            .where(eq(sync_metadata.key, key));

        return result?.last_sync || null;
    } catch (error) {
        console.error('Failed to get last sync time:', error);
        return null;
    }
}

export async function setLastSyncTime(entity: string, error?: string) {
    try {
        const key = `last_sync_${entity}`;
        const now = new Date().toISOString();

        // Check if record exists
        const [existing] = await db
            .select()
            .from(sync_metadata)
            .where(eq(sync_metadata.key, key));

        if (existing) {
            // Update existing record and increment sync_count
            await db
                .update(sync_metadata)
                .set({
                    last_sync: now,
                    sync_count: sql`${sync_metadata.sync_count} + 1`,
                    last_error: error || null,
                })
                .where(eq(sync_metadata.key, key));
        } else {
            // Insert new record
            await db
                .insert(sync_metadata)
                .values({
                    key,
                    last_sync: now,
                    sync_count: 1,
                    last_error: error || null,
                });
        }
    } catch (err) {
        console.error('Failed to set last sync time:', err);
    }
}

export async function recordSyncError(entity: string, error: string) {
    try {
        const key = `last_sync_${entity}`;

        const [existing] = await db
            .select()
            .from(sync_metadata)
            .where(eq(sync_metadata.key, key));

        if (existing) {
            await db
                .update(sync_metadata)
                .set({ last_error: error })
                .where(eq(sync_metadata.key, key));
        } else {
            await db
                .insert(sync_metadata)
                .values({
                    key,
                    last_sync: new Date().toISOString(),
                    sync_count: 0,
                    last_error: error,
                });
        }
    } catch (err) {
        console.error('Failed to record sync error:', err);
    }
}

// Get sync statistics for debugging/monitoring
export async function getSyncStats() {
    try {
        return await db
            .select()
            .from(sync_metadata);
    } catch (error) {
        console.error('Failed to get sync stats:', error);
        return [];
    }
}

// Reset sync history to force full sync
export async function resetSyncHistory() {
    try {
        await db.delete(sync_metadata);
        console.log('Sync history cleared - next pull will fetch everything');
    } catch (error) {
        console.error('Failed to reset sync history:', error);
    }
}