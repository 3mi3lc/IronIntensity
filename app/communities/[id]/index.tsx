import { View, Text, TouchableOpacity, ScrollView, RefreshControl, Alert, Share } from 'react-native';
import { useState, useCallback } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AntDesign } from '@expo/vector-icons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '@/hooks/useAuth';
import { LoadingScreen } from '@/components/loadingScreen';
import {
    getCommunityFeed,
    getLeaderboard,
    addKudos,
    removeKudos,
    FeedEvent,
    LeaderboardRow,
    LeaderboardMetric,
} from '@/repositories/communities';
import { logger } from '@/utils/logger';

type Tab = 'leaderboard' | 'feed';

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
        case 'workout_completed':
        default: {
            const sets = e.payload.set_count;
            const top = e.payload.top_lift_label;
            const bits = [sets != null ? `${sets} sets` : null, top].filter(Boolean).join('  ·  ');
            return { emoji: '💪', title: `${who} finished ${e.payload.workout_name ?? 'a workout'}`, subtitle: bits || undefined };
        }
    }
}

export default function CommunityHomeScreen() {
    const { id, name, code } = useLocalSearchParams<{ id: string; name?: string; code?: string }>();
    const { user } = useAuth();
    const [tab, setTab] = useState<Tab>('leaderboard');
    const [metric, setMetric] = useState<LeaderboardMetric>('consistency');
    const [board, setBoard] = useState<LeaderboardRow[]>([]);
    const [feed, setFeed] = useState<FeedEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState(false);

    const load = useCallback(async () => {
        if (!id) return;
        try {
            setError(false);
            const [b, f] = await Promise.all([getLeaderboard(id, metric), getCommunityFeed(id)]);
            setBoard(b);
            setFeed(f);
        } catch (e) {
            logger.error('Failed to load community:', e);
            setError(true);
        }
    }, [id, metric]);

    useFocusEffect(
        useCallback(() => {
            let active = true;
            (async () => {
                setLoading(true);
                await load();
                if (active) setLoading(false);
            })();
            return () => { active = false; };
        }, [load])
    );

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await load();
        setRefreshing(false);
    }, [load]);

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
        try {
            if (nextMine) await addKudos(event.id, user.id);
            else await removeKudos(event.id, user.id);
        } catch (e) {
            logger.error('Failed to toggle kudos:', e);
            // Revert
            setFeed(prev => prev.map(x => x.id === event.id
                ? { ...x, i_kudosed: event.i_kudosed, kudos_count: event.kudos_count }
                : x));
        }
    }, [user?.id]);

    if (loading) return <LoadingScreen message={null} />;

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
                {(['leaderboard', 'feed'] as Tab[]).map(t => (
                    <TouchableOpacity
                        key={t}
                        onPress={() => setTab(t)}
                        className={`flex-1 py-2 rounded-lg ${tab === t ? 'bg-primary_a0' : ''}`}
                        activeOpacity={0.85}
                    >
                        <Text className={`text-center font-bold ${tab === t ? 'text-white' : 'text-surface_a50'}`}>
                            {t === 'leaderboard' ? 'Leaderboard' : 'Feed'}
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
                {error ? (
                    <View className="items-center mt-16 px-6">
                        <AntDesign name="disconnect" size={40} color="#7a7a7a" />
                        <Text className="text-surface_a50 text-center mt-4">Could not load. Pull to retry.</Text>
                    </View>
                ) : tab === 'leaderboard' ? (
                    <>
                        {/* Metric toggle */}
                        <View className="flex-row gap-2 mb-4">
                            {([['consistency', 'Consistency'], ['improved', 'Most improved']] as [LeaderboardMetric, string][]).map(([m, label]) => (
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

                        {board.length === 0 ? (
                            <Text className="text-surface_a50 text-center mt-12">
                                No activity this week yet. Finish a workout to get on the board.
                            </Text>
                        ) : (
                            board.map((row, i) => (
                                <View key={row.user_id} className="bg-surface_a10 px-4 py-3 rounded-xl mb-2 flex-row items-center">
                                    <Text className="text-surface_a50 font-bold w-7">{i + 1}</Text>
                                    <Text className="text-white font-semibold flex-1" numberOfLines={1}>
                                        {row.username}
                                        {user?.id === row.user_id ? '  (you)' : ''}
                                    </Text>
                                    <Text className="text-primary_a0 font-bold">
                                        {metric === 'consistency'
                                            ? `${row.score ?? 0}`
                                            : row.score == null ? '—' : `${row.score > 0 ? '+' : ''}${row.score}%`}
                                    </Text>
                                </View>
                            ))
                        )}
                        <Text className="text-surface_a50 text-xs text-center mt-4">
                            {metric === 'consistency'
                                ? 'Workouts completed since Monday.'
                                : 'Volume change vs your own last 4 weeks.'}
                        </Text>
                    </>
                ) : (
                    feed.length === 0 ? (
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
                                    <TouchableOpacity onPress={() => toggleKudos(e)} className="items-center px-2" activeOpacity={0.7}>
                                        <AntDesign name="like" size={20} color={e.i_kudosed ? '#f34023' : '#7a7a7a'} />
                                        {e.kudos_count > 0 && <Text className="text-surface_a50 text-xs mt-1">{e.kudos_count}</Text>}
                                    </TouchableOpacity>
                                </View>
                            );
                        })
                    )
                )}
            </ScrollView>
        </SafeAreaView>
    );
}
