// db/sync.ts
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
import {logger} from "@/utils/logger";

const unknownError = (e: unknown) => (e instanceof Error ? e.message : 'Unknown error');

/** Describes how to push one table's unsynced rows to Supabase. */
interface PushConfig<T> {
    entity: string;                                       // label for logs / sync_metadata
    table: string;                                        // Supabase table name
    getUnsynced: () => Promise<T[]>;
    toRemote: (row: T) => Record<string, unknown>;        // exact remote column projection
    markSynced: (rows: T[]) => Promise<unknown>;
    upsertOptions?: Record<string, unknown>;
    /** Optional pre-step: cascade parent deletes to these rows, returning the
     *  fresh set to push (rows are re-fetched so their deleted_at is current). */
    cascade?: (rows: T[]) => Promise<T[]>;
}

/** Describes how to pull one table from Supabase into the local database. */
interface PullConfig {
    entity: string;
    table: string;
    select?: string;                                      // default '*'
    applyFilters?: (query: any) => any;                   // user scoping etc.
    incremental?: boolean;                                // default true (gt updated_at)
    clean?: (rows: any[]) => any[];                       // strip nested join objects
    upsertLocal: (rows: any[]) => Promise<boolean>;
    recordLastSync?: boolean;                             // default true
}

export class SyncService {
    private userId: string;
    private session: Session | null;

    constructor(userId: string, session: Session | null = null) {
        this.userId = userId;
        this.session = session;
    }

    // ==================== GENERIC ENGINE ====================
    private async pushTable<T>(cfg: PushConfig<T>): Promise<boolean> {
        try {
            let rows = await cfg.getUnsynced();
            if (cfg.cascade) rows = await cfg.cascade(rows);
            if (rows.length === 0) return true;

            const {error} = await supabase
                .from(cfg.table)
                .upsert(rows.map(cfg.toRemote), cfg.upsertOptions);

            if (error) {
                await recordSyncError(cfg.entity, error.message);
                return false;
            }

            await cfg.markSynced(rows);
            logger.debug(`Synced ${rows.length} ${cfg.entity}`);
            return true;
        } catch (e) {
            await recordSyncError(cfg.entity, unknownError(e));
            return false;
        }
    }

    private async pullTable(cfg: PullConfig): Promise<boolean> {
        try {
            const incremental = cfg.incremental ?? true;
            const lastSync = incremental ? await getLastSyncTime(cfg.entity) : null;

            let query = supabase.from(cfg.table).select(cfg.select ?? '*');
            if (cfg.applyFilters) query = cfg.applyFilters(query);
            if (lastSync) query = query.gt('updated_at', lastSync);

            const {data, error} = await query;
            if (error) {
                await recordSyncError(cfg.entity, error.message);
                return false;
            }

            const rows = cfg.clean ? cfg.clean(data || []) : (data || []);
            const success = await cfg.upsertLocal(rows);
            if (!success) {
                await recordSyncError(cfg.entity, `Failed to upsert ${cfg.entity} locally`);
                return false;
            }

            if (cfg.recordLastSync ?? true) await setLastSyncTime(cfg.entity);
            logger.debug(`Pulled ${data?.length || 0} ${cfg.entity}`);
            return true;
        } catch (e) {
            await recordSyncError(cfg.entity, unknownError(e));
            return false;
        }
    }

    // ==================== PUSH ====================
    async pushUser(): Promise<boolean> {
        try {
            const localUser = await getUserById(this.userId);
            if (!localUser) {
                await recordSyncError('user', 'Local user not found');
                return false;
            }

            const {error} = await supabase.from('users').upsert({
                id: localUser.id,
                email: localUser.email,
                username: localUser.username,
            });

            if (error) {
                await recordSyncError('user', error.message);
                return false;
            }
            return true;
        } catch (e) {
            await recordSyncError('user', unknownError(e));
            return false;
        }
    }

    async pushExercises(): Promise<boolean> {
        return this.pushTable({
            entity: 'exercises',
            table: 'exercises',
            getUnsynced: getUnsyncedExercises,
            toRemote: e => ({
                id: e.id, user_id: e.user_id, name: e.name, description: e.description,
                created_at: e.created_at, updated_at: e.updated_at, deleted_at: e.deleted_at,
            }),
            markSynced: rows => markExercisesAsSynced(rows.map(e => e.id)),
        });
    }

