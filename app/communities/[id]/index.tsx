import { View, Text, TouchableOpacity, ScrollView, RefreshControl, Alert, Share, ActivityIndicator } from 'react-native';
import { useState, useCallback, useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AntDesign } from '@expo/vector-icons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { formatDistanceToNow, format, parseISO } from 'date-fns';
import { useAuth } from '@/hooks/useAuth';
import {
    getCommunityFeed,
    getLeaderboard,
    setKudos,
    deleteFeedEvent,
    FeedEvent,
    LeaderboardRow,
    LeaderboardMetric,
    LeaderboardPeriod,
} from '@/repositories/communities';
import { reportFeedEvent } from '@/repositories/communityModeration';
import { rsvpSession, unrsvpSession } from '@/repositories/communityCalendar';
import { getNotifPrefs } from '@/utils/notificationPrefs';
import { scheduleSessionReminder, cancelSessionReminder } from '@/utils/localReminders';
import { logger } from '@/utils/logger';
import { CommunityCalendarTab } from '@/components/communityCalendarTab';
import { ReportModal } from '@/components/reportModal';

type Tab = 'feed' | 'leaderboard' | 'calendar';

const TAB_LABELS: Record<Tab, string> = {
    feed: 'Feed',
    leaderboard: 'Leaderboard',
    calendar: 'Calendar',
};

/** One line of copy for a feed event. Weight is shown only for PRs (the carve-out). */
function feedLine(e: FeedEvent): { emoji: string; title: string; subtitle?: string } {
    const who = e.actor_username;
    switch (e.type) {
        case 'pr': {
            const wt = e.payload.weight != null ? `${e.payload.weight}kg × ${e.payload.reps}` : undefined;
            const name = e.payload.exercise_name ?? 'a lift';
            return { emoji: '🏆', title: `${who} set a PR`, subtitle: wt ? `${name}  ·  ${wt}` : name };
        }
        case 'streak_milestone':
            return { emoji: '🔥', title: `${who} hit a ${e.payload.weeks}-week streak` };
        case 'badge_unlocked':
            return { emoji: e.payload.icon ?? '🎖️', title: `${who} unlocked ${e.payload.title}` };
        case 'session_planned': {
            const day = e.payload.scheduled_date ? format(parseISO(e.payload.scheduled_date), 'EEE, MMM d') : '';
            const time = e.payload.scheduled_time ? ` at ${e.payload.scheduled_time}` : '';
            const sub = [e.payload.title, `${day}${time}`.trim()].filter(Boolean).join('  ·  ');
            return { emoji: '📅', title: `${who} planned a session`, subtitle: sub || undefined };
        }
        case 'workout_completed':
        default: {
            const sets = e.payload.set_count;
            const top = e.payload.top_lift_label;
            const bits = [sets != null ? `${sets} sets` : null, top].filter(Boolean).join('  ·  ');
            return { emoji: '💪', title: `${who} finished ${e.payload.workout_name ?? 'a workout'}`, subtitle: bits || undefined };
        }
    }
}

const METRICS: [LeaderboardMetric, string][] = [
    ['consistency', 'Consistency'],
    ['volume', 'Volume'],
    ['relative', 'Strength'],
    ['improved', 'Improved'],
];

const PERIODS: [LeaderboardPeriod, string][] = [
    ['week', 'Week'],
    ['month', 'Month'],
    ['all', 'All-time'],
];

const groupThousands = (n: number) => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');

function formatScore(metric: LeaderboardMetric, score: number | null): string {
    if (score == null) return '—';
    switch (metric) {
        case 'consistency': return `${score}`;
        case 'volume': return `${groupThousands(score)} kg`;
        case 'relative': return `${score.toFixed(2)}×`;
        case 'improved': return `${score > 0 ? '+' : ''}${score}%`;
    }
}

function metricNote(metric: LeaderboardMetric, period: LeaderboardPeriod): string {
    const window = period === 'week' ? 'this week' : period === 'month' ? 'this month' : 'all-time';
    switch (metric) {
        case 'consistency': return `Workouts completed ${window}.`;
        case 'volume': return `Total volume lifted ${window}.`;
        case 'relative': return `Best lift relative to bodyweight ${window}. Log your bodyweight to appear.`;
        case 'improved': return 'Volume change vs your own last 4 weeks.';
    }
}

