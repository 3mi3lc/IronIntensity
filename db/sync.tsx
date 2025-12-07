// services/syncService.ts
import { supabase } from '@/utils/supabase';
import { Session } from '@supabase/supabase-js';
import { db } from '@/db/client';
import {
    users,
    exercises,
    workouts,
    workout_exercises,
    workout_exercise_sets,
    exercise_body_parts,
    body_parts,
} from '@/db/schema';
import { eq,  and, inArray } from 'drizzle-orm';

export class SyncService {
    private userId: string;
    private session: Session | null;

    constructor(userId: string, session: Session | null = null) {
        this.userId = userId;
        this.session = session;
    }

    private getSupabaseClient() {
        return supabase;
    }

    // ==================== SYNC USER ====================
    async syncUser() {
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
    async syncExercises() {
        console.log('Syncing exercises...');
        try {
            // Sync ALL exercises including deleted ones
            const exercisesToSync = await db
                .select()
                .from(exercises)
                .where(eq(exercises.user_id, this.userId));

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
                .where(eq(exercises.user_id, this.userId));

            console.log(`Synced ${exercisesToSync.length} exercises`);
            return true;
        } catch (error) {
            console.error('Sync exercises error:', error);
            return false;
        }
    }

    async syncExerciseBodyParts() {
        console.log("Syncing exercise_body_parts...");

        try {
            // Sync ALL including soft-deleted
            const itemsToSync = await db
                .select()
                .from(exercise_body_parts);

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
    async syncWorkouts() {
        console.log('Syncing workouts...');
        try {
            // Sync ALL workouts including soft-deleted ones
            const workoutsToSync = await db
                .select()
                .from(workouts)
                .where(eq(workouts.user_id, this.userId));

            if (workoutsToSync.length === 0) {
                console.log('No workouts to sync');
                return true;
            }

            console.log(`Syncing ${workoutsToSync.length} workouts (including deleted)...`);

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
                .where(eq(workouts.user_id, this.userId));

            console.log(`Synced ${workoutsToSync.length} workouts`);
            return true;
        } catch (error) {
            console.error('Sync workouts error:', error);
            return false;
        }
    }

    // ==================== SYNC WORKOUT EXERCISES ====================
    async syncWorkoutExercises() {
        console.log('Syncing workout exercises...');
        try {
            // Get ALL workout_exercises including those referencing deleted workouts
            const workoutExercisesToSync = await db
                .select()
                .from(workout_exercises);

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
                    // The referenced workout is deleted, so delete this workout_exercise
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
                .from(workout_exercises);

            const client = this.getSupabaseClient();

            const { error } = await client
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
                .set({ is_synced: 1 });

            console.log(`Synced ${finalWorkoutExercisesToSync.length} workout exercises`);
            return true;
        } catch (error) {
            console.error('Sync workout exercises error:', error);
            return false;
        }
    }

    // ==================== SYNC SETS ====================
    async syncSets() {
        console.log('Syncing sets...');
        try {
            // Get ALL sets
            const setsToSync = await db
                .select()
                .from(workout_exercise_sets);

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
                .from(workout_exercise_sets);

            const client = this.getSupabaseClient();

            const { error } = await client
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
                .set({ is_synced: 1 });

            console.log(`Synced ${finalSetsToSync.length} sets`);
            return true;
        } catch (error) {
            console.error('Sync sets error:', error);
            return false;
        }
    }

    // ==================== FULL SYNC ====================
    async syncAll() {
        console.log('Starting full sync...');

        const userSync = await this.syncUser();
        if (!userSync) {
            console.error('User sync failed');
            return false;
        }

        const exercisesSync = await this.syncExercises();
        if (!exercisesSync) {
            console.error('Exercises sync failed');
            return false;
        }

        const ebpSync = await this.syncExerciseBodyParts();
        if (!ebpSync) {
            console.warn('Exercise body parts sync had issues, continuing...');
        }

        const workoutsSync = await this.syncWorkouts();
        if (!workoutsSync) {
            console.error('Workouts sync failed');
            return false;
        }

        const workoutExercisesSync = await this.syncWorkoutExercises();
        if (!workoutExercisesSync) {
            console.error('Workout exercises sync failed');
            return false;
        }

        const setsSync = await this.syncSets();
        if (!setsSync) {
            console.error('Sets sync failed');
            return false;
        }

        console.log('✅ Full sync completed successfully');
        return true;
    }

    async pullAll() {
        console.log("Pulling everything from Supabase...");

        const ok0 = await this.pullBodyParts();
        const ok1 = await this.pullExercises();
        const ok2 = await this.pullWorkouts();
        const ok3 = await this.pullWorkoutExercises();
        const ok4 = await this.pullSets();
        const ok5 = await this.pullExerciseBodyParts();

        if (!ok0 || !ok1 || !ok2 || !ok3 || !ok4 || !ok5) {
            console.error("Pull failed");
            return false;
        }

        console.log("✅ Pull completed successfully");
        return true;
    }

    // ==================== PULL METHODS ====================
    async pullWorkouts() {
        console.log('Pulling workouts from Supabase...');
        try {
            // Pull ALL workouts including soft-deleted ones
            const { data, error } = await supabase
                .from('workouts')
                .select('*')
                .eq('user_id', this.userId);

            if (error) {
                console.error('Failed to pull workouts:', error);
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

            console.log(`Pulled ${data?.length || 0} workouts`);
            return true;
        } catch (error) {
            console.error('Pull workouts error:', error);
            return false;
        }
    }

    async pullExercises() {
        console.log("Pulling exercises...");
        try {
            const { data, error } = await supabase
                .from("exercises")
                .select("*")
                .eq("user_id", this.userId);

            if (error) {
                console.error("Pull exercises failed:", error);
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

            console.log(`Pulled ${data?.length || 0} exercises`);
            return true;
        } catch (err) {
            console.error("Pull exercises error:", err);
            return false;
        }
    }

    async pullWorkoutExercises() {
        console.log("Pulling workout exercises...");
        try {
            const { data, error } = await supabase
                .from("workout_exercises")
                .select("*");

            if (error) {
                console.error("Pull workout_exercises failed:", error);
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

            console.log(`Pulled ${data?.length || 0} workout_exercises`);
            return true;
        } catch (err) {
            console.error("Pull workout_exercises error:", err);
            return false;
        }
    }

    async pullSets() {
        console.log("Pulling sets...");
        try {
            const { data, error } = await supabase
                .from("workout_exercise_sets")
                .select("*");

            if (error) {
                console.error("Pull sets failed:", error);
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

            console.log(`Pulled ${data?.length || 0} sets`);
            return true;
        } catch (err) {
            console.error("Pull sets error:", err);
            return false;
        }
    }

    async pullExerciseBodyParts() {
        console.log("Pulling exercise_body_parts...");

        try {
            const { data, error } = await supabase
                .from("exercise_body_parts")
                .select("*");

            if (error) {
                console.error("Pull failed:", error);
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

            console.log(`Pulled ${data?.length || 0} exercise_body_parts`);
            return true;
        } catch (e) {
            console.error("Pull junction table error:", e);
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