    async pushExerciseBodyParts(): Promise<boolean> {
        return this.pushTable({
            entity: 'exercise_body_parts',
            table: 'exercise_body_parts',
            getUnsynced: getUnsyncedExerciseBodyParts,
            toRemote: item => ({
                exercise_id: item.exercise_id, body_part_id: item.body_part_id,
                created_at: item.created_at, updated_at: item.updated_at, deleted_at: item.deleted_at,
            }),
            upsertOptions: {onConflict: 'exercise_id,body_part_id'},
            markSynced: rows => markExerciseBodyPartsAsSynced(
                rows.map(item => ({exercise_id: item.exercise_id, body_part_id: item.body_part_id}))
            ),
        });
    }

    async pushWorkouts(): Promise<boolean> {
        return this.pushTable({
            entity: 'workouts',
            table: 'workouts',
            getUnsynced: getUnsyncedWorkouts,
            toRemote: w => ({
                id: w.id, user_id: w.user_id, name: w.name, completed_at: w.completed_at,
                created_at: w.created_at, updated_at: w.updated_at, deleted_at: w.deleted_at,
            }),
            markSynced: rows => markWorkoutsAsSynced(rows.map(w => w.id)),
        });
    }

    async pushWorkoutExercises(): Promise<boolean> {
        return this.pushTable({
            entity: 'workout_exercises',
            table: 'workout_exercises',
            getUnsynced: getUnsyncedWorkoutExercises,
            cascade: async (rows) => {
                const parentIds = [...new Set(rows.map(we => we.workout_id).filter(Boolean))] as string[];
                const parents = await getWorkoutsByIdsWithDeletedStatus(parentIds);
                const deletedAtByParent = new Map(parents.map(w => [w.id, w.deleted_at]));
                for (const we of rows) {
                    const parentDeletedAt = we.workout_id ? deletedAtByParent.get(we.workout_id) : null;
                    if (parentDeletedAt != null && !we.deleted_at) {
                        await markWorkoutExerciseAsDeleted(we.id, parentDeletedAt);
                    }
                }
                return getUnsyncedWorkoutExercises();
            },
            toRemote: we => ({
                id: we.id, workout_id: we.workout_id, exercise_id: we.exercise_id,
                order_index: we.order_index, created_at: we.created_at,
                updated_at: we.updated_at, deleted_at: we.deleted_at,
            }),
            markSynced: rows => markWorkoutExercisesAsSynced(rows.map(we => we.id)),
        });
    }

    async pushSets(): Promise<boolean> {
        return this.pushTable({
            entity: 'workout_exercise_sets',
            table: 'workout_exercise_sets',
            getUnsynced: getUnsyncedWorkoutExerciseSets,
            cascade: async (rows) => {
                const parentIds = [...new Set(rows.map(s => s.workout_exercise_id).filter(Boolean))] as string[];
                const parents = await getWorkoutExercisesByIdsWithDeletedStatus(parentIds);
                const deletedAtByParent = new Map(parents.map(we => [we.id, we.deleted_at]));
                for (const s of rows) {
                    const parentDeletedAt = s.workout_exercise_id ? deletedAtByParent.get(s.workout_exercise_id) : null;
                    if (parentDeletedAt != null && !s.deleted_at) {
                        await markWorkoutExerciseSetAsDeleted(s.id, parentDeletedAt);
                    }
                }
                return getUnsyncedWorkoutExerciseSets();
            },
            toRemote: s => ({
                id: s.id, workout_exercise_id: s.workout_exercise_id, set_number: s.set_number,
                reps: s.reps, is_pr: s.is_pr, weight: s.weight,
                created_at: s.created_at, updated_at: s.updated_at, deleted_at: s.deleted_at,
            }),
            markSynced: rows => markWorkoutExerciseSetsAsSynced(rows.map(s => s.id)),
        });
    }

    async pushBodyWeightEntries(): Promise<boolean> {
        return this.pushTable({
            entity: 'body_weight_entries',
            table: 'body_weight_entries',
            getUnsynced: () => getUnsyncedBodyWeightEntries(this.userId),
            toRemote: e => ({
                id: e.id, user_id: e.user_id, weight: e.weight, recorded_at: e.recorded_at,
                notes: e.notes, created_at: e.created_at, updated_at: e.updated_at, deleted_at: e.deleted_at,
            }),
            markSynced: rows => markBodyWeightEntriesAsSynced(rows.map(e => e.id)),
        });
    }

