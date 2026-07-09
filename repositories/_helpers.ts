// Shared field builders for repository mutations. These centralize two
// offline-first conventions that were previously hand-repeated in every
// repository (and easy to forget): stamp `updated_at` and reset `is_synced = 0`
// on any local change so SyncService picks it up, and set the soft-delete
// columns consistently.
import { now } from '@/utils/id';

/**
 * Fields to spread into an `.set({...})` on any local mutation. Pass a shared
 * timestamp to keep it identical across a multi-statement operation; defaults
 * to `now()`.
 */
export const touch = (ts: string = now()) => ({
    updated_at: ts,
    is_synced: 0,
});

/**
 * Fields to spread into an `.set({...})` for a soft delete. `deleted_at` and
 * `updated_at` share the timestamp, and `is_synced` is reset.
 */
export const softDeleteFields = (ts: string = now()) => ({
    deleted_at: ts,
    updated_at: ts,
    is_synced: 0,
});
