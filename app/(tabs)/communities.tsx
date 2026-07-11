import { View, Text, TouchableOpacity, ScrollView, RefreshControl, ActivityIndicator } from 'react-native';
import { useState, useCallback } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AntDesign } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useAuth } from '@/hooks/useAuth';
import { getMyCommunities, Community } from '@/repositories/communities';

export default function CommunitiesScreen() {
    const { isOffline } = useAuth();
    const tabBarHeight = useBottomTabBarHeight();
    const [communities, setCommunities] = useState<Community[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [stale, setStale] = useState(false);

    const load = useCallback(async () => {
        const { data, stale } = await getMyCommunities();
        setCommunities(data);
        setStale(stale);
    }, []);

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

    return (
        <SafeAreaView className="flex-1 bg-surface_a0" edges={['top', 'left', 'right']}>
            {/* Header */}
            <View className="pt-4 pb-6 flex-row justify-between items-center px-6">
                <View>
                    <Text className="text-primary_a0 font-bold text-3xl">Social</Text>
                    <Text className="text-surface_a50 text-sm mt-1">Your communities</Text>
                </View>
                <TouchableOpacity
                    onPress={() => router.push('/communities/discover')}
                    className="bg-primary_a0 p-3 rounded-full"
                    activeOpacity={0.8}
                >
                    <AntDesign name="search" size={24} color="white" />
                </TouchableOpacity>
            </View>

            <ScrollView
                className="flex-1 px-4"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: tabBarHeight + 40 }}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#f34023" />}
            >
                {/* Create / Join actions */}
                <View className="flex-row gap-3 mb-6">
                    <TouchableOpacity
                        onPress={() => router.push('/communities/create')}
                        className="flex-1 bg-primary_a0 py-4 rounded-xl flex-row items-center justify-center"
                        activeOpacity={0.85}
                    >
                        <AntDesign name="plus" size={18} color="white" />
                        <Text className="text-white font-bold text-base ml-2">Create</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={() => router.push('/communities/join')}
                        className="flex-1 bg-surface_a10 py-4 rounded-xl flex-row items-center justify-center"
                        activeOpacity={0.85}
                    >
                        <AntDesign name="team" size={18} color="#eb0202" />
                        <Text className="text-white font-bold text-base ml-2">Join</Text>
                    </TouchableOpacity>
                </View>

                {stale && (
                    <View className="flex-row items-center justify-center mb-4">
                        <AntDesign name="disconnect" size={12} color="#7a7a7a" />
                        <Text className="text-surface_a50 text-xs ml-2">
                            {isOffline ? 'Offline — showing last synced' : 'Showing last synced'}
                        </Text>
                    </View>
                )}

                {loading && communities.length === 0 ? (
                    <View className="mt-16 items-center">
                        <ActivityIndicator size="large" color="#f34023" />
                    </View>
                ) : stale && communities.length === 0 ? (
                    <View className="items-center mt-16 px-6">
                        <AntDesign name="disconnect" size={40} color="#7a7a7a" />
                        <Text className="text-surface_a50 text-center mt-4">
                            You are offline and have no saved communities yet.
                        </Text>
                    </View>
                ) : communities.length === 0 ? (
                    <View className="items-center mt-16 px-6">
                        <Text style={{ fontSize: 40 }}>👥</Text>
                        <Text className="text-white font-bold text-lg mt-4">No communities yet</Text>
                        <Text className="text-surface_a50 text-center mt-2">
                            Create one for your gym crew, or join a friend&apos;s with their invite code.
                        </Text>
                    </View>
                ) : (
                    communities.map(c => (
                        <TouchableOpacity
                            key={c.id}
                            onPress={() => router.push({ pathname: '/communities/[id]', params: { id: c.id, name: c.name, code: c.invite_code, role: c.role } })}
                            className="bg-surface_a10 p-5 rounded-2xl mb-3 flex-row items-center"
                            activeOpacity={0.85}
                        >
                            <View className="flex-1">
                                <View className="flex-row items-center">
                                    <Text className="text-white text-lg font-bold">{c.name}</Text>
                                    {c.is_public && <AntDesign name="global" size={13} color="#7a7a7a" style={{ marginLeft: 8 }} />}
                                </View>
                                <Text className="text-surface_a50 text-sm mt-1">
                                    {c.member_count} {c.member_count === 1 ? 'member' : 'members'}
                                    {c.role === 'admin' ? '  ·  Admin' : ''}
                                </Text>
                            </View>
                            <AntDesign name="right" size={16} color="#7a7a7a" />
                        </TouchableOpacity>
                    ))
                )}
            </ScrollView>
        </SafeAreaView>
    );
}
