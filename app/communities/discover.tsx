import { View, Text, TouchableOpacity, TextInput, ScrollView, Alert } from 'react-native';
import { useState, useCallback, useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AntDesign } from '@expo/vector-icons';
import { router } from 'expo-router';
import { searchPublicCommunities, joinPublicCommunity, PublicCommunity } from '@/repositories/communities';
import { logger } from '@/utils/logger';

export default function DiscoverScreen() {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<PublicCommunity[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [joining, setJoining] = useState<string | null>(null);

    const search = useCallback(async (q: string) => {
        try {
            setError(false);
            setResults(await searchPublicCommunities(q));
        } catch (e) {
            logger.error('Failed to search communities:', e);
            setError(true);
        } finally {
            setLoading(false);
        }
    }, []);

    // Load all public on mount, then debounce on query changes.
    useEffect(() => {
        setLoading(true);
        const t = setTimeout(() => search(query), 300);
        return () => clearTimeout(t);
    }, [query, search]);

    const join = useCallback(async (c: PublicCommunity) => {
        setJoining(c.id);
        try {
            const community = await joinPublicCommunity(c.id);
            router.replace({
                pathname: '/communities/[id]',
                params: { id: community.id, name: community.name, code: community.invite_code, role: 'member' },
            });
        } catch (e) {
            logger.error('Failed to join community:', e);
            Alert.alert('Could not join', 'Check your connection and try again.');
        } finally {
            setJoining(null);
        }
    }, []);

    return (
        <SafeAreaView className="flex-1 bg-surface_a0" edges={['top', 'left', 'right']}>
            <View className="px-4 pt-4 pb-4 flex-row items-center">
                <TouchableOpacity onPress={() => router.back()} className="p-2 bg-surface_a10 rounded-xl" activeOpacity={0.7}>
                    <AntDesign name="arrow-left" size={24} color="#eb0202" />
                </TouchableOpacity>
                <View className="flex-1 mx-4">
                    <Text className="text-primary_a0 font-bold text-2xl text-center">Discover</Text>
                </View>
                <View style={{ width: 44 }} />
            </View>

            <View className="px-4">
                <View className="flex-row items-center bg-surface_a10 rounded-xl px-4">
                    <AntDesign name="search" size={18} color="#7a7a7a" />
                    <TextInput
                        value={query}
                        onChangeText={setQuery}
                        placeholder="Search public communities"
                        placeholderTextColor="#7a7a7a"
                        className="flex-1 text-white text-base py-3 ml-2"
                        autoCorrect={false}
                    />
                </View>
            </View>

            <ScrollView className="flex-1 px-4 mt-4" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
                {error ? (
                    <Text className="text-surface_a50 text-center mt-12">Could not load. Check your connection.</Text>
                ) : loading ? (
                    <Text className="text-surface_a50 text-center mt-12">Searching...</Text>
                ) : results.length === 0 ? (
                    <View className="items-center mt-16 px-6">
                        <Text style={{ fontSize: 40 }}>🔍</Text>
                        <Text className="text-white font-bold text-lg mt-4">No public communities</Text>
                        <Text className="text-surface_a50 text-center mt-2">
                            {query ? 'Nothing matches that search.' : 'No communities are discoverable yet.'}
                        </Text>
                    </View>
                ) : (
                    results.map(c => (
                        <View key={c.id} className="bg-surface_a10 p-5 rounded-2xl mb-3 flex-row items-center">
                            <View className="flex-1">
                                <Text className="text-white text-lg font-bold">{c.name}</Text>
                                <Text className="text-surface_a50 text-sm mt-1">
                                    {c.member_count} {c.member_count === 1 ? 'member' : 'members'}
                                </Text>
                            </View>
                            {c.is_member ? (
                                <TouchableOpacity
                                    onPress={() => router.replace({ pathname: '/communities/[id]', params: { id: c.id, name: c.name, role: 'member' } })}
                                    className="px-4 py-2 rounded-full bg-surface_a20"
                                    activeOpacity={0.85}
                                >
                                    <Text className="text-surface_a50 text-sm font-bold">Open</Text>
                                </TouchableOpacity>
                            ) : (
                                <TouchableOpacity
                                    onPress={() => join(c)}
                                    disabled={joining === c.id}
                                    className="px-4 py-2 rounded-full bg-primary_a0"
                                    activeOpacity={0.85}
                                >
                                    <Text className="text-white text-sm font-bold">{joining === c.id ? 'Joining...' : 'Join'}</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    ))
                )}
            </ScrollView>
        </SafeAreaView>
    );
}
