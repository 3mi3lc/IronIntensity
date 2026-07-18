import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { useState, useCallback } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AntDesign } from '@expo/vector-icons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { getSessionAttendees, SessionAttendee } from '@/repositories/communityCalendar';
import { logger } from '@/utils/logger';

export default function SessionAttendeesScreen() {
    const { sid, title, when } = useLocalSearchParams<{ sid: string; title?: string; when?: string }>();
    const { user } = useAuth();
    const [attendees, setAttendees] = useState<SessionAttendee[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    const load = useCallback(async () => {
        if (!sid) return;
        try {
            setError(false);
            setAttendees(await getSessionAttendees(sid));
        } catch (e) {
            logger.error('Failed to load attendees:', e);
            setError(true);
        } finally {
            setLoading(false);
        }
    }, [sid]);

    useFocusEffect(useCallback(() => { load(); }, [load]));

    const goingCount = attendees.filter(a => !a.is_owner).length;

    return (
        <SafeAreaView className="flex-1 bg-surface_a0" edges={['top', 'left', 'right']}>
            <View className="px-4 pt-4 pb-4 flex-row items-center">
                <TouchableOpacity onPress={() => router.back()} className="p-2 bg-surface_a10 rounded-xl" activeOpacity={0.7}>
                    <AntDesign name="arrow-left" size={24} color="#eb0202" />
                </TouchableOpacity>
                <View className="flex-1 mx-4">
                    <Text className="text-primary_a0 font-bold text-2xl text-center" numberOfLines={1}>
                        {title || 'Session'}
                    </Text>
                    {!!when && <Text className="text-surface_a50 text-sm text-center mt-1">{when}</Text>}
                </View>
                <View style={{ width: 44 }} />
            </View>

            <ScrollView className="flex-1 px-4" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
                {loading ? (
                    <View className="mt-16 items-center">
                        <ActivityIndicator size="large" color="#f34023" />
                    </View>
                ) : error ? (
                    <Text className="text-surface_a50 text-center mt-12">Could not load. Pull to retry.</Text>
                ) : (
                    <>
                        <Text className="text-surface_a50 text-xs font-bold uppercase tracking-wider mb-2 mt-2">
                            {goingCount} {goingCount === 1 ? 'person' : 'people'} joining
                        </Text>
                        {attendees.map(a => (
                            <View key={a.user_id} className="bg-surface_a10 px-4 py-4 rounded-xl mb-2 flex-row items-center">
                                <View className="w-9 h-9 rounded-full bg-surface_a20 items-center justify-center mr-3">
                                    <Text className="text-white font-bold">{a.username?.charAt(0).toUpperCase() ?? '?'}</Text>
                                </View>
                                <Text className="text-white font-semibold flex-1" numberOfLines={1}>
                                    {a.username}
                                    {user?.id === a.user_id ? '  (you)' : ''}
                                </Text>
                                {a.is_owner && (
                                    <View className="bg-surface_a20 px-2 py-1 rounded-md">
                                        <Text className="text-surface_a50 text-xs font-bold">HOST</Text>
                                    </View>
                                )}
                            </View>
                        ))}
                    </>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}
