import { supabase } from '@/utils/supabase';
import { readCache, writeCache } from '@/repositories/communityCache';
import {
    enqueueKudos,
    clearPendingKudos,
    getPendingKudosMap,
    KudosAction,
} from '@/repositories/pendingKudos';

/**
 * Communities data access. Unlike the offline-first local repositories, the
 * social layer is online-only and lives entirely on Supabase, reached through
 * security-definer RPCs (see supabase/communities_phase1.sql).
 *
 * Reads are network-first with a local cache fallback: a successful fetch
 * refreshes the cache, and a failed fetch (typically offline) is served from the
 * last-synced cache and flagged `stale`. Kudos writes fall back to a local outbox
 * when offline and are flushed on the next sync.
 */

export interface Community {
    id: string;
    name: string;
    invite_code: string;
    role: string;
    member_count: number;
    is_public: boolean;
}

export interface PublicCommunity {
    id: string;
    name: string;
    member_count: number;
    is_member: boolean;
}

export interface CommunityMember {
    user_id: string;
    username: string;
    role: string;
    joined_at: string;
}

export interface FeedEvent {
    id: string;
    actor_user_id: string;
    actor_username: string;
    type: 'workout_completed' | 'pr' | 'streak_milestone' | 'badge_unlocked' | 'session_planned';
    payload: Record<string, any>;
    created_at: string;
    kudos_count: number;
    i_kudosed: boolean;
    /** RSVP state, populated for session_planned events. */
    rsvp_count: number;
    i_rsvped: boolean;
}

export interface LeaderboardRow {
    user_id: string;
    username: string;
    score: number | null;
}

export type LeaderboardMetric = 'consistency' | 'volume' | 'relative' | 'improved';
export type LeaderboardPeriod = 'week' | 'month' | 'all';

/** A read result plus whether it was served from cache after a failed fetch. */
export interface CachedResult<T> {
    data: T;
    stale: boolean;
}

/**
 * Network-first read with cache fallback. On success, refresh the cache and
 * return `stale: false`. On failure, return the last-synced cache (or `empty`)
 * flagged `stale: true`.
 */
export async function cachedRead<T>(key: string, fetcher: () => Promise<T>, empty: T): Promise<CachedResult<T>> {
    try {
        const data = await fetcher();
        await writeCache(key, data);
        return { data, stale: false };
    } catch {
        const cached = await readCache<T>(key);
        return { data: cached ?? empty, stale: true };
    }
}

/** Apply a queued (offline) kudos op to a feed event so the UI reflects intent. */
export function applyPendingKudos(event: FeedEvent, action: KudosAction | undefined): FeedEvent {
    if (action === 'add' && !event.i_kudosed) {
        return { ...event, i_kudosed: true, kudos_count: event.kudos_count + 1 };
    }
    if (action === 'remove' && event.i_kudosed) {
        return { ...event, i_kudosed: false, kudos_count: Math.max(0, event.kudos_count - 1) };
    }
    return event;
}

/** Create a community; the caller becomes its first admin. Returns the new row. */
export async function createCommunity(name: string): Promise<Community> {
    const { data, error } = await supabase.rpc('create_community', { p_name: name.trim() });
    if (error) throw new Error(error.message);
    return data as Community;
}

/** Join a community by invite code. Throws "invalid invite code" on a bad code. */
export async function joinCommunity(code: string): Promise<Community> {
    const { data, error } = await supabase.rpc('join_community', { p_code: code.trim() });
    if (error) throw new Error(error.message);
    return data as Community;
}

/** Communities the current user belongs to (cached). */
export async function getMyCommunities(): Promise<CachedResult<Community[]>> {
    return cachedRead('my_communities', async () => {
        const { data, error } = await supabase.rpc('my_communities');
        if (error) throw new Error(error.message);
        return ((data ?? []) as any[]).map(c => ({
            id: c.id,
            name: c.name,
            invite_code: c.invite_code,
            role: c.role,
            member_count: Number(c.member_count ?? 0),
            is_public: !!c.is_public,
        }));
    }, []);
}

/** Search discoverable (public) communities by name. Empty query lists all. */
export async function searchPublicCommunities(query: string): Promise<PublicCommunity[]> {
    const { data, error } = await supabase.rpc('search_public_communities', { p_query: query });
    if (error) throw new Error(error.message);
    return ((data ?? []) as any[]).map(c => ({
        id: c.id,
        name: c.name,
        member_count: Number(c.member_count ?? 0),
        is_member: !!c.is_member,
    }));
}

