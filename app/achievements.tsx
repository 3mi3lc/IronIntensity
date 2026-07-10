import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
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
import { LoadingScreen } from '@/components/loadingScreen';

const CATEGORY_ORDER: { key: AchievementCategory; label: string }[] = [
    { key: 'milestone', label: 'Getting Started' },
    { key: 'workouts', label: 'Workouts' },
    { key: 'streak', label: 'Streaks' },
    { key: 'strength', label: 'Strength' },
    { key: 'volume', label: 'Volume' },
    { key: 'reps', label: 'Reps' },
    { key: 'pr', label: 'Personal Records' },
    { key: 'variety', label: 'Exercise Variety' },
    { key: 'muscles', label: 'Muscle Coverage' },
    { key: 'bodyweight', label: 'Bodyweight' },
];

const SectionTitle = ({ children }: { children: string }) => (
    <Text className="text-surface_a50 text-xs font-bold uppercase tracking-wider mb-2 mt-2">{children}</Text>
);

export default function AchievementsScreen() {
    const { user } = useAuth();
    const { currentStreak, longestStreak } = useStreak(user?.id);
    const [achievements, setAchievements] = useState<Achievement[]>([]);
    const [loading, setLoading] = useState(true);
    const [browseOpen, setBrowseOpen] = useState(false);
    const [expanded, setExpanded] = useState<Set<AchievementCategory>>(new Set());

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

    const toggle = (cat: AchievementCategory) =>
        setExpanded(prev => {
            const next = new Set(prev);
            if (next.has(cat)) next.delete(cat); else next.add(cat);
            return next;
        });

    const unlockedCount = achievements.filter(a => a.unlocked).length;
    const total = achievements.length;
    const overallPercent = total > 0 ? Math.round((unlockedCount / total) * 100) : 0;

    const closest = achievements
        .filter(a => !a.unlocked && a.threshold > 0 && a.progressPercent > 0)
        .sort((a, b) => b.progressPercent - a.progressPercent)
        .slice(0, 5);

    const recent = achievements
        .filter(a => a.unlockedAt)
        .sort((a, b) => (a.unlockedAt! < b.unlockedAt! ? 1 : -1))
        .slice(0, 10);

    const sections = CATEGORY_ORDER
        .map(c => ({ ...c, rows: achievements.filter(a => a.category === c.key) }))
        .filter(s => s.rows.length > 0);

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
                <LoadingScreen safeArea={false} />
            ) : (
                <ScrollView
                    className="flex-1 px-4"
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingBottom: 40 }}
                >
                    {/* Overall progress */}
                    <View className="bg-surface_a10 p-5 rounded-2xl mb-4">
                        <View className="flex-row items-center justify-between mb-3">
                            <Text className="text-white font-bold text-lg">Your Progress</Text>
                            <Text className="text-surface_a50 text-sm">{unlockedCount}/{total} unlocked</Text>
                        </View>
                        <View className="h-3 bg-surface_a20 rounded-full overflow-hidden">
                            <View className="h-full bg-primary_a0 rounded-full" style={{ width: `${overallPercent}%` }} />
                        </View>
                    </View>

                    {/* Closest to unlocking */}
                    {closest.length > 0 && (
                        <View className="mb-4">
                            <SectionTitle>Closest to Unlocking</SectionTitle>
                            <View className="bg-surface_a10 rounded-2xl overflow-hidden">
                                {closest.map((a, i) => (
                                    <AchievementRow key={a.id} achievement={a} showBorder={i < closest.length - 1} />
                                ))}
                            </View>
                        </View>
                    )}

                    {/* Recently unlocked */}
                    {recent.length > 0 && (
                        <View className="mb-4">
                            <SectionTitle>Recently Unlocked</SectionTitle>
                            <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={{ gap: 8 }}
                            >
                                {recent.map(a => (
                                    <View
                                        key={a.id}
                                        className="bg-surface_a10 rounded-2xl p-3 items-center justify-center"
                                        style={{ width: 92, height: 92 }}
                                    >
                                        <Text style={{ fontSize: 30 }}>{a.icon}</Text>
                                        <Text numberOfLines={2} className="text-white text-[10px] mt-1 text-center leading-3">
                                            {a.title}
                                        </Text>
                                    </View>
                                ))}
                            </ScrollView>
                        </View>
                    )}

                    {/* Browse all (opt-in) */}
                    <TouchableOpacity
                        onPress={() => setBrowseOpen(o => !o)}
                        activeOpacity={0.7}
                        className="bg-surface_a10 rounded-2xl p-4 flex-row items-center justify-between mt-2"
                    >
                        <Text className="text-white font-bold text-base">Browse all categories</Text>
                        <AntDesign name={browseOpen ? 'up' : 'down'} size={16} color="#7a7a7a" />
                    </TouchableOpacity>

                    {browseOpen && sections.map(section => {
                        const open = expanded.has(section.key);
                        const unlocked = section.rows.filter(r => r.unlocked).length;
                        const percent = Math.round((unlocked / section.rows.length) * 100);

                        return (
                            <View key={section.key} className="mt-3">
                                <TouchableOpacity
                                    onPress={() => toggle(section.key)}
                                    activeOpacity={0.7}
                                    className="bg-surface_a10 rounded-2xl p-4"
                                >
                                    <View className="flex-row items-center justify-between">
                                        <Text className="text-white font-bold text-base">{section.label}</Text>
                                        <View className="flex-row items-center">
                                            <Text className="text-surface_a50 text-sm mr-2">
                                                {unlocked}/{section.rows.length}
                                            </Text>
                                            <AntDesign name={open ? 'up' : 'down'} size={14} color="#7a7a7a" />
                                        </View>
                                    </View>
                                    <View className="h-1.5 bg-surface_a20 rounded-full overflow-hidden mt-2">
                                        <View className="h-full bg-primary_a0 rounded-full" style={{ width: `${percent}%` }} />
                                    </View>
                                </TouchableOpacity>

                                {open && (
                                    <View className="bg-surface_a10 rounded-2xl overflow-hidden mt-2">
                                        {section.rows.map((achievement, index) => (
                                            <AchievementRow
                                                key={achievement.id}
                                                achievement={achievement}
                                                showBorder={index < section.rows.length - 1}
                                            />
                                        ))}
                                    </View>
                                )}
                            </View>
                        );
                    })}
                </ScrollView>
            )}
        </SafeAreaView>
    );
}
