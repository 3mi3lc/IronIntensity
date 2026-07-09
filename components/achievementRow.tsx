import { View, Text } from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import { Achievement, AchievementCategory } from '@/repositories/achievements';

const UNIT: Record<AchievementCategory, string> = {
    volume: 'kg',
    workouts: 'workouts',
    streak: 'wks',
    pr: 'PRs',
    bodyweight: 'logs',
    milestone: '',
};

function progressLabel(a: Achievement): string {
    const current = a.progress.toLocaleString();
    const target = a.threshold.toLocaleString();
    return `${current} / ${target} ${UNIT[a.category]}`.trim();
}

interface AchievementRowProps {
    achievement: Achievement;
    /** Draw a divider below the row (for stacked rows in a card). */
    showBorder?: boolean;
}

export function AchievementRow({ achievement, showBorder = false }: AchievementRowProps) {
    const { unlocked, progressPercent, icon, title, description, threshold } = achievement;
    const showBar = !unlocked && threshold > 0;

    return (
        <View className={`flex-row items-center p-4 ${showBorder ? 'border-b border-surface_a20' : ''}`}>
            <Text style={{ fontSize: 28, opacity: unlocked ? 1 : 0.4 }}>{icon}</Text>

            <View className="flex-1 ml-3">
                <Text className={`font-bold text-base ${unlocked ? 'text-white' : 'text-surface_a50'}`}>
                    {title}
                </Text>
                <Text className="text-surface_a50 text-xs mt-0.5">{description}</Text>

                {showBar && (
                    <View className="mt-2">
                        <View className="h-2 bg-surface_a20 rounded-full overflow-hidden">
                            <View
                                className="h-full bg-primary_a0 rounded-full"
                                style={{ width: `${Math.round(progressPercent * 100)}%` }}
                            />
                        </View>
                        <Text className="text-surface_a50 text-[10px] mt-1">{progressLabel(achievement)}</Text>
                    </View>
                )}
            </View>

            {unlocked && <AntDesign name="check-circle" size={20} color="#f34023" style={{ marginLeft: 8 }} />}
        </View>
    );
}