/** Join a public community without an invite code. */
export async function joinPublicCommunity(communityId: string): Promise<Community> {
    const { data, error } = await supabase.rpc('join_public_community', { p_id: communityId });
    if (error) throw new Error(error.message);
    return data as Community;
}

/** Admin: publish or unpublish a community. */
export async function setCommunityVisibility(communityId: string, isPublic: boolean): Promise<void> {
    const { error } = await supabase.rpc('set_community_visibility', {
        p_id: communityId,
        p_public: isPublic,
    });
    if (error) throw new Error(error.message);
}

/** Delete a feed post (author or community admin, enforced by RLS). */
export async function deleteFeedEvent(feedEventId: string): Promise<void> {
    const { error } = await supabase.from('feed_events').delete().eq('id', feedEventId);
    if (error) throw new Error(error.message);
}

/** Members of a community (cached; caller must be a member). */
export async function getCommunityMembers(communityId: string): Promise<CachedResult<CommunityMember[]>> {
    return cachedRead(`members:${communityId}`, async () => {
        const { data, error } = await supabase.rpc('community_members_list', { p_community_id: communityId });
        if (error) throw new Error(error.message);
        return (data ?? []) as CommunityMember[];
    }, []);
}

/** Newest-first feed for a community (cached), with queued offline kudos overlaid. */
export async function getCommunityFeed(communityId: string, limit = 50): Promise<CachedResult<FeedEvent[]>> {
    const res = await cachedRead<FeedEvent[]>(`feed:${communityId}`, async () => {
        const { data, error } = await supabase.rpc('community_feed', {
            p_community_id: communityId,
            p_limit: limit,
        });
        if (error) throw new Error(error.message);
        return (data ?? []) as FeedEvent[];
    }, []);

    try {
        const pending = await getPendingKudosMap();
        if (pending.size > 0) {
            res.data = res.data.map(e => applyPendingKudos(e, pending.get(e.id)));
        }
    } catch {
        // Overlay is best-effort; never let it break the feed load.
    }
    return res;
}

/**
 * A community leaderboard for a metric and timeframe (cached). Scores are coerced
 * to numbers. The `improved` metric ignores the period (always this week vs the
 * member's own prior 4-week baseline).
 */
export async function getLeaderboard(
    communityId: string,
    metric: LeaderboardMetric,
    period: LeaderboardPeriod = 'week'
): Promise<CachedResult<LeaderboardRow[]>> {
    return cachedRead(`leaderboard:${communityId}:${metric}:${period}`, async () => {
        const { data, error } = await supabase.rpc('community_leaderboard', {
            p_community_id: communityId,
            p_metric: metric,
            p_period: period,
        });
        if (error) throw new Error(error.message);
        return ((data ?? []) as any[]).map(r => ({
            user_id: r.user_id,
            username: r.username,
            score: r.score == null ? null : Number(r.score),
        }));
    }, []);
}

/** Give kudos to a feed event. Idempotent via the (event, user, reaction) key. */
export async function addKudos(feedEventId: string, userId: string): Promise<void> {
    const { error } = await supabase
        .from('kudos')
        .upsert(
            { feed_event_id: feedEventId, user_id: userId, reaction: 'clap' },
            { onConflict: 'feed_event_id,user_id,reaction' }
        );
    if (error) throw new Error(error.message);
}

/** Remove the current user's kudos from a feed event. */
export async function removeKudos(feedEventId: string, userId: string): Promise<void> {
    const { error } = await supabase
        .from('kudos')
        .delete()
        .eq('feed_event_id', feedEventId)
        .eq('user_id', userId)
        .eq('reaction', 'clap');
    if (error) throw new Error(error.message);
}

/**
 * Set the caller's kudos state on an event. Tries online first; if that fails
 * (offline/transient) it queues the intended state to the local outbox for the
 * next sync and keeps the optimistic UI. Never throws.
 */
export async function setKudos(feedEventId: string, userId: string, want: boolean): Promise<void> {
    try {
        if (want) await addKudos(feedEventId, userId);
        else await removeKudos(feedEventId, userId);
        await clearPendingKudos(feedEventId, userId);
    } catch {
        await enqueueKudos(feedEventId, userId, want ? 'add' : 'remove');
    }
}

/** Leave a community (removes the current user's membership). */
export async function leaveCommunity(communityId: string, userId: string): Promise<void> {
    const { error } = await supabase
        .from('community_members')
        .delete()
        .eq('community_id', communityId)
        .eq('user_id', userId);
    if (error) throw new Error(error.message);
}
