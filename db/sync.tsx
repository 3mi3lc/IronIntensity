// db/sync.tsx
import {supabase} from '@/utils/supabase';
import {Session} from '@supabase/supabase-js';
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
    getUnsyncedWorkoutExercises,
    getWorkoutExercisesByIdsWithDeletedStatus,
    markWorkoutExerciseAsDeleted,
    markWorkoutExercisesAsSynced,
    upsertWorkoutExercisesFromRemote
} from "@/repositories/workoutExercises";
import {
    getUnsyncedWorkoutExerciseSets,
    markWorkoutExerciseSetAsDeleted,
    markWorkoutExerciseSetsAsSynced,
    upsertWorkoutExerciseSetsFromRemote
} from "@/repositories/workoutExerciseSets";
import {upsertBodyPartsFromRemote} from "@/repositories/bodyParts";
import {
    getUnsyncedBodyWeightEntries,
    markBodyWeightEntriesAsSynced,
    upsertBodyWeightEntriesFromRemote
} from "@/repositories/bodyWeightEntries";

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
                await recordSyncError('user', 'Local user not found');
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
                await recordSyncError('user', error.message);
                return false;
            }

            console.log('User synced successfully');
            return true;
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            await recordSyncError('user', message);
            return false;
        }
    }

    // ==================== SYNC EXERCISES ====================
    async pushExercises() {
        console.log('Syncing exercises...');
        try {
            const exercisesToSync = await getUnsyncedExercises();

            if (exercisesToSync.length === 0) {
                console.log('No exercises to sync');
                return true;
            }

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
                await recordSyncError('exercises', error.message);
                return false;
            }

            const exerciseIds = exercisesToSync.map(e => e.id);
            await markExercisesAsSynced(exerciseIds);

            console.log(`Synced ${exercisesToSync.length} exercises`);
            return true;
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            await recordSyncError('exercises', message);
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
                    { onConflict: 'exercise_id,body_part_id' }
                );

            if (error) {
                await recordSyncError('exercise_body_parts', error.message);
                return false;
            }

            await markExerciseBodyPartsAsSynced(
                itemsToSync.map(item => ({
                    exercise_id: item.exercise_id,
                    body_part_id: item.body_part_id
                }))
            );

            console.log(`Synced ${itemsToSync.length} exercise_body_parts`);
            return true;
        } catch (e) {
            const message = e instanceof Error ? e.message : 'Unknown error';
            await recordSyncError('exercise_body_parts', message);
            return false;
        }
    }

    // ==================== SYNC WORKOUTS ====================
    async pushWorkouts() {
        console.log('Syncing workouts...');
        try {
            const workoutsToSync = await getUnsyncedWorkouts();

            if (workoutsToSync.length === 0) {
                console.log('No workouts to sync');
                return true;
            }

            const { error } = await supabase
                .from('workouts')
                .upsert(
                    workoutsToSync.map(w => ({
                        id: w.id,
                        user_id: w.user_id,
                        name: w.name,
                        completed_at: w.completed_at,
                        created_at: w.created_at,
                        updated_at: w.updated_at,
                        deleted_at: w.deleted_at,
                    }))
                );

            if (error) {
                await recordSyncError('workouts', error.message);
                return false;
            }

            const workoutIds = workoutsToSync.map(w => w.id);
            await markWorkoutsAsSynced(workoutIds);

            console.log(`Synced ${workoutsToSync.length} workouts`);
            return true;
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            await recordSyncError('workouts', message);
            return false;
        }
    }

    // ==================== SYNC WORKOUT EXERCISES ====================
    async pushWorkoutExercises() {
        console.log('Syncing workout exercises...');
        try {
            const workoutExercisesToSync = await getUnsyncedWorkoutExercises();

            if (workoutExercisesToSync.length === 0) {
                console.log('No workout exercises to sync');
                return true;
            }

            const referencedWorkoutIds = [...new Set(workoutExercisesToSync.map(we => we.workout_id).filter(Boolean))];
            const localWorkouts = await getWorkoutsByIdsWithDeletedStatus(referencedWorkoutIds as string[]);
            const localWorkoutMap = new Map(localWorkouts.map(w => [w.id, w.deleted_at]));

            for (const we of workoutExercisesToSync) {
                const parentDeletedAt = we.workout_id ? localWorkoutMap.get(we.workout_id) : null;
                if (parentDeletedAt !== undefined && parentDeletedAt !== null && !we.deleted_at) {
                    await markWorkoutExerciseAsDeleted(we.id, parentDeletedAt);
                }
            }

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
                await recordSyncError('workout_exercises', error.message);
                return false;
            }

            const workoutExerciseIds = finalWorkoutExercisesToSync.map(we => we.id);
            await markWorkoutExercisesAsSynced(workoutExerciseIds);

            console.log(`Synced ${finalWorkoutExercisesToSync.length} workout exercises`);
            return true;
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            await recordSyncError('workout_exercises', message);
            return false;
        }
    }

    // ==================== SYNC SETS ====================
    async pushSets() {
        console.log('Syncing sets...');
        try {
            const setsToSync = await getUnsyncedWorkoutExerciseSets();

            if (setsToSync.length === 0) {
                console.log('No sets to sync');
                return true;
            }

            const referencedWeIds = [...new Set(setsToSync.map(s => s.workout_exercise_id).filter(Boolean))];
            const localWe = await getWorkoutExercisesByIdsWithDeletedStatus(referencedWeIds as string[]);
            const localWeMap = new Map(localWe.map(we => [we.id, we.deleted_at]));

            for (const s of setsToSync) {
                const parentDeletedAt = s.workout_exercise_id ? localWeMap.get(s.workout_exercise_id) : null;
                if (parentDeletedAt !== undefined && parentDeletedAt !== null && !s.deleted_at) {
                    await markWorkoutExerciseSetAsDeleted(s.id, parentDeletedAt);
                }
            }

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
                        is_pr: s.is_pr,
                        weight: s.weight,
                        created_at: s.created_at,
                        updated_at: s.updated_at,
                        deleted_at: s.deleted_at,
                    }))
                );

            if (error) {
                await recordSyncError('workout_exercise_sets', error.message);
                return false;
            }

            const setIds = finalSetsToSync.map(s => s.id);
            await markWorkoutExerciseSetsAsSynced(setIds);

            console.log(`Synced ${finalSetsToSync.length} sets`);
            return true;
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            await recordSyncError('workout_exercise_sets', message);
            return false;
        }
    }

    // ==================== SYNC BODY WEIGHT ENTRIES ====================
    async pushBodyWeightEntries() {
        console.log('Syncing body weight entries...');
        try {
            const entriesToSync = await getUnsyncedBodyWeightEntries(this.userId);

            if (entriesToSync.length === 0) {
                console.log('No body weight entries to sync');
                return true;
            }

            const { error } = await supabase
                .from('body_weight_entries')
                .upsert(
                    entriesToSync.map(e => ({
                        id: e.id,
                        user_id: e.user_id,
                        weight: e.weight,
                        recorded_at: e.recorded_at,
                        notes: e.notes,
                        created_at: e.created_at,
                        updated_at: e.updated_at,
                        deleted_at: e.deleted_at,
                    }))
                );

            if (error) {
                await recordSyncError('body_weight_entries', error.message);
                return false;
            }

            const entryIds = entriesToSync.map(e => e.id);
            await markBodyWeightEntriesAsSynced(entryIds);

            console.log(`Synced ${entriesToSync.length} body weight entries`);
            return true;
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            await recordSyncError('body_weight_entries', message);
            return false;
        }
    }

    // ==================== PUSH ALL ====================
    async pushAll() {
        console.log('Starting full push...');

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

        const bodyWeightPush = await this.pushBodyWeightEntries();
        if (!bodyWeightPush) {
            console.error('Body weight entries push failed');
            return false;
        }

        console.log('✅ Full push completed successfully');
        return true;
    }

    // ==================== PULL ALL ====================
    async pullAll() {
        console.log('Starting full pull...');

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

        const bodyWeightPull = await this.pullBodyWeightEntries();
        if (!bodyWeightPull) {
            console.error('Body weight entries pull failed');
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
                .eq('user_id', this.userId)
                .is('deleted_at', null)
                .not('completed_at', 'is', null);

            if (lastSync) {
                query = query.gt('updated_at', lastSync);
            }

            const {data, error} = await query;

            if (error) {
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
            const message = error instanceof Error ? error.message : 'Unknown error';
            await recordSyncError('workouts', message);
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
                .eq("user_id", this.userId)
                .is('deleted_at', null);

            if (lastSync) {
                query = query.gt('updated_at', lastSync);
            }

            const { data, error } = await query;

            if (error) {
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
            const message = err instanceof Error ? err.message : 'Unknown error';
            await recordSyncError('exercises', message);
            return false;
        }
    }

    async pullWorkoutExercises() {
        console.log("Pulling workout exercises...");
        try {
            const lastSync = await getLastSyncTime('workout_exercises');

            let query = supabase
                .from("workout_exercises")
                .select("*, workouts!inner(user_id)")
                .eq("workouts.user_id", this.userId)
                .is('deleted_at', null);

            if (lastSync) {
                query = query.gt('updated_at', lastSync);
            }

            const { data, error } = await query;

            if (error) {
                await recordSyncError('workout_exercises', error.message);
                return false;
            }

            const cleaned = (data || []).map(({ workouts, ...rest }) => rest);
            const success = await upsertWorkoutExercisesFromRemote(cleaned);
            if (!success) {
                await recordSyncError('workout_exercises', 'Failed to upsert workout exercises locally');
                return false;
            }

            await setLastSyncTime('workout_exercises');
            console.log(`Pulled ${data?.length || 0} workout_exercises`);
            return true;
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Unknown error';
            await recordSyncError('workout_exercises', message);
            return false;
        }
    }

    async pullSets() {
        console.log("Pulling sets...");
        try {
            const lastSync = await getLastSyncTime('workout_exercise_sets');

            let query = supabase
                .from("workout_exercise_sets")
                .select("*, workout_exercises!inner(workout_id, workouts!inner(user_id))")
                .eq("workout_exercises.workouts.user_id", this.userId)
                .is('deleted_at', null);

            if (lastSync) {
                query = query.gt('updated_at', lastSync);
            }

            const { data, error } = await query;

            if (error) {
                await recordSyncError('workout_exercise_sets', error.message);
                return false;
            }

            const cleaned = (data || []).map(({ workout_exercises, ...rest }) => rest);
            const success = await upsertWorkoutExerciseSetsFromRemote(cleaned);
            if (!success) {
                await recordSyncError('workout_exercise_sets', 'Failed to upsert sets locally');
                return false;
            }

            await setLastSyncTime('workout_exercise_sets');
            console.log(`Pulled ${data?.length || 0} sets`);
            return true;
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Unknown error';
            await recordSyncError('workout_exercise_sets', message);
            return false;
        }
    }

    async pullExerciseBodyParts() {
        console.log("Pulling exercise_body_parts...");
        try {
            const lastSync = await getLastSyncTime('exercise_body_parts');

            let query = supabase
                .from("exercise_body_parts")
                .select("*")
                .is('deleted_at', null);

            if (lastSync) {
                query = query.gt('updated_at', lastSync);
            }

            const { data, error } = await query;

            if (error) {
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
            const message = e instanceof Error ? e.message : 'Unknown error';
            await recordSyncError('exercise_body_parts', message);
            return false;
        }
    }

    async pullBodyParts() {
        console.log("Pulling body parts...");
        try {
            const { data, error } = await supabase
                .from("body_parts")
                .select("*");

            if (error) {
                await recordSyncError('body_parts', error.message);
                return false;
            }

            const success = await upsertBodyPartsFromRemote(data || []);
            if (!success) {
                await recordSyncError('body_parts', 'Failed to upsert body parts locally');
                return false;
            }

            console.log(`Pulled ${data?.length || 0} body parts`);
            return true;
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Unknown error';
            await recordSyncError('body_parts', message);
            return false;
        }
    }

    async pullBodyWeightEntries() {
        console.log("Pulling body weight entries...");
        try {
            const lastSync = await getLastSyncTime('body_weight_entries');

            let query = supabase
                .from("body_weight_entries")
                .select("*")
                .eq("user_id", this.userId)
                .is('deleted_at', null);

            if (lastSync) {
                query = query.gt('updated_at', lastSync);
            }

            const { data, error } = await query;

            if (error) {
                await recordSyncError('body_weight_entries', error.message);
                return false;
            }

            const success = await upsertBodyWeightEntriesFromRemote(data || []);
            if (!success) {
                await recordSyncError('body_weight_entries', 'Failed to upsert body weight entries locally');
                return false;
            }

            await setLastSyncTime('body_weight_entries');
            console.log(`Pulled ${data?.length || 0} body weight entries`);
            return true;
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Unknown error';
            await recordSyncError('body_weight_entries', message);
            return false;
        }
    }
}