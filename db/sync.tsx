// db/sync.tsx
import {supabase} from '@/utils/supabase';
import {Session} from '@supabase/supabase-js';
import {db} from '@/db/client';
import {
    body_parts,
    exercise_body_parts,
    exercises,
    sync_metadata,
    users,
    workout_exercise_sets,
    workout_exercises,
    workouts,
} from '@/db/schema';
import {and, eq, inArray, sql} from 'drizzle-orm';

type SyncableTable = typeof exercises | typeof workouts | typeof workout_exercises | typeof workout_exercise_sets | typeof exercise_body_parts;

export class SyncService {
    private userId: string;
    private session: Session | null;

    constructor(userId: string, session: Session | null = null) {
        this.userId = userId;
        this.session = session;
    }

    // ==================== SYNC METADATA ====================
    private async getLastSyncTime(entity: string): Promise<string | null> {
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

    private async setLastSyncTime(entity: string, error?: string) {
        try {
            const key = `last_sync_${entity}`;
            const now = new Date().toISOString();

            const [existing] = await db
                .select()
                .from(sync_metadata)
                .where(eq(sync_metadata.key, key));

            if (existing) {
                await db
                    .update(sync_metadata)
                    .set({
                        last_sync: now,
                        sync_count: sql`${sync_metadata.sync_count} + 1`,
                        last_error: error || null,
                    })
                    .where(eq(sync_metadata.key, key));
            } else {
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

    private async recordSyncError(entity: string, error: string) {
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

    async getSyncStats() {
        try {
            return await db
                .select()
                .from(sync_metadata);
        } catch (error) {
            console.error('Failed to get sync stats:', error);
            return [];
        }
    }

    async resetSyncHistory() {
        try {
            await db.delete(sync_metadata);
            console.log('Sync history cleared - next pull will fetch everything');
        } catch (error) {
            console.error('Failed to reset sync history:', error);
        }
    }

    // ==================== GENERIC HELPERS ====================
    private async pushGeneric<T extends Record<string, any>>(
        tableName: string,
        table: SyncableTable,
        dataToSync: T[],
        mapFunction: (item: T) => Record<string, any>
    ): Promise<boolean> {
        if (dataToSync.length === 0) {
            console.log(`No ${tableName} to sync`);
            return true;
        }

        console.log(`Syncing ${dataToSync.length} ${tableName}...`);

        const { error } = await supabase
            .from(tableName)
            .upsert(dataToSync.map(mapFunction));

        if (error) {
            console.error(`Failed to sync ${tableName}:`, error);
            return false;
        }

        // Mark as synced
        const ids = dataToSync.map(item => item.id).filter(Boolean);
        if (ids.length > 0) {
            await db
                .update(table)
                .set({ is_synced: 1 })
                .where(inArray((table as any).id, ids));
        }

        console.log(`Synced ${dataToSync.length} ${tableName}`);
        return true;
    }

    private async pullGeneric<T extends Record<string, any>>(
        entityName: string,
        tableName: string,
        table: any,
        primaryKey: any,
        userFilter: boolean = true,
        additionalFilters?: any
    ): Promise<boolean> {
        console.log(`Pulling ${entityName}...`);
        try {
            const lastSync = await this.getLastSyncTime(entityName);

            let query = supabase.from(tableName).select('*');

            if (userFilter) {
                query = query.eq('user_id', this.userId);
            }

            if (additionalFilters) {
                Object.entries(additionalFilters).forEach(([key, value]) => {
                    query = query.eq(key, value);
                });
            }

            if (lastSync) {
                query = query.gt('updated_at', lastSync);
                console.log(`Pulling ${entityName} updated after ${lastSync}`);
            } else {
                console.log(`First sync - pulling all ${entityName}`);
            }

            const { data, error } = await query;

            if (error) {
                console.error(`Pull ${entityName} failed:`, error);
                await this.recordSyncError(entityName, error.message);
                return false;
            }

            for (const item of data || []) {
                const values = { ...item, is_synced: 1 };
                const { is_synced: _, ...updateValues } = values;

                await db.insert(table)
                    .values(values)
                    .onConflictDoUpdate({
                        target: primaryKey,
                        set: { ...updateValues, is_synced: 1 },
                    });
            }

            await this.setLastSyncTime(entityName);

            console.log(`Pulled ${data?.length || 0} ${entityName}`);
            return true;
        } catch (err) {
            console.error(`Pull ${entityName} error:`, err);
            await this.recordSyncError(entityName, err instanceof Error ? err.message : 'Unknown error');
            return false;
        }
    }

    // Handle cascading soft deletes
    private async handleCascadingDeletes<T extends { id: string; deleted_at: string | null }>(
        childTable: any,
        childRecords: any[],
        parentTable: any,
        parentIdField: string,
        childIdField: string = 'id'
    ) {
        const parentIds = [...new Set(childRecords.map(r => r[parentIdField]).filter(Boolean))];

        if (parentIds.length === 0) return;

        const parents = await db
            .select({ id: (parentTable as any).id, deleted_at: parentTable.deleted_at })
            .from(parentTable)
            .where(inArray((parentTable as any).id, parentIds as string[]));

        const parentMap = new Map(parents.map(p => [p.id, p.deleted_at]));

        for (const child of childRecords) {
            const parentId = child[parentIdField];
            if (parentId && parentMap.get(parentId) !== null) {
                console.log(`Marking ${childTable._.config.name} ${child[childIdField]} as deleted (cascading from parent)`);
                await db
                    .update(childTable)
                    .set({ deleted_at: parentMap.get(parentId) })
                    .where(eq((childTable as any)[childIdField], child[childIdField]));
            }
        }
    }

    // ==================== SYNC USER ====================
    async pushUser() {
        console.log('Syncing user...');
        try {
            const [localUser] = await db.select().from(users).where(eq(users.id, this.userId));

            if (!localUser) {
                console.error('Local user not found');
                return false;
            }

            const { error } = await supabase
                .from('users')
                .upsert({
                    id: localUser.id,
                    email: localUser.email,
                    username: localUser.username,
                });

            if (error) {
                console.error('Failed to sync user:', error);
                return false;
            }

            console.log('User synced successfully');
            return true;
        } catch (error) {
            console.error('Sync user error:', error);
            return false;
        }
    }

    // ==================== SYNC EXERCISES ====================
    async pushExercises() {
        const exercisesToSync = await db
            .select()
            .from(exercises)
            .where(
                and(
                    eq(exercises.user_id, this.userId),
                    eq(exercises.is_synced, 0)
                )
            );

        return this.pushGeneric('exercises', exercises, exercisesToSync, e => ({
            id: e.id,
            user_id: e.user_id,
            name: e.name,
            description: e.description,
            created_at: e.created_at,
            updated_at: e.updated_at,
            deleted_at: e.deleted_at,
        }));
    }

    async pushExerciseBodyParts() {
        console.log("Syncing exercise_body_parts...");

        try {
            const itemsToSync = await db
                .select()
                .from(exercise_body_parts)
                .where(eq(exercise_body_parts.is_synced, 0));

            if (itemsToSync.length === 0) {
                console.log("No junction rows to sync");
                return true;
            }

            console.log(`Syncing ${itemsToSync.length} exercise_body_parts...`);

            let successCount = 0;
            for (const item of itemsToSync) {
                try {
                    const { error } = await supabase
                        .from("exercise_body_parts")
                        .upsert({
                            exercise_id: item.exercise_id,
                            body_part_id: item.body_part_id,
                            created_at: item.created_at,
                            updated_at: item.updated_at,
                            deleted_at: item.deleted_at,
                        }, {
                            onConflict: 'exercise_id,body_part_id'
                        });

                    if (error) {
                        console.error(`Failed to sync exercise_body_part ${item.exercise_id}-${item.body_part_id}:`, error);
                        continue;
                    }

                    await db
                        .update(exercise_body_parts)
                        .set({ is_synced: 1 })
                        .where(
                            and(
                                eq(exercise_body_parts.exercise_id, item.exercise_id),
                                eq(exercise_body_parts.body_part_id, item.body_part_id)
                            )
                        );

                    successCount++;
                } catch (err) {
                    console.error(`Error syncing exercise_body_part:`, err);
                }
            }

            console.log(`Synced ${successCount}/${itemsToSync.length} exercise_body_parts`);
            return successCount > 0 || itemsToSync.length === 0;
        } catch (e) {
            console.error("Sync exercise_body_parts error:", e);
            return false;
        }
    }

    // ==================== SYNC WORKOUTS ====================
    async pushWorkouts() {
        const workoutsToSync = await db
            .select()
            .from(workouts)
            .where(
                and(
                    eq(workouts.user_id, this.userId),
                    eq(workouts.is_synced, 0)
                )
            );

        return this.pushGeneric('workouts', workouts, workoutsToSync, w => ({
            id: w.id,
            user_id: w.user_id,
            name: w.name,
            created_at: w.created_at,
            updated_at: w.updated_at,
            deleted_at: w.deleted_at,
        }));
    }

    // ==================== SYNC WORKOUT EXERCISES ====================
    async pushWorkoutExercises() {
        console.log('Syncing workout exercises...');
        try {
            let workoutExercisesToSync = await db
                .select()
                .from(workout_exercises)
                .where(eq(workout_exercises.is_synced, 0));

            if (workoutExercisesToSync.length === 0) {
                console.log('No workout exercises to sync');
                return true;
            }

            // Handle cascading deletes from parent workouts
            await this.handleCascadingDeletes(
                workout_exercises,
                workoutExercisesToSync,
                workouts,
                'workout_id'
            );

            // Re-fetch after cascading deletes
            workoutExercisesToSync = await db
                .select()
                .from(workout_exercises)
                .where(eq(workout_exercises.is_synced, 0));

            return this.pushGeneric('workout_exercises', workout_exercises, workoutExercisesToSync, we => ({
                id: we.id,
                workout_id: we.workout_id,
                exercise_id: we.exercise_id,
                order_index: we.order_index,
                created_at: we.created_at,
                updated_at: we.updated_at,
                deleted_at: we.deleted_at,
            }));
        } catch (error) {
            console.error('Sync workout exercises error:', error);
            return false;
        }
    }

    // ==================== SYNC SETS ====================
    async pushSets() {
        console.log('Syncing sets...');
        try {
            let setsToSync = await db
                .select()
                .from(workout_exercise_sets)
                .where(eq(workout_exercise_sets.is_synced, 0));

            if (setsToSync.length === 0) {
                console.log('No sets to sync');
                return true;
            }

            // Handle cascading deletes from parent workout_exercises
            await this.handleCascadingDeletes(
                workout_exercise_sets,
                setsToSync,
                workout_exercises,
                'workout_exercise_id'
            );

            // Re-fetch after cascading deletes
            setsToSync = await db
                .select()
                .from(workout_exercise_sets)
                .where(eq(workout_exercise_sets.is_synced, 0));

            return this.pushGeneric('workout_exercise_sets', workout_exercise_sets, setsToSync, s => ({
                id: s.id,
                workout_exercise_id: s.workout_exercise_id,
                set_number: s.set_number,
                reps: s.reps,
                weight: s.weight,
                created_at: s.created_at,
                updated_at: s.updated_at,
                deleted_at: s.deleted_at,
            }));
        } catch (error) {
            console.error('Sync sets error:', error);
            return false;
        }
    }

    // ==================== PUSH ALL (SYNC) ====================
    async pushAll() {
        console.log('Starting full push (sync to server)...');

        const operations = [
            { name: 'User', fn: () => this.pushUser(), critical: true },
            { name: 'Exercises', fn: () => this.pushExercises(), critical: true },
            { name: 'Exercise body parts', fn: () => this.pushExerciseBodyParts(), critical: false },
            { name: 'Workouts', fn: () => this.pushWorkouts(), critical: true },
            { name: 'Workout exercises', fn: () => this.pushWorkoutExercises(), critical: true },
            { name: 'Sets', fn: () => this.pushSets(), critical: true },
        ];

        for (const op of operations) {
            const success = await op.fn();
            if (!success) {
                if (op.critical) {
                    console.error(`${op.name} push failed`);
                    return false;
                } else {
                    console.warn(`${op.name} push had issues, continuing...`);
                }
            }
        }

        console.log('✅ Full push completed successfully');
        return true;
    }

    // ==================== PULL ALL ====================
    async pullAll() {
        console.log('Starting full pull (fetch from server)...');

        const operations = [
            { name: 'Body parts', fn: () => this.pullBodyParts() },
            { name: 'Exercises', fn: () => this.pullExercises() },
            { name: 'Workouts', fn: () => this.pullWorkouts() },
            { name: 'Workout exercises', fn: () => this.pullWorkoutExercises() },
            { name: 'Sets', fn: () => this.pullSets() },
            { name: 'Exercise body parts', fn: () => this.pullExerciseBodyParts() },
        ];

        for (const op of operations) {
            const success = await op.fn();
            if (!success) {
                console.error(`${op.name} pull failed`);
                return false;
            }
        }

        console.log('✅ Full pull completed successfully');
        return true;
    }

    // ==================== PULL METHODS ====================
    async pullWorkouts() {
        return this.pullGeneric('workouts', 'workouts', workouts, workouts.id, true);
    }

    async pullExercises() {
        return this.pullGeneric('exercises', 'exercises', exercises, exercises.id, true);
    }

    async pullWorkoutExercises() {
        return this.pullGeneric('workout_exercises', 'workout_exercises', workout_exercises, workout_exercises.id, false);
    }

    async pullSets() {
        return this.pullGeneric('workout_exercise_sets', 'workout_exercise_sets', workout_exercise_sets, workout_exercise_sets.id, false);
    }

    async pullExerciseBodyParts() {
        return this.pullGeneric(
            'exercise_body_parts',
            'exercise_body_parts',
            exercise_body_parts,
            [exercise_body_parts.exercise_id, exercise_body_parts.body_part_id],
            false
        );
    }

    async pullBodyParts() {
        console.log("Pulling body parts from Supabase...");

        try {
            const { data, error } = await supabase
                .from("body_parts")
                .select("*");

            if (error) {
                console.error("Pull body parts failed:", error);
                return false;
            }

            for (const item of data || []) {
                await db.insert(body_parts)
                    .values({
                        id: item.id,
                        name: item.name,
                    })
                    .onConflictDoUpdate({
                        target: body_parts.id,
                        set: {
                            name: item.name,
                        }
                    });
            }

            console.log(`Pulled ${data?.length || 0} body parts`);
            return true;
        } catch (err) {
            console.error("Pull body parts error:", err);
            return false;
        }
    }
}