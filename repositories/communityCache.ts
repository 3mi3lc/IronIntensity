import { db } from '@/db/client';
import { community_cache } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { now } from '@/utils/id';
import { logger } from '@/utils/logger';

/**
 * Tiny key/value JSON cache for the online community RPC reads, so the
 * last-synced boards, feed, and member lists remain viewable while offline.
 * Best-effort: cache failures never surface to callers.
 */

export async function writeCache(key: string, value: unknown): Promise<void> {
    try {
        const ts = now();
        await db
            .insert(community_cache)
            .values({ key, value: JSON.stringify(value), updated_at: ts })
            .onConflictDoUpdate({
                target: community_cache.key,
                set: { value: JSON.stringify(value), updated_at: ts },
            });
    } catch (e) {
        logger.warn('communityCache: write failed', e);
    }
}

export async function readCache<T>(key: string): Promise<T | null> {
    try {
        const [row] = await db
            .select({ value: community_cache.value })
            .from(community_cache)
            .where(eq(community_cache.key, key))
            .limit(1);
        return row ? (JSON.parse(row.value) as T) : null;
    } catch (e) {
        logger.warn('communityCache: read failed', e);
        return null;
    }
}
