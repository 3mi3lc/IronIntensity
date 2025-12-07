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

    // Get sync statistics for debugging/monitoring
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

    // Optional: Reset sync history to force full sync
    async resetSyncHistory() {
        try {
            await db.delete(sync_metadata);
            console.log('Sync history cleared - next pull will fetch everything');
        } catch (error) {
            console.error('Failed to reset sync history:', error);
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
        console.log('Syncing exercises...');
        try {
            // Only sync unsynced exercises
            const exercisesToSync = await db
                .select()
                .from(exercises)
                .where(
                    and(
                        eq(exercises.user_id, this.userId),
                        eq(exercises.is_synced, 0)
                    )
                );

            if (exercisesToSync.length === 0) {
                console.log('No exercises to sync');
                return true;
            }

            console.log(`Syncing ${exercisesToSync.length} exercises...`);

            const { error } = await supabase
                .from('exercises')
                .upsert(
                    exercisesToSync.map(e => ({
                        id: e.id,
                        user_id: e.user_id,
                        name: e.name,
                        description: e.description,
                        created_at: e.created_at,
                        updated_at: e.updated_at,
                        deleted_at: e.deleted_at,
                    }))
                );

            if (error) {
                console.error('Failed to sync exercises:', error);
                return false;
            }

            await db
                .update(exercises)
                .set({ is_synced: 1 })
                .where(
                    and(
                        eq(exercises.user_id, this.userId),
                        eq(exercises.is_synced, 0)
                    )
                );

            console.log(`Synced ${exercisesToSync.length} exercises`);
            return true;
        } catch (error) {
            console.error('Sync exercises error:', error);
            return false;
        }
    }

    async pushExerciseBodyParts() {
        console.log("Syncing exercise_body_parts...");

        try {
            // Only sync unsynced items
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
        console.log('Syncing workouts...');
        try {
            // Only sync unsynced workouts
            const workoutsToSync = await db
                .select()
                .from(workouts)
                .where(
                    and(
                        eq(workouts.user_id, this.userId),
                        eq(workouts.is_synced, 0)
                    )
                );

            if (workoutsToSync.length === 0) {
                console.log('No workouts to sync');
                return true;
            }

            console.log(`Syncing ${workoutsToSync.length} workouts...`);

            const { error } = await supabase
                .from('workouts')
                .upsert(
                    workoutsToSync.map(w => ({
                        id: w.id,
                        user_id: w.user_id,
                        name: w.name,
                        created_at: w.created_at,
                        updated_at: w.updated_at,
                        deleted_at: w.deleted_at,
                    }))
                );

            if (error) {
                console.error('Failed to sync workouts:', error);
                return false;
            }

            await db
                .update(workouts)
                .set({ is_synced: 1 })
                .where(
                    and(
                        eq(workouts.user_id, this.userId),
                        eq(workouts.is_synced, 0)
                    )
                );

            console.log(`Synced ${workoutsToSync.length} workouts`);
            return true;
        } catch (error) {
            console.error('Sync workouts error:', error);
            return false;
        }
    }

    // ==================== SYNC WORKOUT EXERCISES ====================
    async pushWorkoutExercises() {
        console.log('Syncing workout exercises...');
        try {
            // Only sync unsynced workout_exercises
            const workoutExercisesToSync = await db
                .select()
                .from(workout_exercises)
                .where(eq(workout_exercises.is_synced, 0));

            if (workoutExercisesToSync.length === 0) {
                console.log('No workout exercises to sync');
                return true;
            }

            console.log(`Syncing ${workoutExercisesToSync.length} workout exercises...`);

            // Find all unique workout IDs referenced
            const referencedWorkoutIds = [...new Set(workoutExercisesToSync.map(we => we.workout_id).filter(Boolean))];

            // Check which workouts exist locally (including deleted ones)
            const localWorkouts = await db
                .select({ id: workouts.id, deleted_at: workouts.deleted_at })
                .from(workouts)
                .where(inArray(workouts.id, referencedWorkoutIds as string[]));

            const localWorkoutMap = new Map(localWorkouts.map(w => [w.id, w.deleted_at]));

            // If any workout_exercise references a deleted workout, mark it as deleted too
            for (const we of workoutExercisesToSync) {
                if (we.workout_id && localWorkoutMap.get(we.workout_id) !== null) {
                    console.log(`Marking workout_exercise ${we.id} as deleted (references deleted workout)`);
                    await db
                        .update(workout_exercises)
                        .set({ deleted_at: localWorkoutMap.get(we.workout_id) })
                        .where(eq(workout_exercises.id, we.id));
                }
            }

            // Re-fetch after marking deleted ones
            const finalWorkoutExercisesToSync = await db
                .select()
                .from(workout_exercises)
                .where(eq(workout_exercises.is_synced, 0));

            const { error } = await supabase
                .from('workout_exercises')
                .upsert(
                    finalWorkoutExercisesToSync.map(we => ({
                        id: we.id,
                        workout_id: we.workout_id,
                        exercise_id: we.exercise_id,
                        order_index: we.order_index,
                        created_at: we.created_at,
                        updated_at: we.updated_at,
                        deleted_at: we.deleted_at,
                    }))
                );

            if (error) {
                console.error('Failed to sync workout exercises:', error);
                return false;
            }

            await db
                .update(workout_exercises)
                .set({ is_synced: 1 })
                .where(eq(workout_exercises.is_synced, 0));

            console.log(`Synced ${finalWorkoutExercisesToSync.length} workout exercises`);
            return true;
        } catch (error) {
            console.error('Sync workout exercises error:', error);
            return false;
        }
    }

    // ==================== SYNC SETS ====================
    async pushSets() {
        console.log('Syncing sets...');
        try {
            // Only sync unsynced sets
            const setsToSync = await db
                .select()
                .from(workout_exercise_sets)
                .where(eq(workout_exercise_sets.is_synced, 0));

            if (setsToSync.length === 0) {
                console.log('No sets to sync');
                return true;
            }

            console.log(`Syncing ${setsToSync.length} sets...`);

            // Find all unique workout_exercise IDs referenced
            const referencedWeIds = [...new Set(setsToSync.map(s => s.workout_exercise_id).filter(Boolean))];

            // Check which workout_exercises exist locally (including deleted ones)
            const localWe = await db
                .select({ id: workout_exercises.id, deleted_at: workout_exercises.deleted_at })
                .from(workout_exercises)
                .where(inArray(workout_exercises.id, referencedWeIds as string[]));

            const localWeMap = new Map(localWe.map(we => [we.id, we.deleted_at]));

            // If any set references a deleted workout_exercise, mark it as deleted too
            for (const s of setsToSync) {
                if (s.workout_exercise_id && localWeMap.get(s.workout_exercise_id) !== null) {
                    console.log(`Marking set ${s.id} as deleted (references deleted workout_exercise)`);
                    await db
                        .update(workout_exercise_sets)
                        .set({ deleted_at: localWeMap.get(s.workout_exercise_id) })
                        .where(eq(workout_exercise_sets.id, s.id));
                }
            }

            // Re-fetch after marking deleted ones
            const finalSetsToSync = await db
                .select()
                .from(workout_exercise_sets)
                .where(eq(workout_exercise_sets.is_synced, 0));

            const { error } = await supabase
                .from('workout_exercise_sets')
                .upsert(
                    finalSetsToSync.map(s => ({
                        id: s.id,
                        workout_exercise_id: s.workout_exercise_id,
                        set_number: s.set_number,
                        reps: s.reps,
                        weight: s.weight,
                        created_at: s.created_at,
                        updated_at: s.updated_at,
                        deleted_at: s.deleted_at,
                    }))
                );

            if (error) {
                console.error('Failed to sync sets:', error);
                return false;
            }

            await db
                .update(workout_exercise_sets)
                .set({ is_synced: 1 })
                .where(eq(workout_exercise_sets.is_synced, 0));

            console.log(`Synced ${finalSetsToSync.length} sets`);
            return true;
        } catch (error) {
            console.error('Sync sets error:', error);
            return false;
        }
    }

    // ==================== PUSH ALL (SYNC) ====================
    async pushAll() {
        console.log('Starting full push (sync to server)...');

        const userPush = await this.pushUser();
        if (!userPush) {
            console.error('User push failed');
            return false;
        }

        const exercisesPush = await this.pushExercises();
        if (!exercisesPush) {
            console.error('Exercises push failed');
            return false;
        }

        const ebpPush = await this.pushExerciseBodyParts();
        if (!ebpPush) {
            console.warn('Exercise body parts push had issues, continuing...');
        }

        const workoutsPush = await this.pushWorkouts();
        if (!workoutsPush) {
            console.error('Workouts push failed');
            return false;
        }

        const workoutExercisesPush = await this.pushWorkoutExercises();
        if (!workoutExercisesPush) {
            console.error('Workout exercises push failed');
            return false;
        }

        const setsPush = await this.pushSets();
        if (!setsPush) {
            console.error('Sets push failed');
            return false;
        }

        console.log('✅ Full push completed successfully');
        return true;
    }

    // ==================== PULL ALL ====================
    async pullAll() {
        console.log('Starting full pull (fetch from server)...');

        const bodyPartsPull = await this.pullBodyParts();
        if (!bodyPartsPull) {
            console.error('Body parts pull failed');
            return false;
        }

        const exercisesPull = await this.pullExercises();
        if (!exercisesPull) {
            console.error('Exercises pull failed');
            return false;
        }

        const workoutsPull = await this.pullWorkouts();
        if (!workoutsPull) {
            console.error('Workouts pull failed');
            return false;
        }

        const workoutExercisesPull = await this.pullWorkoutExercises();
        if (!workoutExercisesPull) {
            console.error('Workout exercises pull failed');
            return false;
        }

        const setsPull = await this.pullSets();
        if (!setsPull) {
            console.error('Sets pull failed');
            return false;
        }

        const ebpPull = await this.pullExerciseBodyParts();
        if (!ebpPull) {
            console.error('Exercise body parts pull failed');
            return false;
        }

        console.log('✅ Full pull completed successfully');
        return true;
    }

    // ==================== PULL METHODS ====================
    async pullWorkouts() {
        console.log('Pulling workouts from Supabase...');
        try {
            const lastSync = await this.getLastSyncTime('workouts');

            let query = supabase
                .from('workouts')
                .select('*')
                .eq('user_id', this.userId);

            // Only pull records updated since last sync
            if (lastSync) {
                query = query.gt('updated_at', lastSync);
                console.log(`Pulling workouts updated after ${lastSync}`);
            } else {
                console.log('First sync - pulling all workouts');
            }

            const { data, error } = await query;

            if (error) {
                console.error('Failed to pull workouts:', error);
                await this.recordSyncError('workouts', error.message);
                return false;
            }

            for (const workout of data || []) {
                await db.insert(workouts)
                    .values({
                        id: workout.id,
                        user_id: workout.user_id,
                        name: workout.name,
                        created_at: workout.created_at,
                        updated_at: workout.updated_at,
                        deleted_at: workout.deleted_at,
                        is_synced: 1,
                    })
                    .onConflictDoUpdate({
                        target: workouts.id,
                        set: {
                            name: workout.name,
                            updated_at: workout.updated_at,
                            deleted_at: workout.deleted_at,
                            is_synced: 1,
                        },
                    });
            }

            // Update last sync time after successful pull
            await this.setLastSyncTime('workouts');

            console.log(`Pulled ${data?.length || 0} workouts`);
            return true;
        } catch (error) {
            console.error('Pull workouts error:', error);
            await this.recordSyncError('workouts', error instanceof Error ? error.message : 'Unknown error');
            return false;
        }
    }

    async pullExercises() {
        console.log("Pulling exercises...");
        try {
            const lastSync = await this.getLastSyncTime('exercises');

            let query = supabase
                .from("exercises")
                .select("*")
                .eq("user_id", this.userId);

            if (lastSync) {
                query = query.gt('updated_at', lastSync);
                console.log(`Pulling exercises updated after ${lastSync}`);
            } else {
                console.log('First sync - pulling all exercises');
            }

            const { data, error } = await query;

            if (error) {
                console.error("Pull exercises failed:", error);
                await this.recordSyncError('exercises', error.message);
                return false;
            }

            for (const item of data || []) {
                await db.insert(exercises)
                    .values({
                        id: item.id,
                        user_id: item.user_id,
                        name: item.name,
                        description: item.description,
                        created_at: item.created_at,
                        updated_at: item.updated_at,
                        deleted_at: item.deleted_at,
                        is_synced: 1,
                    })
                    .onConflictDoUpdate({
                        target: exercises.id,
                        set: {
                            name: item.name,
                            description: item.description,
                            updated_at: item.updated_at,
                            deleted_at: item.deleted_at,
                            is_synced: 1,
                        }
                    });
            }

            await this.setLastSyncTime('exercises');

            console.log(`Pulled ${data?.length || 0} exercises`);
            return true;
        } catch (err) {
            console.error("Pull exercises error:", err);
            await this.recordSyncError('exercises', err instanceof Error ? err.message : 'Unknown error');
            return false;
        }
    }

    async pullWorkoutExercises() {
        console.log("Pulling workout exercises...");
        try {
            const lastSync = await this.getLastSyncTime('workout_exercises');

            let query = supabase.from("workout_exercises").select("*");

            if (lastSync) {
                query = query.gt('updated_at', lastSync);
                console.log(`Pulling workout_exercises updated after ${lastSync}`);
            } else {
                console.log('First sync - pulling all workout_exercises');
            }

            const { data, error } = await query;

            if (error) {
                console.error("Pull workout_exercises failed:", error);
                await this.recordSyncError('workout_exercises', error.message);
                return false;
            }

            for (const item of data || []) {
                await db.insert(workout_exercises)
                    .values({
                        id: item.id,
                        workout_id: item.workout_id,
                        exercise_id: item.exercise_id,
                        order_index: item.order_index,
                        created_at: item.created_at,
                        updated_at: item.updated_at,
                        deleted_at: item.deleted_at,
                        is_synced: 1,
                    })
                    .onConflictDoUpdate({
                        target: workout_exercises.id,
                        set: {
                            order_index: item.order_index,
                            updated_at: item.updated_at,
                            deleted_at: item.deleted_at,
                            is_synced: 1,
                        }
                    });
            }

            await this.setLastSyncTime('workout_exercises');

            console.log(`Pulled ${data?.length || 0} workout_exercises`);
            return true;
        } catch (err) {
            console.error("Pull workout_exercises error:", err);
            await this.recordSyncError('workout_exercises', err instanceof Error ? err.message : 'Unknown error');
            return false;
        }
    }

    async pullSets() {
        console.log("Pulling sets...");
        try {
            const lastSync = await this.getLastSyncTime('workout_exercise_sets');

            let query = supabase.from("workout_exercise_sets").select("*");

            if (lastSync) {
                query = query.gt('updated_at', lastSync);
                console.log(`Pulling sets updated after ${lastSync}`);
            } else {
                console.log('First sync - pulling all sets');
            }

            const { data, error } = await query;

            if (error) {
                console.error("Pull sets failed:", error);
                await this.recordSyncError('workout_exercise_sets', error.message);
                return false;
            }

            for (const item of data || []) {
                await db.insert(workout_exercise_sets)
                    .values({
                        id: item.id,
                        workout_exercise_id: item.workout_exercise_id,
                        set_number: item.set_number,
                        reps: item.reps,
                        weight: item.weight,
                        created_at: item.created_at,
                        updated_at: item.updated_at,
                        deleted_at: item.deleted_at,
                        is_synced: 1,
                    })
                    .onConflictDoUpdate({
                        target: workout_exercise_sets.id,
                        set: {
                            set_number: item.set_number,
                            reps: item.reps,
                            weight: item.weight,
                            updated_at: item.updated_at,
                            deleted_at: item.deleted_at,
                            is_synced: 1,
                        }
                    });
            }

            await this.setLastSyncTime('workout_exercise_sets');

            console.log(`Pulled ${data?.length || 0} sets`);
            return true;
        } catch (err) {
            console.error("Pull sets error:", err);
            await this.recordSyncError('workout_exercise_sets', err instanceof Error ? err.message : 'Unknown error');
            return false;
        }
    }

    async pullExerciseBodyParts() {
        console.log("Pulling exercise_body_parts...");

        try {
            const lastSync = await this.getLastSyncTime('exercise_body_parts');

            let query = supabase.from("exercise_body_parts").select("*");

            if (lastSync) {
                query = query.gt('updated_at', lastSync);
                console.log(`Pulling exercise_body_parts updated after ${lastSync}`);
            } else {
                console.log('First sync - pulling all exercise_body_parts');
            }

            const { data, error } = await query;

            if (error) {
                console.error("Pull failed:", error);
                await this.recordSyncError('exercise_body_parts', error.message);
                return false;
            }

            for (const item of data || []) {
                await db.insert(exercise_body_parts)
                    .values({
                        exercise_id: item.exercise_id,
                        body_part_id: item.body_part_id,
                        created_at: item.created_at,
                        updated_at: item.updated_at,
                        deleted_at: item.deleted_at,
                        is_synced: 1,
                    })
                    .onConflictDoUpdate({
                        target: [exercise_body_parts.exercise_id, exercise_body_parts.body_part_id],
                        set: {
                            updated_at: item.updated_at,
                            deleted_at: item.deleted_at,
                            is_synced: 1,
                        }
                    });
            }

            await this.setLastSyncTime('exercise_body_parts');

            console.log(`Pulled ${data?.length || 0} exercise_body_parts`);
            return true;
        } catch (e) {
            console.error("Pull junction table error:", e);
            await this.recordSyncError('exercise_body_parts', e instanceof Error ? e.message : 'Unknown error');
            return false;
        }
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