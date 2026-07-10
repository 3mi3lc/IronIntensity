import { View, Text, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useState, useCallback } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AntDesign } from '@expo/vector-icons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { LoadingScreen } from '@/components/loadingScreen';
import { getCommunityMembers, leaveCommunity, CommunityMember } from '@/repositories/communities';
import { getReliability } from '@/repositories/communityCalendar';
import { logger } from '@/utils/logger';

export default function CommunityMembersScreen() {
    const { id, name } = useLocalSearchParams<{ id: string; name?: string }>();
    const { user } = useAuth();
    const [members, setMembers] = useState<CommunityMember[]>([]);
    const [reliability, setReliability] = useState<Map<string, { kept: number; total: number }>>(new Map());
    const [loading, setLoading] = useState(true);
    const [stale, setStale] = useState(false);

    const load = useCallback(async () => {
        if (!id) return;
        const [mem, rel] = await Promise.all([getCommunityMembers(id), getReliability(id)]);
        setMembers(mem.data);
        setReliability(new Map(rel.data.map(r => [r.user_id, { kept: r.kept, total: r.total }])));
        setStale(mem.stale || rel.stale);
    }, [id]);

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

    const handleLeave = useCallback(() => {
        if (!id || !user?.id) return;
        Alert.alert(
            'Leave community',
            `Leave "${name ?? 'this community'}"? You can rejoin later with the invite code.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Leave',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await leaveCommunity(id, user.id);
                            // Back to the communities list (past the community home).
                            router.dismissAll?.();
                            router.replace('/communities');
                        } catch (e) {
                            logger.error('Failed to leave community:', e);
                            Alert.alert('Could not leave', 'Please check your connection and try again.');
                        }
                    },
                },
            ]
        );
    }, [id, user?.id, name]);

    if (loading) return <LoadingScreen message="Loading members..." />;

    return (
        <SafeAreaView className="flex-1 bg-surface_a0" edges={['top', 'left', 'right']}>
            <View className="px-4 pt-4 pb-4 flex-row items-center">
                <TouchableOpacity
                    onPress={() => router.back()}
                    className="p-2 bg-surface_a10 rounded-xl"
                    activeOpacity={0.7}
                >
                    <AntDesign name="arrow-left" size={24} color="#eb0202" />
                </TouchableOpacity>
                <View className="flex-1 mx-4">
                    <Text className="text-primary_a0 font-bold text-2xl text-center">Members</Text>
                </View>
                <View style={{ width: 44 }} />
            </View>

            <ScrollView
                className="flex-1 px-4"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 40 }}
            >
                {stale && (
                    <View className="flex-row items-center justify-center mb-4">
                        <AntDesign name="disconnect" size={12} color="#7a7a7a" />
                        <Text className="text-surface_a50 text-xs ml-2">Offline — showing last synced</Text>
                    </View>
                )}

                {stale && members.length === 0 ? (
                    <Text className="text-surface_a50 text-center mt-12">
                        You are offline and have no saved member list yet.
                    </Text>
                ) : (
                    members.map(m => {
                        const rel = reliability.get(m.user_id);
                        return (
                            <View key={m.user_id} className="bg-surface_a10 px-4 py-4 rounded-xl mb-2 flex-row items-center">
                                <View className="w-9 h-9 rounded-full bg-surface_a20 items-center justify-center mr-3">
                                    <Text className="text-white font-bold">{m.username?.charAt(0).toUpperCase() ?? '?'}</Text>
                                </View>
                                <View className="flex-1">
                                    <Text className="text-white font-semibold" numberOfLines={1}>
                                        {m.username}
                                        {user?.id === m.user_id ? '  (you)' : ''}
                                    </Text>
                                    {rel && rel.total > 0 && (
                                        <Text className="text-surface_a50 text-xs mt-0.5">
                                            Kept {rel.kept}/{rel.total} planned sessions
                                        </Text>
                                    )}
                                </View>
                                {m.role === 'admin' && (
                                    <View className="bg-surface_a20 px-2 py-1 rounded-md">
                                        <Text className="text-surface_a50 text-xs font-bold">ADMIN</Text>
                                    </View>
                                )}
                            </View>
                        );
                    })
                )}

                <TouchableOpacity
                    onPress={handleLeave}
                    className="mt-6 py-4 rounded-xl flex-row items-center justify-center border border-primary_a0"
                    activeOpacity={0.85}
                >
                    <AntDesign name="logout" size={18} color="#eb0202" />
                    <Text className="text-primary_a0 font-bold text-base ml-2">Leave community</Text>
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
}
