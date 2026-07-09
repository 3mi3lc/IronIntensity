import { db } from '@/db/client';
import { logger } from '@/utils/logger';
import { user_achievements } from '@/db/schema';
import { and, eq, isNull } from 'drizzle-orm';
import { now } from '@/utils/id';
import type { UserAchievement } from './types';

/** Persist newly-unlocked achievements. Idempotent — existing rows are left as-is. */
export async function unlockAchievements(userId: string, achievementIds: string[]): Promise<void> {
    if (achievementIds.length === 0) return;

    const ts = now();
    await db
        .insert(user_achievements)
        .values(achievementIds.map(id => ({
            user_id: userId,
            achievement_id: id,
            unlocked_at: ts,
            created_at: ts,
            updated_at: ts,
            is_synced: 0,
        })))
        .onConflictDoNothing();
}

/** The set of achievement ids this user has unlocked (excludes soft-deleted). */
export async function getUnlockedAchievementIds(userId: string): Promise<Set<string>> {
    const rows = await db
        .select({ id: user_achievements.achievement_id })
        .from(user_achievements)
        .where(
            and(
                eq(user_achievements.user_id, userId),
                isNull(user_achievements.deleted_at),
            )
        );
    return new Set(rows.map(r => r.id));
}

/** Map of unlocked achievement id -> unlocked_at timestamp (excludes soft-deleted). */
export async function getUnlockedAchievementMap(userId: string): Promise<Map<string, string>> {
    const rows = await db
        .select({ id: user_achievements.achievement_id, at: user_achievements.unlocked_at })
        .from(user_achievements)
        .where(
            and(
                eq(user_achievements.user_id, userId),
                isNull(user_achievements.deleted_at),
            )
        );
    return new Map(rows.map(r => [r.id, r.at]));
}

// ==================== SYNC ====================

export async function getUnsyncedUserAchievements(): Promise<UserAchievement[]> {
    return db.select().from(user_achievements).where(eq(user_achievements.is_synced, 0));
}

export async function markUserAchievementsAsSynced(
    items: Array<{ user_id: string; achievement_id: string }>
): Promise<boolean> {
    if (items.length === 0) return true;

    // Composite primary key — update each row individually.
    let successCount = 0;
    for (const item of items) {
        const result = await db
            .update(user_achievements)
            .set({ is_synced: 1 })
            .where(
                and(
                    eq(user_achievements.user_id, item.user_id),
                    eq(user_achievements.achievement_id, item.achievement_id),
                )
            );
        if (result.changes > 0) successCount++;
    }
    return successCount === items.length;
}

export async function upsertUserAchievementsFromRemote(rows: UserAchievement[]): Promise<boolean> {
    if (rows.length === 0) return true;

    try {
        for (const row of rows) {
            await db
                .insert(user_achievements)
                .values({
                    user_id: row.user_id,
                    achievement_id: row.achievement_id,
                    unlocked_at: row.unlocked_at,
                    created_at: row.created_at,
                    updated_at: row.updated_at,
                    deleted_at: row.deleted_at,
                    is_synced: 1,
                })
                .onConflictDoUpdate({
                    target: [user_achievements.user_id, user_achievements.achievement_id],
                    set: {
                        unlocked_at: row.unlocked_at,
                        updated_at: row.updated_at,
                        deleted_at: row.deleted_at,
                        is_synced: 1,
                    },
                });
        }
        return true;
    } catch (error) {
        logger.error('Failed to upsert user achievements:', error);
        return false;
    }
}