export default function CommunityHomeScreen() {
    const { id, name, code, role } = useLocalSearchParams<{ id: string; name?: string; code?: string; role?: string }>();
    const { user } = useAuth();
    const isAdmin = role === 'admin';
    const [tab, setTab] = useState<Tab>('feed');
    const [metric, setMetric] = useState<LeaderboardMetric>('consistency');
    const [period, setPeriod] = useState<LeaderboardPeriod>('week');
    const [board, setBoard] = useState<LeaderboardRow[]>([]);
    const [feed, setFeed] = useState<FeedEvent[]>([]);
    const [boardLoading, setBoardLoading] = useState(true);
    const [feedLoading, setFeedLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [boardStale, setBoardStale] = useState(false);
    const [feedStale, setFeedStale] = useState(false);
    const [calendarStale, setCalendarStale] = useState(false);
    const [reportEvent, setReportEvent] = useState<FeedEvent | null>(null);
    const stale = boardStale || feedStale || calendarStale;

    // Reloads just the leaderboard (metric/period switches), so the surrounding
    // chrome and feed stay put and only the list area shows a spinner.
    const loadBoard = useCallback(async () => {
        if (!id) return;
        setBoardLoading(true);
        try {
            const b = await getLeaderboard(id, metric, period);
            setBoard(b.data);
            setBoardStale(b.stale);
        } finally {
            setBoardLoading(false);
        }
    }, [id, metric, period]);

    const loadFeed = useCallback(async () => {
        if (!id) return;
        try {
            const f = await getCommunityFeed(id);
            setFeed(f.data);
            setFeedStale(f.stale);
        } finally {
            setFeedLoading(false);
        }
    }, [id]);

    // Board reloads whenever the metric or period changes.
    useEffect(() => { loadBoard(); }, [loadBoard]);

    // Feed loads on focus (and on return to the screen).
    useFocusEffect(useCallback(() => { loadFeed(); }, [loadFeed]));

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await Promise.all([loadBoard(), loadFeed()]);
        setRefreshing(false);
    }, [loadBoard, loadFeed]);

    const onInvite = useCallback(() => {
        if (!code) return;
        Share.share({ message: `Join my community "${name}" on IronIntensity. Invite code: ${code}` })
            .catch(() => Alert.alert('Invite code', String(code)));
    }, [code, name]);

    const toggleKudos = useCallback(async (event: FeedEvent) => {
        if (!user?.id) return;
        const nextMine = !event.i_kudosed;
        // Optimistic update
        setFeed(prev => prev.map(e => e.id === event.id
            ? { ...e, i_kudosed: nextMine, kudos_count: e.kudos_count + (nextMine ? 1 : -1) }
            : e));
        // setKudos never throws: it delivers online, or queues to the local
        // outbox when offline for the next sync. The optimistic state stands.
        try {
            await setKudos(event.id, user.id, nextMine);
        } catch (e) {
            logger.error('Failed to toggle kudos:', e);
            // Revert
            setFeed(prev => prev.map(x => x.id === event.id
                ? { ...x, i_kudosed: event.i_kudosed, kudos_count: event.kudos_count }
                : x));
        }
    }, [user?.id]);

    const toggleFeedRsvp = useCallback(async (event: FeedEvent) => {
        const sid = event.payload?.session_id as string | undefined;
        if (!user?.id || !sid) return;
        const next = !event.i_rsvped;
        setFeed(prev => prev.map(e => e.id === event.id
            ? { ...e, i_rsvped: next, rsvp_count: e.rsvp_count + (next ? 1 : -1) }
            : e));
        try {
            if (next) {
                await rsvpSession(sid, user.id);
                const prefs = await getNotifPrefs();
                await scheduleSessionReminder(sid, event.payload.scheduled_date, event.payload.scheduled_time, event.payload.title ?? null, prefs);
            } else {
                await unrsvpSession(sid, user.id);
                await cancelSessionReminder(sid);
            }
        } catch (e) {
            logger.error('Failed to RSVP from feed:', e);
            setFeed(prev => prev.map(x => x.id === event.id
                ? { ...x, i_rsvped: event.i_rsvped, rsvp_count: event.rsvp_count }
                : x));
        }
    }, [user?.id]);

    const submitReport = useCallback(async (reason: string | null) => {
        const event = reportEvent;
        setReportEvent(null);
        if (!event || !id || !user?.id) return;
        try {
            await reportFeedEvent(id, event.id, user.id, reason);
            Alert.alert('Reported', 'Thanks — an admin will review this post.');
        } catch (e) {
            logger.error('Failed to report:', e);
            Alert.alert('Could not report', 'Check your connection and try again.');
        }
    }, [reportEvent, id, user?.id]);

    const deletePost = useCallback(async (event: FeedEvent) => {
        setFeed(prev => prev.filter(e => e.id !== event.id));
        try {
            await deleteFeedEvent(event.id);
        } catch (e) {
            logger.error('Failed to delete post:', e);
            Alert.alert('Could not delete', 'Check your connection and try again.');
            loadFeed();
        }
    }, [loadFeed]);

    // Overflow menu on a feed post: report (others') and/or delete (own or admin).
    const onPostMenu = useCallback((event: FeedEvent) => {
        const own = event.actor_user_id === user?.id;
        const buttons: { text: string; style?: 'cancel' | 'destructive'; onPress?: () => void }[] = [];
        if (!own) buttons.push({ text: 'Report', onPress: () => setReportEvent(event) });
        if (own || isAdmin) buttons.push({ text: 'Delete', style: 'destructive', onPress: () => deletePost(event) });
        if (buttons.length === 0) return;
        buttons.push({ text: 'Cancel', style: 'cancel' });
        Alert.alert('Post', undefined, buttons);
    }, [isAdmin, user?.id, deletePost]);

    return (
        <SafeAreaView className="flex-1 bg-surface_a0" edges={['top', 'left', 'right']}>
            {/* Header */}
            <View className="px-4 pt-4 pb-3 flex-row items-center">
                <TouchableOpacity
                    onPress={() => router.back()}
                    className="p-2 bg-surface_a10 rounded-xl"
                    activeOpacity={0.7}
                >
                    <AntDesign name="arrow-left" size={24} color="#eb0202" />
                </TouchableOpacity>
                <View className="flex-1 mx-3">
                    <Text className="text-primary_a0 font-bold text-xl text-center" numberOfLines={1}>{name ?? 'Community'}</Text>
                </View>
                <TouchableOpacity
                    onPress={() => router.push({ pathname: '/communities/[id]/members', params: { id: id!, name: name ?? '' } })}
                    className="p-2 bg-surface_a10 rounded-xl"
                    activeOpacity={0.7}
                >
                    <AntDesign name="team" size={22} color="#eb0202" />
                </TouchableOpacity>
            </View>

            {/* Invite */}
            {!!code && (
                <TouchableOpacity onPress={onInvite} activeOpacity={0.8} className="mx-4 mb-3 flex-row items-center justify-center bg-surface_a10 py-2 rounded-xl">
                    <AntDesign name="share-alt" size={14} color="#7a7a7a" />
                    <Text className="text-surface_a50 text-sm ml-2">Invite code: </Text>
                    <Text className="text-white text-sm font-bold tracking-widest">{code}</Text>
                </TouchableOpacity>
            )}

            {/* Tab switch */}
            <View className="flex-row mx-4 mb-3 bg-surface_a10 rounded-xl p-1">
                {(['feed', 'leaderboard', 'calendar'] as Tab[]).map(t => (
                    <TouchableOpacity
                        key={t}
                        onPress={() => setTab(t)}
                        className={`flex-1 py-2 rounded-lg ${tab === t ? 'bg-primary_a0' : ''}`}
                        activeOpacity={0.85}
                    >
                        <Text className={`text-center font-bold text-sm ${tab === t ? 'text-white' : 'text-surface_a50'}`}>
                            {TAB_LABELS[t]}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            <ScrollView
                className="flex-1 px-4"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 40 }}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#f34023" />}
            >
                {stale && (
                    <View className="flex-row items-center justify-center mb-3">
                        <AntDesign name="disconnect" size={12} color="#7a7a7a" />
                        <Text className="text-surface_a50 text-xs ml-2">Offline — showing last synced</Text>
                    </View>
                )}

                {tab === 'leaderboard' ? (
                    <>
                        {/* Metric chips */}
                        <View className="flex-row flex-wrap gap-2 mb-3">
                            {METRICS.map(([m, label]) => (
                                <TouchableOpacity
                                    key={m}
                                    onPress={() => setMetric(m)}
                                    className={`px-4 py-2 rounded-full ${metric === m ? 'bg-surface_a20' : 'bg-surface_a10'}`}
                                    activeOpacity={0.85}
                                >
                                    <Text className={`text-sm font-semibold ${metric === m ? 'text-white' : 'text-surface_a50'}`}>{label}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        {/* Period selector — hidden for most-improved, which is baseline-relative */}
                        {metric !== 'improved' && (
                            <View className="flex-row bg-surface_a10 rounded-xl p-1 mb-4">
                                {PERIODS.map(([p, label]) => (
                                    <TouchableOpacity
                                        key={p}
                                        onPress={() => setPeriod(p)}
                                        className={`flex-1 py-1.5 rounded-lg ${period === p ? 'bg-surface_a20' : ''}`}
                                        activeOpacity={0.85}
                                    >
                                        <Text className={`text-center text-sm font-semibold ${period === p ? 'text-white' : 'text-surface_a50'}`}>{label}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}

                        {boardLoading ? (
                            <View className="mt-12 items-center">
                                <ActivityIndicator size="large" color="#f34023" />
                            </View>
                        ) : board.length === 0 ? (
                            <Text className="text-surface_a50 text-center mt-12">
                                No one on this board yet. Finish a workout to get on it.
                            </Text>
                        ) : (
                            board.map((row, i) => (
                                <View key={row.user_id} className="bg-surface_a10 px-4 py-3 rounded-xl mb-2 flex-row items-center">
                                    <Text className="text-surface_a50 font-bold w-7">{i + 1}</Text>
                                    <Text className="text-white font-semibold flex-1" numberOfLines={1}>
                                        {row.username}
                                        {user?.id === row.user_id ? '  (you)' : ''}
                                    </Text>
                                    <Text className="text-primary_a0 font-bold">{formatScore(metric, row.score)}</Text>
                                </View>
                            ))
                        )}
                        <Text className="text-surface_a50 text-xs text-center mt-4">{metricNote(metric, period)}</Text>
                    </>
                ) : tab === 'calendar' ? (
                    <CommunityCalendarTab communityId={id!} onStale={setCalendarStale} />
                ) : (
                    feedLoading ? (
                        <View className="mt-12 items-center">
                            <ActivityIndicator size="large" color="#f34023" />
                        </View>
                    ) : feed.length === 0 ? (
                        <Text className="text-surface_a50 text-center mt-12">
                            No activity yet. Completed workouts show up here.
                        </Text>
                    ) : (
                        feed.map(e => {
                            const line = feedLine(e);
                            return (
                                <View key={e.id} className="bg-surface_a10 p-4 rounded-xl mb-2 flex-row items-center">
                                    <Text style={{ fontSize: 24 }}>{line.emoji}</Text>
                                    <View className="flex-1 ml-3">
                                        <Text className="text-white font-semibold">{line.title}</Text>
                                        {!!line.subtitle && <Text className="text-surface_a50 text-sm mt-0.5">{line.subtitle}</Text>}
                                        <Text className="text-surface_a50 text-xs mt-1">
                                            {formatDistanceToNow(new Date(e.created_at), { addSuffix: true })}
                                        </Text>
                                    </View>
                                    {e.type === 'session_planned' ? (
                                        e.actor_user_id === user?.id ? (
                                            <Text className="text-surface_a50 text-xs px-2">{e.rsvp_count} in</Text>
                                        ) : (
                                            <TouchableOpacity
                                                onPress={() => toggleFeedRsvp(e)}
                                                className={`px-3 py-1.5 rounded-full flex-row items-center ${e.i_rsvped ? 'bg-primary_a0' : 'bg-surface_a20'}`}
                                                activeOpacity={0.8}
                                            >
                                                <AntDesign name={e.i_rsvped ? 'check' : 'plus'} size={12} color={e.i_rsvped ? 'white' : '#9ca3af'} />
                                                <Text className={`text-xs font-bold ml-1 ${e.i_rsvped ? 'text-white' : 'text-surface_a50'}`}>
                                                    {e.i_rsvped ? "I'm in" : 'Join'}{e.rsvp_count > 0 ? `  ${e.rsvp_count}` : ''}
                                                </Text>
                                            </TouchableOpacity>
                                        )
                                    ) : (
                                        <TouchableOpacity onPress={() => toggleKudos(e)} className="items-center px-2" activeOpacity={0.7}>
                                            <AntDesign name="like" size={20} color={e.i_kudosed ? '#f34023' : '#7a7a7a'} />
                                            {e.kudos_count > 0 && <Text className="text-surface_a50 text-xs mt-1">{e.kudos_count}</Text>}
                                        </TouchableOpacity>
                                    )}
                                    {(e.actor_user_id !== user?.id || isAdmin) && (
                                        <TouchableOpacity onPress={() => onPostMenu(e)} className="items-center pl-2" activeOpacity={0.7}>
                                            <AntDesign name="ellipsis" size={20} color="#7a7a7a" />
                                        </TouchableOpacity>
                                    )}
                                </View>
                            );
                        })
                    )
                )}
            </ScrollView>

            <ReportModal
                visible={!!reportEvent}
                subject="This post will be sent to the community admins."
                onCancel={() => setReportEvent(null)}
                onSubmit={submitReport}
            />
        </SafeAreaView>
    );
}
