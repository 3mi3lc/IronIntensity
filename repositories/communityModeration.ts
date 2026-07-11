import { supabase } from '@/utils/supabase';

/**
 * Moderation: member reports, admin member removal, and admin report review.
 * Online-only; admin actions are enforced server-side by is_community_admin.
 */

export interface Report {
    id: string;
    target_type: 'feed_event' | 'member';
    target_id: string;
    reason: string | null;
    reporter_username: string;
    created_at: string;
    event_type: string | null;
    event_actor: string | null;
    event_payload: Record<string, any> | null;
    target_username: string | null;
}

/** Report a feed post for admin review. */
export async function reportFeedEvent(
    communityId: string,
    feedEventId: string,
    userId: string,
    reason: string | null
): Promise<void> {
    const { error } = await supabase.from('reports').insert({
        community_id: communityId,
        reporter_user_id: userId,
        target_type: 'feed_event',
        target_id: feedEventId,
        reason,
    });
    if (error) throw new Error(error.message);
}

/** Report a member for admin review. */
export async function reportMember(
    communityId: string,
    memberUserId: string,
    userId: string,
    reason: string | null
): Promise<void> {
    const { error } = await supabase.from('reports').insert({
        community_id: communityId,
        reporter_user_id: userId,
        target_type: 'member',
        target_id: memberUserId,
        reason,
    });
    if (error) throw new Error(error.message);
}

/** Admin: promote a member to admin. */
export async function promoteMember(communityId: string, userId: string): Promise<void> {
    const { error } = await supabase.rpc('promote_member', {
        p_community_id: communityId,
        p_user_id: userId,
    });
    if (error) throw new Error(error.message);
}

/** Admin: remove a (non-admin) member from a community. */
export async function removeMember(communityId: string, userId: string): Promise<void> {
    const { error } = await supabase.rpc('remove_member', {
        p_community_id: communityId,
        p_user_id: userId,
    });
    if (error) throw new Error(error.message);
}

/** Admin: unresolved reports for a community. */
export async function getReports(communityId: string): Promise<Report[]> {
    const { data, error } = await supabase.rpc('community_reports', { p_community_id: communityId });
    if (error) throw new Error(error.message);
    return (data ?? []) as Report[];
}

/** Admin: mark a report resolved. */
export async function resolveReport(reportId: string): Promise<void> {
    const { error } = await supabase.rpc('resolve_report', { p_id: reportId });
    if (error) throw new Error(error.message);
}
