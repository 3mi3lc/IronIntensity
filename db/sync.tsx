// db/sync.tsx
import {supabase} from '@/utils/supabase';
import {Session} from '@supabase/supabase-js';
import {
    body_parts,
    exercise_body_parts,
    exercises,
    users,
    workout_exercise_sets,
    workout_exercises,
    workouts,
} from '@/db/schema';
import {getLastSyncTime, setLastSyncTime, recordSyncError} from "@/repositories/syncMetadata";
import {getUserById} from "@/repositories/users";
import {getUnsyncedExercises, markExercisesAsSynced, upsertExercisesFromRemote} from "@/repositories/exercises";
import {
    getUnsyncedExerciseBodyParts,
    markExerciseBodyPartsAsSynced,
    upsertExerciseBodyPartsFromRemote
} from "@/repositories/exerciseBodyParts";
import {
    getUnsyncedWorkouts,
    getWorkoutsByIdsWithDeletedStatus,
    markWorkoutsAsSynced,
    upsertWorkoutsFromRemote
} from "@/repositories/workouts";
import {
    getUnsyncedWorkoutExercises, getWorkoutExercisesByIdsWithDeletedStatus,
    markWorkoutExerciseAsDeleted,
    markWorkoutExercisesAsSynced, upsertWorkoutExercisesFromRemote
} from "@/repositories/workoutExercises";
import {
    getUnsyncedWorkoutExerciseSets,
    markWorkoutExerciseSetAsDeleted,
    markWorkoutExerciseSetsAsSynced, upsertWorkoutExerciseSetsFromRemote
} from "@/repositories/workoutExerciseSets";
import {upsertBodyPartsFromRemote} from "@/repositories/bodyParts";

export class SyncService {
    private userId: string;
    private session: Session | null;

    constructor(userId: string, session: Session | null = null) {
        this.userId = userId;
        this.session = session;
    }
    

    // ==================== SYNC USER ====================
    async pushUser() {
        console.log('Syncing user...');
        try {
            const localUser = await getUserById(this.userId);

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
            const exercisesToSync = await getUnsyncedExercises();

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

            const exerciseIds = exercisesToSync.map(e => e.id);
            const marked = await markExercisesAsSynced(exerciseIds);

            if (!marked) {
                console.warn('Warning: Failed to mark some exercises as synced');
            }

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
            const itemsToSync = await getUnsyncedExerciseBodyParts();

            if (itemsToSync.length === 0) {
                console.log("No junction rows to sync");
                return true;
            }

            console.log(`Syncing ${itemsToSync.length} exercise_body_parts...`);

            // Batch upsert all items at once
            const { error } = await supabase
                .from("exercise_body_parts")
                .upsert(
                    itemsToSync.map(item => ({
                        exercise_id: item.exercise_id,
                        body_part_id: item.body_part_id,
                        created_at: item.created_at,
                        updated_at: item.updated_at,
                        deleted_at: item.deleted_at,
                    })),
                    {
                        onConflict: 'exercise_id,body_part_id'
                    }
                );

            if (error) {
                console.error('Failed to sync exercise_body_parts:', error);
                return false;
            }

            // Mark all as synced after successful batch upsert
            await markExerciseBodyPartsAsSynced(
                itemsToSync.map(item => ({
                    exercise_id: item.exercise_id,
                    body_part_id: item.body_part_id
                }))
            );

            console.log(`Synced ${itemsToSync.length} exercise_body_parts`);
            return true;
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
            const workoutsToSync = await getUnsyncedWorkouts();

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

            const workoutIds = workoutsToSync.map(e => e.id);
            const marked = await markWorkoutsAsSynced(workoutIds);

            if (!marked) {
                console.warn('Warning: Failed to mark some workouts as synced');
            }

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
            const workoutExercisesToSync = await getUnsyncedWorkoutExercises();

            if (workoutExercisesToSync.length === 0) {
                console.log('No workout exercises to sync');
                return true;
            }

            console.log(`Syncing ${workoutExercisesToSync.length} workout exercises...`);

            // Find all unique workout IDs referenced
            const referencedWorkoutIds = [...new Set(workoutExercisesToSync.map(we => we.workout_id).filter(Boolean))];

            // Check which workouts exist locally (including deleted ones)
            const localWorkouts = await getWorkoutsByIdsWithDeletedStatus(referencedWorkoutIds as string[]);
            const localWorkoutMap = new Map(localWorkouts.map(w => [w.id, w.deleted_at]));

            // If any workout_exercise references a deleted workout, mark it as deleted too
            for (const we of workoutExercisesToSync) {
                const parentDeletedAt = we.workout_id ? localWorkoutMap.get(we.workout_id) : null;
                if (parentDeletedAt !== undefined && parentDeletedAt !== null) {
                    console.log(`Marking workout_exercise ${we.id} as deleted (references deleted workout)`);
                    await markWorkoutExerciseAsDeleted(we.id, parentDeletedAt);
                }
            }

            // Re-fetch after marking deleted ones
            const finalWorkoutExercisesToSync = await getUnsyncedWorkoutExercises();

            if (finalWorkoutExercisesToSync.length === 0) {
                console.log('No workout exercises remaining after cascading deletes');
                return true;
            }

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

            // Mark the specific workout exercises as synced
            const workoutExerciseIds = finalWorkoutExercisesToSync.map(we => we.id);
            const marked = await markWorkoutExercisesAsSynced(workoutExerciseIds);

            if (!marked) {
                console.warn('Warning: Failed to mark some workout exercises as synced');
            }

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
            const setsToSync = await getUnsyncedWorkoutExerciseSets();

            if (setsToSync.length === 0) {
                console.log('No sets to sync');
                return true;
            }

            console.log(`Syncing ${setsToSync.length} sets...`);

            // Find all unique workout_exercise IDs referenced
            const referencedWeIds = [...new Set(setsToSync.map(s => s.workout_exercise_id).filter(Boolean))];

            // Check which workout_exercises exist locally (including deleted ones)
            const localWe = await getWorkoutExercisesByIdsWithDeletedStatus(referencedWeIds as string[]);
            const localWeMap = new Map(localWe.map(we => [we.id, we.deleted_at]));

            // If any set references a deleted workout_exercise, mark it as deleted too
            for (const s of setsToSync) {
                const parentDeletedAt = s.workout_exercise_id ? localWeMap.get(s.workout_exercise_id) : null;
                if (parentDeletedAt !== undefined && parentDeletedAt !== null) {
                    console.log(`Marking set ${s.id} as deleted (references deleted workout_exercise)`);
                    await markWorkoutExerciseSetAsDeleted(s.id, parentDeletedAt);
                }
            }

            // Re-fetch after marking deleted ones
            const finalSetsToSync = await getUnsyncedWorkoutExerciseSets();

            if (finalSetsToSync.length === 0) {
                console.log('No sets remaining after cascading deletes');
                return true;
            }

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

            // Mark the specific sets as synced
            const setIds = finalSetsToSync.map(s => s.id);
            const marked = await markWorkoutExerciseSetsAsSynced(setIds);

            if (!marked) {
                console.warn('Warning: Failed to mark some sets as synced');
            }

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
            const lastSync = await getLastSyncTime('workouts');

            let query = supabase
                .from('workouts')
                .select('*')
                .eq('user_id', this.userId);

            if (lastSync) {
                query = query.gt('updated_at', lastSync);
                console.log(`Pulling workouts updated after ${lastSync}`);
            } else {
                console.log('First sync - pulling all workouts');
            }

            const {data, error} = await query;

            if (error) {
                console.error('Failed to pull workouts:', error);
                await recordSyncError('workouts', error.message);
                return false;
            }

            const success = await upsertWorkoutsFromRemote(data || []);

            if (!success) {
                await recordSyncError('workouts', 'Failed to upsert workouts locally');
                return false;
            }

            await setLastSyncTime('workouts');

            console.log(`Pulled ${data?.length || 0} workouts`);
            return true;
        } catch (error) {
            console.error('Pull workouts error:', error);
            await recordSyncError('workouts', error instanceof Error ? error.message : 'Unknown error');
            return false;
        }
    }