    async pushAll(): Promise<boolean> {
        logger.debug('Starting full push...');

        if (!await this.pushUser()) {
            logger.error('User push failed');
            return false;
        }
        if (!await this.pushExercises()) {
            logger.error('Exercises push failed');
            return false;
        }
        if (!await this.pushExerciseBodyParts()) {
            logger.warn('Exercise body parts push had issues, continuing...');
        }
        if (!await this.pushWorkouts()) {
            logger.error('Workouts push failed');
            return false;
        }
        if (!await this.pushWorkoutExercises()) {
            logger.error('Workout exercises push failed');
            return false;
        }
        if (!await this.pushSets()) {
            logger.error('Sets push failed');
            return false;
        }
        if (!await this.pushBodyWeightEntries()) {
            logger.error('Body weight entries push failed');
            return false;
        }

        logger.debug('✅ Full push completed successfully');
        return true;
    }

    // ==================== PULL ====================
    async pullWorkouts(): Promise<boolean> {
        return this.pullTable({
            entity: 'workouts',
            table: 'workouts',
            applyFilters: q => q.eq('user_id', this.userId).is('deleted_at', null).not('completed_at', 'is', null),
            upsertLocal: upsertWorkoutsFromRemote,
        });
    }

    async pullExercises(): Promise<boolean> {
        return this.pullTable({
            entity: 'exercises',
            table: 'exercises',
            applyFilters: q => q.eq('user_id', this.userId).is('deleted_at', null),
            upsertLocal: upsertExercisesFromRemote,
        });
    }

    async pullWorkoutExercises(): Promise<boolean> {
        return this.pullTable({
            entity: 'workout_exercises',
            table: 'workout_exercises',
            select: '*, workouts!inner(user_id)',
            applyFilters: q => q.eq('workouts.user_id', this.userId).is('deleted_at', null),
            clean: rows => rows.map(({workouts, ...rest}) => rest),
            upsertLocal: upsertWorkoutExercisesFromRemote,
        });
    }

    async pullSets(): Promise<boolean> {
        return this.pullTable({
            entity: 'workout_exercise_sets',
            table: 'workout_exercise_sets',
            select: '*, workout_exercises!inner(workout_id, workouts!inner(user_id))',
            applyFilters: q => q.eq('workout_exercises.workouts.user_id', this.userId).is('deleted_at', null),
            clean: rows => rows.map(({workout_exercises, ...rest}) => rest),
            upsertLocal: upsertWorkoutExerciseSetsFromRemote,
        });
    }

    async pullExerciseBodyParts(): Promise<boolean> {
        return this.pullTable({
            entity: 'exercise_body_parts',
            table: 'exercise_body_parts',
            applyFilters: q => q.is('deleted_at', null),
            upsertLocal: upsertExerciseBodyPartsFromRemote,
        });
    }

    async pullBodyParts(): Promise<boolean> {
        return this.pullTable({
            entity: 'body_parts',
            table: 'body_parts',
            incremental: false,
            recordLastSync: false,
            upsertLocal: upsertBodyPartsFromRemote,
        });
    }

    async pullBodyWeightEntries(): Promise<boolean> {
        return this.pullTable({
            entity: 'body_weight_entries',
            table: 'body_weight_entries',
            applyFilters: q => q.eq('user_id', this.userId).is('deleted_at', null),
            upsertLocal: upsertBodyWeightEntriesFromRemote,
        });
    }

    async pullAll(): Promise<boolean> {
        logger.debug('Starting full pull...');

        if (!await this.pullBodyParts()) {
            logger.error('Body parts pull failed');
            return false;
        }
        if (!await this.pullExercises()) {
            logger.error('Exercises pull failed');
            return false;
        }
        if (!await this.pullWorkouts()) {
            logger.error('Workouts pull failed');
            return false;
        }
        if (!await this.pullWorkoutExercises()) {
            logger.error('Workout exercises pull failed');
            return false;
        }
        if (!await this.pullSets()) {
            logger.error('Sets pull failed');
            return false;
        }
        if (!await this.pullExerciseBodyParts()) {
            logger.error('Exercise body parts pull failed');
            return false;
        }
        if (!await this.pullBodyWeightEntries()) {
            logger.error('Body weight entries pull failed');
            return false;
        }

        logger.debug('✅ Full pull completed successfully');
        return true;
    }
}
