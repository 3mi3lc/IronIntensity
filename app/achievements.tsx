import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { useState, useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AntDesign } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { useStreak } from '@/hooks/useStreak';
import {
    getAllAchievementsWithStatus,
    syncUnlockedAchievements,
    Achievement,
    AchievementCategory,
} from '@/repositories/achievements';
import { AchievementRow } from '@/components/achievementRow';

const CATEGORY_ORDER: { key: AchievementCategory; label: string }[] = [
    { key: 'milestone', label: 'Getting Started' },
    { key: 'workouts', label: 'Workouts' },
    { key: 'streak', label: 'Streaks' },
    { key: 'volume', label: 'Volume' },
    { key: 'pr', label: 'Personal Records' },
    { key: 'bodyweight', label: 'Bodyweight' },
];

export default function AchievementsScreen() {
    const { user } = useAuth();
    const { currentStreak, longestStreak } = useStreak(user?.id);
    const [achievements, setAchievements] = useState<Achievement[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user?.id) return;
        let active = true;
        (async () => {
            setLoading(true);
            try {
                // Persist any newly-earned badges (silently — no toasts here), then load.
                await syncUnlockedAchievements(user.id, currentStreak, longestStreak);
                const list = await getAllAchievementsWithStatus(user.id, currentStreak, longestStreak);
                if (active) setAchievements(list);
            } finally {
                if (active) setLoading(false);
            }
        })();
        return () => { active = false; };
    }, [user?.id, currentStreak, longestStreak]);

    const unlockedCount = achievements.filter(a => a.unlocked).length;
    const total = achievements.length;
    const overallPercent = total > 0 ? Math.round((unlockedCount / total) * 100) : 0;

    return (
        <SafeAreaView className="flex-1 bg-surface_a0" edges={['top', 'left', 'right']}>
            {/* Header */}
            <View className="px-4 pt-4 pb-4 flex-row items-center">
                <TouchableOpacity
                    onPress={() => router.back()}
                    className="p-2 bg-surface_a10 rounded-xl"
                    activeOpacity={0.7}
                >
                    <AntDesign name="arrow-left" size={24} color="#eb0202" />
                </TouchableOpacity>
                <View className="flex-1 mx-4">
                    <Text className="text-primary_a0 font-bold text-2xl text-center">Achievements</Text>
                </View>
                <View style={{ width: 44 }} />
            </View>

            {loading ? (
                <View className="flex-1 justify-center items-center">
                    <ActivityIndicator size="large" color="#f34023" />
                </View>
            ) : (
                <ScrollView
                    className="flex-1 px-6"
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingBottom: 40 }}
                >
                    {/* Overall progress */}
                    <View className="bg-surface_a10 p-5 rounded-2xl mb-6">
                        <View className="flex-row items-center justify-between mb-3">
                            <Text className="text-white font-bold text-lg">Your Progress</Text>
                            <Text className="text-surface_a50 text-sm">{unlockedCount}/{total} unlocked</Text>
                        </View>
                        <View className="h-3 bg-surface_a20 rounded-full overflow-hidden">
                            <View
                                className="h-full bg-primary_a0 rounded-full"
                                style={{ width: `${overallPercent}%` }}
                            />
                        </View>
                    </View>

                    {CATEGORY_ORDER.map(({ key, label }) => {
                        const rows = achievements.filter(a => a.category === key);
                        if (rows.length === 0) return null;
                        return (
                            <View key={key} className="mb-6">
                                <Text className="text-surface_a50 text-xs font-bold uppercase tracking-wider mb-2">
                                    {label}
                                </Text>
                                <View className="bg-surface_a10 rounded-2xl overflow-hidden">
                                    {rows.map((achievement, index) => (
                                        <AchievementRow
                                            key={achievement.id}
                                            achievement={achievement}
                                            showBorder={index < rows.length - 1}
                                        />
                                    ))}
                                </View>
                            </View>
                        );
                    })}
                </ScrollView>
            )}
        </SafeAreaView>
    );
}
