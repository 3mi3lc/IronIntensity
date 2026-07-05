-- Copy all data from one user to another, remapping all UUIDs.
-- Source user: e5d8b1d2-b187-42f9-b695-9a5bc267b7b5
-- Target user: 288e6ca6-53be-4419-bc11-16d87e46cf16
--
-- Run this in the Supabase SQL editor.
-- Safe to re-run: INSERT ... ON CONFLICT DO NOTHING prevents duplicates.

DO $$
DECLARE
    src_user_id uuid := 'e5d8b1d2-b187-42f9-b695-9a5bc267b7b5';
    tgt_user_id uuid := '288e6ca6-53be-4419-bc11-16d87e46cf16';
BEGIN

    -- -------------------------------------------------------------------------
    -- 1. exercises
    --    New UUID = gen_random_uuid(), stored in a temp mapping table.
    -- -------------------------------------------------------------------------
    CREATE TEMP TABLE IF NOT EXISTS exercise_id_map (
        old_id uuid PRIMARY KEY,
        new_id uuid NOT NULL DEFAULT gen_random_uuid()
    );

    INSERT INTO exercise_id_map (old_id)
    SELECT id FROM exercises
    WHERE user_id = src_user_id
    ON CONFLICT DO NOTHING;

    INSERT INTO exercises (id, user_id, name, description, created_at, updated_at, deleted_at, is_synced)
    SELECT
        m.new_id,
        tgt_user_id,
        e.name,
        e.description,
        e.created_at,
        e.updated_at,
        e.deleted_at,
        0  -- mark as unsynced so the target user's next sync pushes them
    FROM exercises e
    JOIN exercise_id_map m ON m.old_id = e.id
    ON CONFLICT (id) DO NOTHING;

    -- -------------------------------------------------------------------------
    -- 2. exercise_body_parts  (junction: exercise_id -> body_part_id)
    --    body_part_id references the shared body_parts table — no remapping needed.
    -- -------------------------------------------------------------------------
    INSERT INTO exercise_body_parts (exercise_id, body_part_id, created_at, updated_at, deleted_at, is_synced)
    SELECT
        m.new_id,
        ebp.body_part_id,
        ebp.created_at,
        ebp.updated_at,
        ebp.deleted_at,
        0
    FROM exercise_body_parts ebp
    JOIN exercise_id_map m ON m.old_id = ebp.exercise_id
    ON CONFLICT (exercise_id, body_part_id) DO NOTHING;

    -- -------------------------------------------------------------------------
    -- 3. workouts
    -- -------------------------------------------------------------------------
    CREATE TEMP TABLE IF NOT EXISTS workout_id_map (
        old_id uuid PRIMARY KEY,
        new_id uuid NOT NULL DEFAULT gen_random_uuid()
    );

    INSERT INTO workout_id_map (old_id)
    SELECT id FROM workouts
    WHERE user_id = src_user_id
    ON CONFLICT DO NOTHING;

    INSERT INTO workouts (id, user_id, name, completed_at, created_at, updated_at, deleted_at, is_synced)
    SELECT
        m.new_id,
        tgt_user_id,
        w.name,
        w.completed_at,
        w.created_at,
        w.updated_at,
        w.deleted_at,
        0
    FROM workouts w
    JOIN workout_id_map m ON m.old_id = w.id
    ON CONFLICT (id) DO NOTHING;

    -- -------------------------------------------------------------------------
    -- 4. workout_exercises
    -- -------------------------------------------------------------------------
    CREATE TEMP TABLE IF NOT EXISTS workout_exercise_id_map (
        old_id uuid PRIMARY KEY,
        new_id uuid NOT NULL DEFAULT gen_random_uuid()
    );

    INSERT INTO workout_exercise_id_map (old_id)
    SELECT we.id
    FROM workout_exercises we
    JOIN workout_id_map wm ON wm.old_id = we.workout_id
    ON CONFLICT DO NOTHING;

    INSERT INTO workout_exercises (id, workout_id, exercise_id, order_index, created_at, updated_at, deleted_at, is_synced)
    SELECT
        wem.new_id,
        wm.new_id,   -- remapped workout_id
        em.new_id,   -- remapped exercise_id
        we.order_index,
        we.created_at,
        we.updated_at,
        we.deleted_at,
        0
    FROM workout_exercises we
    JOIN workout_exercise_id_map wem ON wem.old_id = we.id
    JOIN workout_id_map wm           ON wm.old_id  = we.workout_id
    JOIN exercise_id_map em          ON em.old_id  = we.exercise_id
    ON CONFLICT (id) DO NOTHING;

    -- -------------------------------------------------------------------------
    -- 5. workout_exercise_sets
    -- -------------------------------------------------------------------------
    INSERT INTO workout_exercise_sets (id, workout_exercise_id, set_number, reps, weight, is_pr, created_at, updated_at, deleted_at, is_synced)
    SELECT
        gen_random_uuid(),
        wem.new_id,  -- remapped workout_exercise_id
        wes.set_number,
        wes.reps,
        wes.weight,
        wes.is_pr,
        wes.created_at,
        wes.updated_at,
        wes.deleted_at,
        0
    FROM workout_exercise_sets wes
    JOIN workout_exercise_id_map wem ON wem.old_id = wes.workout_exercise_id
    ON CONFLICT (id) DO NOTHING;

    -- -------------------------------------------------------------------------
    -- 6. body_weight_entries
    -- -------------------------------------------------------------------------
    INSERT INTO body_weight_entries (id, user_id, weight, recorded_at, notes, created_at, updated_at, deleted_at, is_synced)
    SELECT
        gen_random_uuid(),
        tgt_user_id,
        bwe.weight,
        bwe.recorded_at,
        bwe.notes,
        bwe.created_at,
        bwe.updated_at,
        bwe.deleted_at,
        0
    FROM body_weight_entries bwe
    WHERE bwe.user_id = src_user_id
    ON CONFLICT (id) DO NOTHING;

    -- -------------------------------------------------------------------------
    -- Cleanup temp tables
    -- -------------------------------------------------------------------------
    DROP TABLE exercise_id_map;
    DROP TABLE workout_id_map;
    DROP TABLE workout_exercise_id_map;

END $$;
