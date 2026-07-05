import React from 'react';
import { View, Text } from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import { formatDistanceToNow } from 'date-fns';
import type { PersonalRecord } from '@/hooks/useStatistics';

interface Props {
    prs: PersonalRecord[];
}

export const RecentPRsList = ({ prs }: Props) => {
    if (prs.length === 0) {
        return (
            <View className="bg-surface_a10 p-8 rounded-xl mb-6 items-center">
                <AntDesign name="star" size={48} color="#666" />
                <Text className="text-surface_a50 text-center mt-4">
                    No PRs yet. Complete a workout to set your first record.
                </Text>
            </View>
        );
    }

    return (
        <View className="bg-surface_a10 p-4 rounded-xl mb-20">
            <Text className="text-light font-bold text-lg mb-4">Recent PRs</Text>
            {prs.map((pr, index) => (
                <View
                    key={index}
                    className={`flex-row items-center ${index < prs.length - 1 ? 'mb-3 pb-3 border-b border-surface_a20' : ''}`}
                >
                    <AntDesign name="star" size={20} color="#f34023" />
                    <View className="flex-1 ml-3">
                        <Text className="text-light font-semibold">{pr.exerciseName}</Text>
                        <Text className="text-surface_a50 text-sm">{pr.weight} kg × {pr.reps} reps</Text>
                    </View>
                    <Text className="text-surface_a50 text-sm">
                        {formatDistanceToNow(new Date(pr.completedAt), { addSuffix: true })}
                    </Text>
                </View>
            ))}
        </View>
    );
};
