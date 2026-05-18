import React from 'react';
import { View, Text } from 'react-native';
import { AntDesign } from '@expo/vector-icons';

interface StreakCardProps {
    currentStreak: number;
    longestStreak: number;
}

export const StreakCard = ({ currentStreak, longestStreak }: StreakCardProps) => {
    return (
        <View className="w-full max-w-[400px] mb-4 flex-row gap-3">
            <View className="flex-1 bg-surface_a10 rounded-2xl p-4 flex-row items-center gap-3">
                <View className={`w-10 h-10 rounded-full items-center justify-center ${
                    currentStreak > 0 ? 'bg-primary_a0' : 'bg-surface_a20'
                }`}>
                    <AntDesign name="fire" size={20} color="white" />
                </View>
                <View>
                    <Text className="text-surface_a50 text-xs">Current Streak</Text>
                    <Text className="text-white font-bold text-xl">
                        {currentStreak} {currentStreak === 1 ? 'week' : 'weeks'}
                    </Text>
                </View>
            </View>

            <View className="flex-1 bg-surface_a10 rounded-2xl p-4 flex-row items-center gap-3">
                <View className="w-10 h-10 rounded-full bg-yellow-500/20 items-center justify-center">
                    <AntDesign name="star" size={20} color="#f59e0b" />
                </View>
                <View>
                    <Text className="text-surface_a50 text-xs">Best Streak</Text>
                    <Text className="text-white font-bold text-xl">
                        {longestStreak} {longestStreak === 1 ? 'week' : 'weeks'}
                    </Text>
                </View>
            </View>
        </View>
    );
};