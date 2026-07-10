// repositories/bodyWeightEntries.ts

import { db } from '@/db/client';
import { logger } from '@/utils/logger';
import { body_weight_entries } from '@/db/schema';
import { and, eq, inArray, isNull, gte, lte, desc } from 'drizzle-orm';
import { newId, now } from '@/utils/id';
import { softDeleteFields } from './_helpers';
import type { BodyWeightEntry, NewBodyWeightEntry } from './types';

export async function createBodyWeightEntry(
    data: Omit<NewBodyWeightEntry, 'id' | 'updated_at' | 'is_synced' | 'created_at' | 'deleted_at'> & {
        created_at?: string;
        deleted_at?: string | null;
    },
    options?: { returnData?: boolean }
): Promise<BodyWeightEntry | boolean> {
    const id = newId();
    const ts = now();

    const query = db.insert(body_weight_entries).values({
        ...data,
        id,
        created_at: data.created_at ?? ts,
        deleted_at: data.deleted_at ?? null,
        updated_at: ts,
        is_synced: 0,
    });

    if (options?.returnData) {
        const [inserted] = await query.returning();
        return inserted;
    }

    const result = await query;
    return result.changes > 0;
}


export async function getBodyWeightEntries(
    userId: string,
    startDate?: string,
    endDate?: string
): Promise<BodyWeightEntry[]> {
    let conditions = [
        eq(body_weight_entries.user_id, userId),
        isNull(body_weight_entries.deleted_at)
    ];

    if (startDate) {
        conditions.push(gte(body_weight_entries.recorded_at, startDate));
    }

    if (endDate) {
        conditions.push(lte(body_weight_entries.recorded_at, endDate));
    }

    return db
        .select()
        .from(body_weight_entries)
        .where(and(...conditions))
        .orderBy(desc(body_weight_entries.recorded_at));
}

/**
 * The user's most recent bodyweight (kg), or null if none logged. Used to derive
 * a relative-strength score at workout finish; the weight itself stays on-device
 * and never enters the community feed.
 */
export async function getLatestBodyweight(userId: string): Promise<number | null> {
    const [row] = await db
        .select({ weight: body_weight_entries.weight })
        .from(body_weight_entries)
        .where(
            and(
                eq(body_weight_entries.user_id, userId),
                isNull(body_weight_entries.deleted_at),
            )
        )
        .orderBy(desc(body_weight_entries.recorded_at))
        .limit(1);
    return row?.weight ?? null;
}

export async function getUnsyncedBodyWeightEntries(userId: string): Promise<BodyWeightEntry[]> {
    return db
        .select()
        .from(body_weight_entries)
        .where(
            and(
                eq(body_weight_entries.user_id, userId),
                eq(body_weight_entries.is_synced, 0)
            )
        );
}

export async function markBodyWeightEntriesAsSynced(entryIds: string[]): Promise<boolean> {
    if (entryIds.length === 0) return true;

    const result = await db
        .update(body_weight_entries)
        .set({ is_synced: 1 })
        .where(inArray(body_weight_entries.id, entryIds));

    return result.changes > 0;
}

export async function upsertBodyWeightEntriesFromRemote(entries: BodyWeightEntry[]): Promise<boolean> {
    if (entries.length === 0) return true;

    try {
        for (const entry of entries) {
            await db.insert(body_weight_entries)
                .values({
                    id: entry.id,
                    user_id: entry.user_id,
                    weight: entry.weight,
                    recorded_at: entry.recorded_at,
                    notes: entry.notes,
                    created_at: entry.created_at,
                    updated_at: entry.updated_at,
                    deleted_at: entry.deleted_at,
                    is_synced: 1,
                })
                .onConflictDoUpdate({
                    target: body_weight_entries.id,
                    set: {
                        weight: entry.weight,
                        recorded_at: entry.recorded_at,
                        notes: entry.notes,
                        updated_at: entry.updated_at,
                        deleted_at: entry.deleted_at,
                        is_synced: 1,
                    },
                });
        }
        return true;
    } catch (error) {
        logger.error('Failed to batch upsert body weight entries:', error);
        return false;
    }
}

export async function softDeleteBodyWeightEntry(id: string): Promise<boolean> {
    const deletedAt = now();

    const result = await db
        .update(body_weight_entries)
        .set(softDeleteFields(deletedAt))
        .where(
            and(
                eq(body_weight_entries.id, id),
                isNull(body_weight_entries.deleted_at)
            )
        );

    return result.changes > 0;
}
