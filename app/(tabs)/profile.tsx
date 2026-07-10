import { View, Text, TouchableOpacity, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { useState, useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AntDesign } from '@expo/vector-icons';
import { useSync, SyncResult } from "@/hooks/useSync";
import { useAuth } from "@/hooks/useAuth";
import { getAllAchievementsWithStatus, Achievement } from '@/repositories/achievements';
import { useStreak } from '@/hooks/useStreak';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { router } from 'expo-router';

export default function Profile() {
    const { pushData } = useSync();
    const { user, signOut } = useAuth();
    const { currentStreak, longestStreak  } = useStreak(user?.id);
    const tabBarHeight = useBottomTabBarHeight();

    const [isSyncing, setIsSyncing] = useState(false);
    const [syncErrors, setSyncErrors] = useState<{ entity: string; error: string }[]>([]);
    const [achievements, setAchievements] = useState<Achievement[]>([]);

    useEffect(() => {
        if (user?.id) {
            getAllAchievementsWithStatus(user.id, currentStreak, longestStreak).then(setAchievements);
        }
    }, [user?.id, currentStreak, longestStreak]);

    const unlockedCount = achievements.filter(a => a.unlocked).length;
    const overallPercent = achievements.length ? Math.round((unlockedCount / achievements.length) * 100) : 0;
    const nextUp = achievements
        .filter(a => !a.unlocked)
        .sort((a, b) => b.progressPercent - a.progressPercent)[0] ?? null;

    const showSyncResult = (result: SyncResult, action: 'sync' | 'pull') => {
        if (result.success) {
            setSyncErrors([]);
            Alert.alert('Success', action === 'sync' ? 'Data synced successfully!' : 'Cloud data restored successfully.');
        } else {
            setSyncErrors(result.failures);
            const errorList = result.failures.map(f => `• ${f.entity}: ${f.error}`).join('\n');
            Alert.alert('Sync Failed', `The following failed:\n\n${errorList}\n\nTap sync again to retry.`);
        }
    };

    const handleSync = async () => {
        setSyncErrors([]);
        setIsSyncing(true);
        try {
            const result = await pushData();
            showSyncResult(result, 'sync');
        } finally {
            setIsSyncing(false);
        }
    };

    const handleLogout = () => {
        Alert.alert(
            'Logout',
            'Are you sure you want to logout?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Logout',
                    style: 'destructive',
                    onPress: async () => {
                        if (signOut) await signOut();
                    }
                },
            ]
        );
    };

    return (
        <SafeAreaView className="flex-1 bg-surface_a0" edges={['top', 'left', 'right']}>
            {/* Header */}
            <View className="pt-4 pb-6 flex-row justify-between items-center px-6">
                <View>
                    <Text className="text-primary_a0 font-bold text-3xl">Profile</Text>
                    <Text className="text-surface_a50 text-sm mt-1">Your account & achievements</Text>
                </View>
                <TouchableOpacity
                    onPress={handleSync}
                    disabled={isSyncing}
                    className="bg-primary_a0 p-3 rounded-full"
                    activeOpacity={0.8}
                >
                    {isSyncing
                        ? <ActivityIndicator size="small" color="white" />
                        : <AntDesign name="upload" size={24} color="white" />
                    }
                </TouchableOpacity>
            </View>

            <ScrollView
                className="flex-1 px-4"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: tabBarHeight + 40 }}
            >
                {/* User Info */}
                <View className="bg-surface_a10 p-6 rounded-2xl mb-6">
                    <View className="flex-row items-center gap-4">
                        <View className="w-14 h-14 rounded-full bg-primary_a0 items-center justify-center">
                            <AntDesign name="user" size={28} color="white" />
                        </View>
                        <View>
                            <Text className="text-white font-bold text-lg">{user?.username || 'Not logged in'}</Text>
                            <Text className="text-surface_a50 text-sm">{user?.email || ''}</Text>
                        </View>
                    </View>
                </View>

                {/* Sync errors banner */}
                {syncErrors.length > 0 && (
                    <View className="bg-primary_a0/20 border border-primary_a0 rounded-xl p-4 mb-4">
                        <Text className="text-primary_a0 font-bold mb-2">Last sync had errors:</Text>
                        {syncErrors.map((e, i) => (
                            <Text key={i} className="text-primary_a30 text-sm">• {e.entity}: {e.error}</Text>
                        ))}
                    </View>
                )}

                {/* Achievements summary → full screen */}
                <TouchableOpacity
                    onPress={() => router.push('/achievements')}
                    className="bg-surface_a10 p-5 rounded-2xl mb-6"
                    activeOpacity={0.85}
                >
                    <View className="flex-row items-center justify-between mb-3">
                        <Text className="text-white text-xl font-bold">Achievements</Text>
                        <View className="flex-row items-center">
                            <Text className="text-surface_a50 text-sm mr-1">{unlockedCount}/{achievements.length}</Text>
                            <AntDesign name="right" size={14} color="#7a7a7a" />
                        </View>
                    </View>

                    <View className="h-2 bg-surface_a20 rounded-full overflow-hidden mb-4">
                        <View
                            className="h-full bg-primary_a0 rounded-full"
                            style={{ width: `${overallPercent}%` }}
                        />
                    </View>

                    {nextUp ? (
                        <View className="flex-row items-center">
                            <Text style={{ fontSize: 24, opacity: 0.5 }}>{nextUp.icon}</Text>
                            <View className="flex-1 ml-3">
                                <Text className="text-surface_a50 text-xs">Next up</Text>
                                <Text className="text-white text-sm font-semibold">{nextUp.title}</Text>
                            </View>
                            <Text className="text-surface_a50 text-xs">{Math.round(nextUp.progressPercent * 100)}%</Text>
                        </View>
                    ) : (
                        <Text className="text-surface_a50 text-sm">Every badge unlocked. Legend. 👑</Text>
                    )}
                </TouchableOpacity>

                {/* Dev-only: preview the finish-reward celebrations */}
                {__DEV__ && (
                    <TouchableOpacity
                        onPress={() => router.push('/dev/rewardPreview')}
                        className="bg-surface_a10 py-4 rounded-xl flex-row items-center justify-center mb-3"
                        activeOpacity={0.8}
                    >
                        <AntDesign name="gift" size={20} color="#ffd166" />
                        <Text className="text-white font-bold text-lg ml-2">Reward Preview (dev)</Text>
                    </TouchableOpacity>
                )}

                {/* Logout Button */}
                <TouchableOpacity
                    onPress={handleLogout}
                    className="bg-surface_a10 py-4 rounded-xl flex-row items-center justify-center"
                    activeOpacity={0.8}
                >
                    <AntDesign name="logout" size={20} color="#eb0202" />
                    <Text className="text-primary_a0 font-bold text-lg ml-2">Logout</Text>
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
}