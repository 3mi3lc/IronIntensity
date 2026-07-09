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
    { key: 'strength', label: 'Strength' },
    { key: 'volume', label: 'Volume' },
    { key: 'reps', label: 'Reps' },
    { key: 'pr', label: 'Personal Records' },
    { key: 'variety', label: 'Exercise Variety' },
    { key: 'muscles', label: 'Muscle Coverage' },
    { key: 'bodyweight', label: 'Bodyweight' },
];

type Filter = AchievementCategory | 'all';

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
    return (
        <TouchableOpacity
            onPress={onPress}
            activeOpacity={0.8}
            className={`px-4 py-2 rounded-full ${active ? 'bg-primary_a0' : 'bg-surface_a10'}`}
        >
            <Text className={`text-sm font-semibold ${active ? 'text-white' : 'text-surface_a50'}`}>{label}</Text>
        </TouchableOpacity>
    );
}

export default function AchievementsScreen() {
    const { user } = useAuth();
    const { currentStreak, longestStreak } = useStreak(user?.id);
    const [achievements, setAchievements] = useState<Achievement[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<Filter>('all');
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

    const sections = CATEGORY_ORDER
        .map(c => ({ ...c, rows: achievements.filter(a => a.category === c.key) }))
        .filter(s => s.rows.length > 0);
    const visibleSections = filter === 'all' ? sections : sections.filter(s => s.key === filter);

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
                    <View className="bg-surface_a10 p-5 rounded-2xl mb-4">
                        <View className="flex-row items-center justify-between mb-3">
                            <Text className="text-white font-bold text-lg">Your Progress</Text>
                            <Text className="text-surface_a50 text-sm">{unlockedCount}/{total} unlocked</Text>
                        </View>
                        <View className="h-3 bg-surface_a20 rounded-full overflow-hidden">
                            <View className="h-full bg-primary_a0 rounded-full" style={{ width: `${overallPercent}%` }} />
                        </View>
                    </View>

                    {/* Category filter chips */}
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        className="mb-4 -mx-1"
                        contentContainerStyle={{ gap: 8, paddingHorizontal: 4 }}
                    >
                        <Chip label="All" active={filter === 'all'} onPress={() => setFilter('all')} />
                        {sections.map(s => (
                            <Chip key={s.key} label={s.label} active={filter === s.key} onPress={() => setFilter(s.key)} />
                        ))}
                    </ScrollView>

                    {visibleSections.map(section => {
                        const open = filter !== 'all' || expanded.has(section.key);
                        const unlocked = section.rows.filter(r => r.unlocked).length;
                        const percent = Math.round((unlocked / section.rows.length) * 100);

                        return (
                            <View key={section.key} className="mb-3">
                                <TouchableOpacity
                                    onPress={() => filter === 'all' && toggle(section.key)}
                                    activeOpacity={filter === 'all' ? 0.7 : 1}
                                    className="bg-surface_a10 rounded-2xl p-4"
                                >
                                    <View className="flex-row items-center justify-between">
                                        <Text className="text-white font-bold text-base">{section.label}</Text>
                                        <View className="flex-row items-center">
                                            <Text className="text-surface_a50 text-sm mr-2">
                                                {unlocked}/{section.rows.length}
                                            </Text>
                                            {filter === 'all' && (
                                                <AntDesign name={open ? 'up' : 'down'} size={14} color="#7a7a7a" />
                                            )}
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
