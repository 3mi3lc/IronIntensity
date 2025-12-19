// app/exercise/exerciseHistoryScreen.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AntDesign } from '@expo/vector-icons';
import { getExerciseHistory } from '@/repositories/statistics';
import { formatDistanceToNow, format } from 'date-fns';

interface ExerciseHistorySet {
    id: string;
    setNumber: number;
    reps: number;
    weight: number;
    isPr: boolean;
    createdAt: string;
}

interface ExerciseHistoryWorkout {
    workoutId: string;
    workoutName: string;
    completedAt: string;
    sets: ExerciseHistorySet[];
}

interface ExerciseHistoryScreenProps {
    userId: string;
    exerciseId: string;
    exerciseName: string;
    onBack: () => void;
}

export function ExerciseHistoryScreen({
                                          userId,
                                          exerciseId,
                                          exerciseName,
                                          onBack,
                                      }: ExerciseHistoryScreenProps) {
    const [loading, setLoading] = useState(true);
    const [history, setHistory] = useState<ExerciseHistoryWorkout[]>([]);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadHistory();
    }, [userId, exerciseId]);

    const loadHistory = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await getExerciseHistory(userId, exerciseId, 20);
            setHistory(data);
        } catch (err) {
            console.error('Error loading exercise history:', err);
            setError('Failed to load exercise history');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <SafeAreaView className="flex-1 bg-surface_a0">
                <View className="flex-1 justify-center items-center">
                    <View className="bg-surface_a10 p-6 rounded-2xl">
                        <AntDesign name="loading" size={48} color="#f34023" />
                        <Text className="text-light text-xl font-bold mt-4">Loading history...</Text>
                    </View>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView className="flex-1 bg-surface_a0">
            {/* Header */}
            <View className="px-4 pt-4 pb-4">
                <View className="flex-row justify-between items-center">
                    <TouchableOpacity
                        onPress={onBack}
                        className="p-2 bg-surface_a10 rounded-xl"
                        activeOpacity={0.7}
                    >
                        <AntDesign name="arrow-left" size={24} color="#eb0202" />
                    </TouchableOpacity>

                    <View className="flex-1 mx-4">
                        <Text className="text-primary_a0 font-bold text-2xl text-center">
                            {exerciseName}
                        </Text>
                        <Text className="text-surface_a50 text-sm text-center mt-1">
                            Exercise History
                        </Text>
                    </View>

                    <View style={{ width: 44 }} />
                </View>
            </View>

            {/* Content */}
            <ScrollView
                className="flex-1 px-4"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 80 }}
            >
                {error && (
                    <View className="bg-red-500/20 border border-red-500 p-4 rounded-xl mb-4">
                        <Text className="text-red-500 font-semibold">{error}</Text>
                    </View>
                )}

                {history.length > 0 ? (
                    history.map((workout, workoutIndex) => {
                        const totalVolume = workout.sets.reduce(
                            (sum, set) => sum + set.weight * set.reps,
                            0
                        );
                        const maxWeight = Math.max(...workout.sets.map(s => s.weight));

                        return (
                            <View
                                key={workout.workoutId}
                                className={`bg-surface_a10 rounded-xl p-4 ${
                                    workoutIndex < history.length - 1 ? 'mb-4' : ''
                                }`}
                            >
                                {/* Workout Header */}
                                <View className="mb-3 pb-3 border-b border-surface_a20">
                                    <View className="flex-row justify-between items-start mb-2">
                                        <View className="flex-1">
                                            <Text className="text-primary_a0 font-bold text-lg">
                                                {workout.workoutName}
                                            </Text>
                                            <Text className="text-primary_a10 text-sm mt-1">
                                                {format(new Date(workout.completedAt), 'EEEE, MMMM d, yyyy')}
                                            </Text>
                                            <Text className="text-primary_a10 text-xs">
                                                {formatDistanceToNow(new Date(workout.completedAt), {
                                                    addSuffix: true,
                                                })}
                                            </Text>
                                        </View>
                                    </View>

                                    {/* Workout Stats */}
                                    <View className="flex-row mt-2 gap-2">
                                        <View className="bg-surface_a20 px-3 py-2 rounded-lg flex-1">
                                            <Text className="text-surface_a50 text-xs">Total Volume</Text>
                                            <Text className="text-light font-bold text-base">
                                                {(totalVolume / 1000).toFixed(1)}k kg
                                            </Text>
                                        </View>
                                        <View className="bg-surface_a20 px-3 py-2 rounded-lg flex-1">
                                            <Text className="text-surface_a50 text-xs">Max Weight</Text>
                                            <Text className="text-light font-bold text-base">
                                                {maxWeight} kg
                                            </Text>
                                        </View>
                                        <View className="bg-surface_a20 px-3 py-2 rounded-lg flex-1">
                                            <Text className="text-surface_a50 text-xs">Total Sets</Text>
                                            <Text className="text-light font-bold text-base">
                                                {workout.sets.length}
                                            </Text>
                                        </View>
                                    </View>
                                </View>

                                {/* Sets Header */}
                                <View className="flex-row mb-2 px-2">
                                    <Text className="text-surface_a50 text-xs font-semibold w-12">SET</Text>
                                    <Text className="text-surface_a50 text-xs font-semibold flex-1 text-center">
                                        KG
                                    </Text>
                                    <Text className="text-surface_a50 text-xs font-semibold flex-1 text-center">
                                        REPS
                                    </Text>
                                    <Text className="text-surface_a50 text-xs font-semibold flex-1 text-right">
                                        VOLUME
                                    </Text>
                                </View>

                                {/* Sets List */}
                                {workout.sets.map((set, setIndex) => (
                                    <View
                                        key={set.id}
                                        className={`flex-row items-center py-3 px-2 ${
                                            setIndex < workout.sets.length - 1
                                                ? 'border-b border-surface_a20'
                                                : ''
                                        } ${set.isPr ? 'bg-primary_a0/10' : ''}`}
                                    >
                                        <View className="w-12 flex-row items-center">
                                            <Text className="text-light font-semibold">{set.setNumber}</Text>
                                            {set.isPr && (
                                                <AntDesign
                                                    name="star"
                                                    size={12}
                                                    color="#f34023"
                                                    style={{ marginLeft: 4 }}
                                                />
                                            )}
                                        </View>

                                        <View className="flex-1 items-center">
                                            <Text className="text-light font-bold text-base">
                                                {set.weight}
                                            </Text>
                                        </View>

                                        <View className="flex-1 items-center">
                                            <Text className="text-light font-bold text-base">
                                                {set.reps}
                                            </Text>
                                        </View>

                                        <View className="flex-1 items-end">
                                            <Text className="text-surface_a50 text-sm">
                                                {(set.weight * set.reps).toFixed(0)} kg
                                            </Text>
                                        </View>
                                    </View>
                                ))}
                            </View>
                        );
                    })
                ) : (
                    <View className="flex-1 justify-center items-center py-20">
                        <View className="bg-surface_a10 p-6 rounded-2xl items-center">
                            <AntDesign name="inbox" size={48} color="#666" />
                            <Text className="text-light text-lg font-bold mt-4 mb-2">
                                No History Yet
                            </Text>
                            <Text className="text-surface_a50 text-center">
                                This exercise hasn't been performed yet
                            </Text>
                        </View>
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}