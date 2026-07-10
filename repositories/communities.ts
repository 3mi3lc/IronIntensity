import { supabase } from '@/utils/supabase';

/**
 * Communities data access. Unlike the offline-first local repositories, the
 * social layer is online-only and lives entirely on Supabase, reached through
 * security-definer RPCs (see supabase/communities_phase1.sql). Every call throws
 * on error so screens can surface it; callers should handle the offline case.
 */

export interface Community {
    id: string;
    name: string;
    invite_code: string;
    role: string;
    member_count: number;
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
    type: 'workout_completed' | 'pr' | 'streak_milestone' | 'badge_unlocked';
    payload: Record<string, any>;
    created_at: string;
    kudos_count: number;
    i_kudosed: boolean;
}

export interface LeaderboardRow {
    user_id: string;
    username: string;
    score: number | null;
}

export type LeaderboardMetric = 'consistency' | 'improved';

function unwrap<T>(data: T | null, error: { message: string } | null): T {
    if (error) throw new Error(error.message);
    return (data ?? ([] as unknown as T));
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

/** Communities the current user belongs to, with member counts and their role. */
export async function getMyCommunities(): Promise<Community[]> {
    const { data, error } = await supabase.rpc('my_communities');
    return unwrap(data, error);
}

/** Members of a community (caller must be a member). */
export async function getCommunityMembers(communityId: string): Promise<CommunityMember[]> {
    const { data, error } = await supabase.rpc('community_members_list', {
        p_community_id: communityId,
    });
    return unwrap(data, error);
}

/** Newest-first feed for a community, enriched with kudos state. */
export async function getCommunityFeed(communityId: string, limit = 50): Promise<FeedEvent[]> {
    const { data, error } = await supabase.rpc('community_feed', {
        p_community_id: communityId,
        p_limit: limit,
    });
    return unwrap(data, error);
}

/** A weekly leaderboard for a community. Scores are coerced to numbers. */
export async function getLeaderboard(
    communityId: string,
    metric: LeaderboardMetric
): Promise<LeaderboardRow[]> {
    const fn = metric === 'consistency'
        ? 'community_leaderboard_consistency'
        : 'community_leaderboard_improved';
    const { data, error } = await supabase.rpc(fn, { p_community_id: communityId });
    const rows = unwrap<any[]>(data, error);
    return rows.map(r => ({
        user_id: r.user_id,
        username: r.username,
        score: r.score == null ? null : Number(r.score),
    }));
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

/** Leave a community (removes the current user's membership). */
export async function leaveCommunity(communityId: string, userId: string): Promise<void> {
    const { error } = await supabase
        .from('community_members')
        .delete()
        .eq('community_id', communityId)
        .eq('user_id', userId);
    if (error) throw new Error(error.message);
}
