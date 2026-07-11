import { View, Text, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useState, useCallback } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AntDesign } from '@expo/vector-icons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { formatDistanceToNow } from 'date-fns';
import { LoadingScreen } from '@/components/loadingScreen';
import { deleteFeedEvent } from '@/repositories/communities';
import { getReports, resolveReport, Report } from '@/repositories/communityModeration';
import { logger } from '@/utils/logger';

function reportSummary(r: Report): string {
    if (r.target_type === 'feed_event') {
        if (!r.event_type) return 'A post (since removed)';
        return `${r.event_actor ?? 'A member'}'s ${r.event_type.replace('_', ' ')} post`;
    }
    return 'A member';
}

export default function ReportsScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const [reports, setReports] = useState<Report[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    const load = useCallback(async () => {
        if (!id) return;
        try {
            setError(false);
            setReports(await getReports(id));
        } catch (e) {
            logger.error('Failed to load reports:', e);
            setError(true);
        } finally {
            setLoading(false);
        }
    }, [id]);

    useFocusEffect(useCallback(() => { load(); }, [load]));

    const resolve = useCallback(async (r: Report) => {
        setReports(prev => prev.filter(x => x.id !== r.id));
        try {
            await resolveReport(r.id);
        } catch (e) {
            logger.error('Failed to resolve report:', e);
            Alert.alert('Could not resolve', 'Check your connection and try again.');
            load();
        }
    }, [load]);

    const deleteAndResolve = useCallback((r: Report) => {
        Alert.alert('Delete post', 'Remove this post and resolve the report?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete',
                style: 'destructive',
                onPress: async () => {
                    setReports(prev => prev.filter(x => x.id !== r.id));
                    try {
                        await deleteFeedEvent(r.target_id);
                        await resolveReport(r.id);
                    } catch (e) {
                        logger.error('Failed to delete reported post:', e);
                        Alert.alert('Could not delete', 'Check your connection and try again.');
                        load();
                    }
                },
            },
        ]);
    }, [load]);

    if (loading) return <LoadingScreen message="Loading reports..." />;

    return (
        <SafeAreaView className="flex-1 bg-surface_a0" edges={['top', 'left', 'right']}>
            <View className="px-4 pt-4 pb-4 flex-row items-center">
                <TouchableOpacity onPress={() => router.back()} className="p-2 bg-surface_a10 rounded-xl" activeOpacity={0.7}>
                    <AntDesign name="arrow-left" size={24} color="#eb0202" />
                </TouchableOpacity>
                <View className="flex-1 mx-4">
                    <Text className="text-primary_a0 font-bold text-2xl text-center">Reports</Text>
                </View>
                <View style={{ width: 44 }} />
            </View>

            <ScrollView className="flex-1 px-4" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
                {error ? (
                    <Text className="text-surface_a50 text-center mt-12">Could not load reports.</Text>
                ) : reports.length === 0 ? (
                    <View className="items-center mt-16 px-6">
                        <AntDesign name="check-circle" size={40} color="#4ade80" />
                        <Text className="text-white font-bold text-lg mt-4">No open reports</Text>
                        <Text className="text-surface_a50 text-center mt-2">Nothing needs your attention right now.</Text>
                    </View>
                ) : (
                    reports.map(r => (
                        <View key={r.id} className="bg-surface_a10 p-4 rounded-xl mb-3">
                            <Text className="text-white font-semibold">{reportSummary(r)}</Text>
                            {!!r.reason && <Text className="text-surface_a50 text-sm mt-1">“{r.reason}”</Text>}
                            <Text className="text-surface_a50 text-xs mt-2">
                                Reported by {r.reporter_username} · {formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}
                            </Text>
                            <View className="flex-row gap-2 mt-3">
                                {r.target_type === 'feed_event' && r.event_type && (
                                    <TouchableOpacity
                                        onPress={() => deleteAndResolve(r)}
                                        className="px-3 py-2 rounded-lg bg-surface_a20 flex-row items-center"
                                        activeOpacity={0.8}
                                    >
                                        <AntDesign name="delete" size={13} color="#eb0202" />
                                        <Text className="text-primary_a0 text-xs font-bold ml-1">Delete post</Text>
                                    </TouchableOpacity>
                                )}
                                <TouchableOpacity
                                    onPress={() => resolve(r)}
                                    className="px-3 py-2 rounded-lg bg-surface_a20 flex-row items-center"
                                    activeOpacity={0.8}
                                >
                                    <AntDesign name="check" size={13} color="#9ca3af" />
                                    <Text className="text-surface_a50 text-xs font-bold ml-1">Dismiss</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    ))
                )}
            </ScrollView>
        </SafeAreaView>
    );
}
