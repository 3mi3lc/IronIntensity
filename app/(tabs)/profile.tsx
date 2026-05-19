import { View, Text, TouchableOpacity, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { useState, useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AntDesign } from '@expo/vector-icons';
import { useSync, SyncResult } from "@/hooks/useSync";
import { useAuth } from "@/hooks/useAuth";
import { recalculateAllPRs } from '@/repositories/workoutExerciseSets';
import { getAllAchievementsWithStatus, Achievement } from '@/repositories/achievements';
import { useStreak } from '@/hooks/useStreak';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';

export default function Profile() {
    const { pushData, pullData } = useSync();
    const { user, signOut } = useAuth();
    const { currentStreak, longestStreak  } = useStreak(user?.id);
    const tabBarHeight = useBottomTabBarHeight();

    const [isSyncing, setIsSyncing] = useState(false);
    const [syncErrors, setSyncErrors] = useState<Array<{ entity: string; error: string }>>([]);
    const [achievements, setAchievements] = useState<Achievement[]>([]);

    useEffect(() => {
        if (user?.id) {
            getAllAchievementsWithStatus(user.id, currentStreak, longestStreak).then(setAchievements);
        }
    }, [user?.id, currentStreak, longestStreak]);

    const unlockedCount = achievements.filter(a => a.unlocked).length;

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

    // const handlePull = async () => {
    //     Alert.alert(
    //         "Restore Data",
    //         "This will overwrite local data with your cloud backup. Continue?",
    //         [
    //             { text: "Cancel", style: "cancel" },
    //             {
    //                 text: "Restore",
    //                 style: "destructive",
    //                 onPress: async () => {
    //                     setIsPulling(true);
    //                     try {
    //                         const result = await pullData();
    //                         showSyncResult(result, 'pull');
    //                     } finally {
    //                         setIsPulling(false);
    //                     }
    //                 }
    //             }
    //         ]
    //     );
    // };

    // const handleRecalculatePRs = () => {
    //     Alert.alert(
    //         'Recalculate PRs',
    //         'This will scan all your completed workouts in order and mark personal records.',
    //         [
    //             { text: 'Cancel', style: 'cancel' },
    //             {
    //                 text: 'Recalculate',
    //                 onPress: async () => {
    //                     if (!user?.id) return;
    //                     setIsRecalculating(true);
    //                     try {
    //                         await recalculateAllPRs(user.id);
    //                         Alert.alert('Done', 'PRs have been recalculated across all workouts.');
    //                     } catch {
    //                         Alert.alert('Error', 'Something went wrong. Please try again.');
    //                     } finally {
    //                         setIsRecalculating(false);
    //                     }
    //                 },
    //             },
    //         ]
    //     );
    // };

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

    const categoryLabel = (category: Achievement['category']) => {
        switch (category) {
            case 'volume': return 'Volume';
            case 'workouts': return 'Workouts';
            case 'streak': return 'Streak';
        }
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
                className="flex-1 px-6"
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

                {/* Achievements Section */}
                <View className="mb-6">
                    <View className="flex-row items-center justify-between mb-4">
                        <Text className="text-white text-xl font-bold">Achievements</Text>
                        <Text className="text-surface_a50 text-sm">
                            {unlockedCount}/{achievements.length} unlocked
                        </Text>
                    </View>

                    {(['volume', 'workouts', 'streak'] as Achievement['category'][]).map(category => (
                        <View key={category} className="mb-4">
                            <Text className="text-surface_a50 text-xs font-bold uppercase tracking-wider mb-2">
                                {categoryLabel(category)}
                            </Text>
                            <View className="bg-surface_a10 rounded-2xl overflow-hidden">
                                {achievements
                                    .filter(a => a.category === category)
                                    .map((achievement, index, arr) => (
                                        <View
                                            key={achievement.id}
                                            className={`flex-row items-center p-4 ${
                                                index < arr.length - 1 ? 'border-b border-surface_a20' : ''
                                            } ${achievement.unlocked ? '' : 'opacity-40'}`}
                                        >
                                            <Text style={{ fontSize: 28 }}>{achievement.icon}</Text>
                                            <View className="flex-1 ml-3">
                                                <Text className={`font-bold text-base ${achievement.unlocked ? 'text-white' : 'text-surface_a50'}`}>
                                                    {achievement.title}
                                                </Text>
                                                <Text className="text-surface_a50 text-xs mt-0.5">
                                                    {achievement.description}
                                                </Text>
                                            </View>
                                            {achievement.unlocked && (
                                                <AntDesign name="check-circle" size={20} color="#f34023" />
                                            )}
                                        </View>
                                    ))}
                            </View>
                        </View>
                    ))}
                </View>

                {/* Pull Button — commented out for now */}
                {/* <TouchableOpacity
                    onPress={handlePull}
                    disabled={isPulling}
                    className={`py-4 rounded-xl flex-row items-center justify-center mb-3 ${
                        isPulling ? 'bg-surface_a30' : 'bg-primary_a10'
                    }`}
                    activeOpacity={0.8}
                >
                    {isPulling ? (
                        <>
                            <ActivityIndicator size="small" color="white" />
                            <Text className="text-white font-bold text-lg ml-2">Restoring...</Text>
                        </>
                    ) : (
                        <>
                            <AntDesign name="download" size={20} color="white" />
                            <Text className="text-white font-bold text-lg ml-2">Pull (Restore Backup)</Text>
                        </>
                    )}
                </TouchableOpacity> */}

                {/* Recalculate PRs — commented out for now */}
                {/* <TouchableOpacity
                    onPress={handleRecalculatePRs}
                    disabled={isRecalculating}
                    className={`py-4 rounded-xl flex-row items-center justify-center mb-3 ${
                        isRecalculating ? 'bg-surface_a30' : 'bg-surface_a10'
                    }`}
                    activeOpacity={0.8}
                >
                    {isRecalculating ? (
                        <>
                            <ActivityIndicator size="small" color="white" />
                            <Text className="text-white font-bold text-lg ml-2">Recalculating...</Text>
                        </>
                    ) : (
                        <>
                            <AntDesign name="star" size={20} color="#f34023" />
                            <Text className="text-white font-bold text-lg ml-2">Recalculate PRs</Text>
                        </>
                    )}
                </TouchableOpacity> */}

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