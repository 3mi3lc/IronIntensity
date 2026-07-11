import { supabase } from '@/utils/supabase';
import { cachedRead, CachedResult } from '@/repositories/communities';

/**
 * Shared community calendar: planned sessions (with RSVP + owner check-in) and
 * recurring weekly schedules. Online-only like the rest of the social layer;
 * reads use the network-first cache fallback, writes are online.
 */

export interface PlannedSession {
    id: string;
    user_id: string;
    username: string;
    scheduled_date: string;      // 'YYYY-MM-DD'
    scheduled_time: string | null; // 'HH:MM'
    title: string | null;
    checked_in: boolean;
    is_own: boolean;
    rsvp_count: number;
    i_rsvped: boolean;
}

export interface RecurringSchedule {
    user_id: string;
    username: string;
    weekdays: number[];          // ISO 1=Mon .. 7=Sun
    scheduled_time: string | null;
    title: string | null;
}

export interface ReliabilityRow {
    user_id: string;
    username: string;
    kept: number;
    total: number;
}

// ==================== READS (cached) ====================

/** Upcoming planned sessions for a community, enriched for the caller. */
export async function getCommunityCalendar(communityId: string): Promise<CachedResult<PlannedSession[]>> {
    return cachedRead(`calendar:${communityId}`, async () => {
        const { data, error } = await supabase.rpc('community_calendar', { p_community_id: communityId });
        if (error) throw new Error(error.message);
        return ((data ?? []) as any[]).map(r => ({
            id: r.id,
            user_id: r.user_id,
            username: r.username,
            scheduled_date: r.scheduled_date,
            scheduled_time: r.scheduled_time,
            title: r.title,
            checked_in: !!r.checked_in,
            is_own: !!r.is_own,
            rsvp_count: Number(r.rsvp_count ?? 0),
            i_rsvped: !!r.i_rsvped,
        }));
    }, []);
}

/** Every member's recurring weekly pattern. */
export async function getRecurringSchedules(communityId: string): Promise<CachedResult<RecurringSchedule[]>> {
    return cachedRead(`recurring:${communityId}`, async () => {
        const { data, error } = await supabase.rpc('community_recurring', { p_community_id: communityId });
        if (error) throw new Error(error.message);
        return ((data ?? []) as any[]).map(r => ({
            user_id: r.user_id,
            username: r.username,
            weekdays: (r.weekdays ?? []) as number[],
            scheduled_time: r.scheduled_time,
            title: r.title,
        }));
    }, []);
}

/** Per-member reliability (kept vs total past planned sessions). */
export async function getReliability(communityId: string): Promise<CachedResult<ReliabilityRow[]>> {
    return cachedRead(`reliability:${communityId}`, async () => {
        const { data, error } = await supabase.rpc('community_reliability', { p_community_id: communityId });
        if (error) throw new Error(error.message);
        return ((data ?? []) as any[]).map(r => ({
            user_id: r.user_id,
            username: r.username,
            kept: Number(r.kept ?? 0),
            total: Number(r.total ?? 0),
        }));
    }, []);
}

// ==================== WRITES (online) ====================

/** Plan a one-off session. `time` and `title` are optional. Returns the new row. */
export async function createPlannedSession(
    communityId: string,
    date: string,
    time: string | null,
    title: string | null
): Promise<{ id: string; scheduled_date: string; scheduled_time: string | null }> {
    const { data, error } = await supabase.rpc('create_planned_session', {
        p_community_id: communityId,
        p_date: date,
        p_time: time,
        p_title: title,
    });
    if (error) throw new Error(error.message);
    return {
        id: (data as any).id,
        scheduled_date: (data as any).scheduled_date,
        scheduled_time: (data as any).scheduled_time,
    };
}

/** Delete your own planned session. */
export async function deletePlannedSession(sessionId: string): Promise<void> {
    const { error } = await supabase.from('planned_sessions').delete().eq('id', sessionId);
    if (error) throw new Error(error.message);
}

/** Mark that you showed up to your own planned session. */
export async function checkinPlannedSession(sessionId: string): Promise<void> {
    const { error } = await supabase.rpc('checkin_planned_session', { p_id: sessionId });
    if (error) throw new Error(error.message);
}

/** RSVP ("I'm in") to a planned session. */
export async function rsvpSession(sessionId: string, userId: string): Promise<void> {
    const { error } = await supabase
        .from('session_rsvps')
        .upsert(
            { planned_session_id: sessionId, user_id: userId },
            { onConflict: 'planned_session_id,user_id' }
        );
    if (error) throw new Error(error.message);
}

/** Remove your RSVP from a planned session. */
export async function unrsvpSession(sessionId: string, userId: string): Promise<void> {
    const { error } = await supabase
        .from('session_rsvps')
        .delete()
        .eq('planned_session_id', sessionId)
        .eq('user_id', userId);
    if (error) throw new Error(error.message);
}

/** Upsert the caller's weekly recurring schedule for a community. */
export async function setRecurringSchedule(
    communityId: string,
    weekdays: number[],
    time: string | null,
    title: string | null
): Promise<void> {
    const { error } = await supabase.rpc('set_recurring_schedule', {
        p_community_id: communityId,
        p_weekdays: weekdays,
        p_time: time,
        p_title: title,
    });
    if (error) throw new Error(error.message);
}