    async pullExercises() {
        console.log("Pulling exercises...");
        try {
            const lastSync = await getLastSyncTime('exercises');

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
                await recordSyncError('exercises', error.message);
                return false;
            }

            const success = await upsertExercisesFromRemote(data || []);

            if (!success) {
                await recordSyncError('exercises', 'Failed to upsert exercises locally');
                return false;
            }

            await setLastSyncTime('exercises');

            console.log(`Pulled ${data?.length || 0} exercises`);
            return true;
        } catch (err) {
            console.error("Pull exercises error:", err);
            await recordSyncError('exercises', err instanceof Error ? err.message : 'Unknown error');
            return false;
        }
    }


    async pullWorkoutExercises() {
        console.log("Pulling workout exercises...");
        try {
            const lastSync = await getLastSyncTime('workout_exercises');

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
                await recordSyncError('workout_exercises', error.message);
                return false;
            }

            const success = await upsertWorkoutExercisesFromRemote(data || []);

            if (!success) {
                await recordSyncError('workout_exercises', 'Failed to upsert workout exercises locally');
                return false;
            }

            await setLastSyncTime('workout_exercises');

            console.log(`Pulled ${data?.length || 0} workout_exercises`);
            return true;
        } catch (err) {
            console.error("Pull workout_exercises error:", err);
            await recordSyncError('workout_exercises', err instanceof Error ? err.message : 'Unknown error');
            return false;
        }
    }

    async pullSets() {
        console.log("Pulling sets...");
        try {
            const lastSync = await getLastSyncTime('workout_exercise_sets');

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
                await recordSyncError('workout_exercise_sets', error.message);
                return false;
            }

            const success = await upsertWorkoutExerciseSetsFromRemote(data || []);

            if (!success) {
                await recordSyncError('workout_exercise_sets', 'Failed to upsert workout exercise sets locally');
                return false;
            }

            await setLastSyncTime('workout_exercise_sets');

            console.log(`Pulled ${data?.length || 0} sets`);
            return true;
        } catch (err) {
            console.error("Pull sets error:", err);
            await recordSyncError('workout_exercise_sets', err instanceof Error ? err.message : 'Unknown error');
            return false;
        }
    }


    async pullExerciseBodyParts() {
        console.log("Pulling exercise_body_parts...");

        try {
            const lastSync = await getLastSyncTime('exercise_body_parts');

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
                await recordSyncError('exercise_body_parts', error.message);
                return false;
            }

            const success = await upsertExerciseBodyPartsFromRemote(data || []);

            if (!success) {
                await recordSyncError('exercise_body_parts', 'Failed to upsert exercise body parts locally');
                return false;
            }

            await setLastSyncTime('exercise_body_parts');

            console.log(`Pulled ${data?.length || 0} exercise_body_parts`);
            return true;
        } catch (e) {
            console.error("Pull junction table error:", e);
            await recordSyncError('exercise_body_parts', e instanceof Error ? e.message : 'Unknown error');
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

            const success = await upsertBodyPartsFromRemote(data || []);

            if (!success) {
                console.error('Failed to upsert body parts locally');
                return false;
            }

            console.log(`Pulled ${data?.length || 0} body parts`);
            return true;
        } catch (err) {
            console.error("Pull body parts error:", err);
            return false;
        }
    }
}