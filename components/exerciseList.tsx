import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Dimensions } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { AntDesign, MaterialIcons } from '@expo/vector-icons';
import { getExerciseVolumeByDay, getExerciseMaxWeightByDay } from '@/repositories/statistics';
import type { TopExercise, ChartDataPoint } from '@/hooks/useStatistics';

interface Props {
    exercises: TopExercise[];
    userId: string;
    startDate: string;
    endDate: string;
    onViewHistory: (exerciseId: string, exerciseName: string) => void;
    onLoadMore: (limit: number) => Promise<void>;
}

export const ExerciseList = ({ exercises, userId, startDate, endDate, onViewHistory, onLoadMore }: Props) => {
    const [expandedExercise, setExpandedExercise] = useState<string | null>(null);
    const [exerciseVolumeData, setExerciseVolumeData] = useState<ChartDataPoint>({ labels: [], data: [] });
    const [exerciseMaxWeightData, setExerciseMaxWeightData] = useState<ChartDataPoint>({ labels: [], data: [] });
    const [showAllExercises, setShowAllExercises] = useState(false);

    const screenWidth = Dimensions.get('window').width;
    const maxVolume = exercises.length > 0 ? Math.max(...exercises.map(e => e.totalVolume)) : 1;

    const handleToggle = async (exerciseId: string) => {
        if (expandedExercise === exerciseId) {
            setExpandedExercise(null);
            setExerciseVolumeData({ labels: [], data: [] });
            setExerciseMaxWeightData({ labels: [], data: [] });
            return;
        }

        setExpandedExercise(exerciseId);
        try {
            const [vol, weight] = await Promise.all([
                getExerciseVolumeByDay(userId, exerciseId, startDate, endDate),
                getExerciseMaxWeightByDay(userId, exerciseId, startDate, endDate),
            ]);
            setExerciseVolumeData(vol);
            setExerciseMaxWeightData(weight);
        } catch (error) {
            console.error('Error loading exercise details:', error);
        }
    };

    if (exercises.length === 0) {
        return (
            <View className="bg-surface_a10 p-8 rounded-xl mb-6 items-center">
                <MaterialIcons name="fitness-center" size={48} color="#666" />
                <Text className="text-surface_a50 text-center mt-4">No exercise data available for this period</Text>
            </View>
        );
    }

    return (
        <View className="bg-surface_a10 p-4 rounded-xl mb-6">
            <Text className="text-light font-bold text-lg mb-4">Exercise Details</Text>

            {exercises.map(exercise => {
                const isExpanded = expandedExercise === exercise.exerciseId;

                return (
                    <View key={exercise.exerciseId} className="mb-4">
                        <TouchableOpacity onPress={() => handleToggle(exercise.exerciseId)} activeOpacity={0.8} className="mb-2">
                            <View className="flex-row justify-between items-center mb-2">
                                <View className="flex-1">
                                    <Text className="text-light font-semibold">{exercise.exerciseName}</Text>
                                    <Text className="text-surface_a50 text-sm">
                                        {(exercise.totalVolume / 1000).toFixed(1)}k kg total volume
                                    </Text>
                                </View>
                                <AntDesign name={isExpanded ? 'up' : 'down'} size={20} color="#f34023" />
                            </View>
                            <View className="bg-surface_a20 h-2 rounded-full overflow-hidden">
                                <View
                                    className="bg-primary_a0 h-full"
                                    style={{ width: `${(exercise.totalVolume / maxVolume) * 100}%` }}
                                />
                            </View>
                        </TouchableOpacity>

                        {isExpanded && (
                            <View className="mt-3 bg-surface_a20 p-3 rounded-lg">
                                <Text className="text-light font-semibold mb-2">Volume Over Time</Text>
                                {exerciseVolumeData.labels.length > 0 ? (
                                    <LineChart
                                        data={{
                                            labels: exerciseVolumeData.labels,
                                            datasets: [{ data: exerciseVolumeData.data.length > 0 ? exerciseVolumeData.data : [0] }],
                                        }}
                                        width={screenWidth - 88}
                                        height={160}
                                        chartConfig={{
                                            backgroundColor: '#1a1a1a',
                                            backgroundGradientFrom: '#1a1a1a',
                                            backgroundGradientTo: '#1a1a1a',
                                            decimalPlaces: 0,
                                            color: (opacity = 1) => `rgba(243, 64, 35, ${opacity})`,
                                            labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
                                            style: { borderRadius: 12 },
                                            propsForDots: { r: '3', strokeWidth: '1', stroke: '#f34023' },
                                        }}
                                        bezier
                                        style={{ marginVertical: 8, borderRadius: 12 }}
                                    />
                                ) : (
                                    <View className="py-8 items-center">
                                        <Text className="text-surface_a50">Loading volume data...</Text>
                                    </View>
                                )}

                                <Text className="text-light font-semibold mb-2 mt-4">Max Weight Over Time</Text>
                                {exerciseMaxWeightData.labels.length > 0 ? (
                                    <LineChart
                                        data={{
                                            labels: exerciseMaxWeightData.labels,
                                            datasets: [{ data: exerciseMaxWeightData.data.length > 0 ? exerciseMaxWeightData.data : [0] }],
                                        }}
                                        width={screenWidth - 88}
                                        height={160}
                                        chartConfig={{
                                            backgroundColor: '#1a1a1a',
                                            backgroundGradientFrom: '#1a1a1a',
                                            backgroundGradientTo: '#1a1a1a',
                                            decimalPlaces: 1,
                                            color: (opacity = 1) => `rgba(74, 222, 128, ${opacity})`,
                                            labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
                                            style: { borderRadius: 12 },
                                            propsForDots: { r: '3', strokeWidth: '1', stroke: '#4ade80' },
                                        }}
                                        bezier
                                        style={{ marginVertical: 8, borderRadius: 12 }}
                                    />
                                ) : (
                                    <View className="py-8 items-center">
                                        <Text className="text-surface_a50">Loading weight data...</Text>
                                    </View>
                                )}

                                <TouchableOpacity
                                    onPress={() => onViewHistory(exercise.exerciseId, exercise.exerciseName)}
                                    className="mt-4 bg-primary_a0 py-3 rounded-lg"
                                    activeOpacity={0.8}
                                >
                                    <View className="flex-row items-center justify-center">
                                        <AntDesign name="history" size={18} color="white" />
                                        <Text className="text-white font-semibold ml-2">View Exercise History</Text>
                                    </View>
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                );
            })}

            {!showAllExercises && exercises.length >= 10 && (
                <TouchableOpacity
                    onPress={async () => {
                        setShowAllExercises(true);
                        await onLoadMore(999);
                    }}
                    className="mt-2 p-2 bg-primary_a0 rounded-md items-center"
                >
                    <Text className="text-white font-semibold">View All Exercises</Text>
                </TouchableOpacity>
            )}

            {showAllExercises && exercises.length > 10 && (
                <TouchableOpacity
                    onPress={async () => {
                        setShowAllExercises(false);
                        await onLoadMore(10);
                    }}
                    className="mt-2 p-2 bg-surface_a20 rounded-md items-center"
                >
                    <Text className="text-surface_a50 font-semibold">Show Less</Text>
                </TouchableOpacity>
            )}
        </View>
    );
};
