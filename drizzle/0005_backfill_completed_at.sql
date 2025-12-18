UPDATE workouts
SET completed_at = created_at, is_synced = 0
WHERE completed_at IS NULL AND deleted_at IS NULL;