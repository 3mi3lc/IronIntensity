// components/WorkoutScreen.tsx
import React, { useCallback } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DraggableFlatList, { RenderItemParams } from 'react-native-draggable-flatlist';
import { ExerciseWithSets } from '@/repositories/types';
import WorkoutExerciseListItem from '@/components/workoutExerciseListItem';
import { ExerciseHistoryScreen } from '@/app/exercise/exerciseHistoryScreen';
import { AntDesign } from '@expo/vector-icons';

interface WorkoutScreenProps {
    title: string;
    subtitle?: string;
    isReadOnly: boolean;
    loading: boolean;
    error: string | null;
    exerciseData: ExerciseWithSets[];
    workoutId?: string;
    showFinishButton: boolean;
    showAddButton: boolean;
    showDeleteButton?: boolean;
    showArrow?: boolean;
    finishButtonText?: string;
    onBack: () => void;
    onDelete?: () => void;
    onAddExercise?: () => void;
    onFinishWorkout?: () => void;
    onDeleteExercise?: (exercise: ExerciseWithSets) => void;
    onAddSet?: (workoutExerciseId: string) => void;
    onDeleteSet?: (workoutExerciseId: string, setId: string) => void;
    onEditSet?: (workoutExerciseId: string, setId: string, updates: any) => void;
    onReorderExercises?: (data: ExerciseWithSets[]) => void;
    onViewExerciseHistory?: (exerciseId: string, exerciseName: string) => void;
    exerciseMaxWeights?: Record<string, Record<number, number>>;
    // Exercise history props
    userId?: string;
    showExerciseHistory?: boolean;
    selectedExerciseForHistory?: { id: string; name: string } | null;
    onCloseExerciseHistory?: () => void;
}

export function WorkoutScreen({
                                  title,
                                  subtitle,
                                  isReadOnly,
                                  loading,
                                  error,
                                  exerciseData,
                                  workoutId,
                                  showFinishButton,
                                  showAddButton,
                                  showDeleteButton = false,
                                  showArrow,
                                  finishButtonText = 'Finish Workout',
                                  onBack,
                                  onDelete,
                                  onAddExercise,
                                  onFinishWorkout,
                                  onDeleteExercise,
                                  onAddSet,
                                  onDeleteSet,
                                  onEditSet,
                                  onReorderExercises,
                                  onViewExerciseHistory,
                                  exerciseMaxWeights,
                                  // Exercise history props
                                  userId,
                                  showExerciseHistory,
                                  selectedExerciseForHistory,
                                  onCloseExerciseHistory,
                              }: WorkoutScreenProps) {

    // If showing exercise history, render that instead
    if (showExerciseHistory && selectedExerciseForHistory && userId) {
        return (
            <ExerciseHistoryScreen
                userId={userId}
                exerciseId={selectedExerciseForHistory.id}
                exerciseName={selectedExerciseForHistory.name}
                onBack={onCloseExerciseHistory || (() => {})}
            />
        );
    }

    const renderItem = useCallback(
        ({ item, drag, isActive }: RenderItemParams<ExerciseWithSets>) => {
            return (
                <TouchableOpacity
                    onLongPress={isReadOnly ? undefined : drag}
                    disabled={isActive || isReadOnly}
                    activeOpacity={0.8}
                    style={{ opacity: isActive ? 0.8 : 1 }}
                >
                    <WorkoutExerciseListItem
                        exerciseItem={item}
                        exerciseMaxWeights={exerciseMaxWeights}
                        onDeleteExercise={() => onDeleteExercise?.(item)}
                        onEditSet={(setId, updates) =>
                            onEditSet?.(item.workoutExerciseId, setId, updates)
                        }
                        onDeleteSet={(setId) =>
                            onDeleteSet?.(item.workoutExerciseId, setId)
                        }
                        onAddSet={onAddSet}
                        onViewHistory={onViewExerciseHistory}
                        viewOnly={isReadOnly}
                    />
                </TouchableOpacity>
            );
        },
        [isReadOnly, exerciseMaxWeights, onDeleteExercise, onEditSet, onDeleteSet, onAddSet, onViewExerciseHistory]
    );

    if (loading) {
        return (
            <View className="flex-1 justify-center items-center bg-surface_a0 pt-16">
                <View className="bg-surface_a10 p-6 rounded-2xl">
                    <AntDesign name="loading" size={48} color="#f34023" />
                    <Text className="text-light text-xl font-bold mt-4">Loading workout...</Text>
                </View>
            </View>
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
                        <AntDesign
                            name={showArrow ? "arrow-left" : "close"}
                            size={24}
                            color="#eb0202"
                        />
                    </TouchableOpacity>

                    <View className="flex-1 mx-4">
                        <Text className="text-primary_a0 font-bold text-2xl text-center">
                            {title}
                        </Text>
                        {subtitle && (
                            <Text className="text-surface_a50 text-sm text-center mt-1">
                                {subtitle}
                            </Text>
                        )}
                    </View>

                    {showDeleteButton ? (
                        <TouchableOpacity
                            onPress={onDelete}
                            className="p-2 bg-surface_a10 rounded-xl"
                            activeOpacity={0.7}
                        >
                            <AntDesign name="delete" size={24} color="#eb0202" />
                        </TouchableOpacity>
                    ) : (
                        <View style={{ width: 44 }} />
                    )}
                </View>
            </View>

            {/* Content */}
            <View className="flex-1 px-4">
                {workoutId && exerciseData.length > 0 ? (
                    <DraggableFlatList
                        data={exerciseData}
                        keyExtractor={(item) => item.workoutExerciseId}
                        renderItem={renderItem}
                        onDragEnd={({ data }) => {
                            if (!isReadOnly) {
                                onReorderExercises?.(data);
                            }
                        }}
                        ListFooterComponent={
                            showFinishButton ? (
                                <View className="mt-6 mb-24">
                                    <TouchableOpacity
                                        onPress={onFinishWorkout}
                                        className="bg-primary_a10 py-4 rounded-xl shadow-lg"
                                        activeOpacity={0.8}
                                    >
                                        <View className="flex-row items-center justify-center">
                                            <AntDesign name="check" size={24} color="white" />
                                            <Text className="text-light font-bold text-lg ml-2">
                                                {finishButtonText}
                                            </Text>
                                        </View>
                                    </TouchableOpacity>
                                </View>
                            ) : (
                                <View className="mb-24" />
                            )
                        }
                        contentContainerStyle={{ paddingBottom: 100 }}
                    />
                ) : workoutId ? (
                    <View className="flex-1 justify-center items-center py-20">
                        <View className="bg-surface_a10 p-6 rounded-2xl items-center">
                            <AntDesign name="pushpin" size={48} color="#f34023" />
                            <Text className="text-light text-lg font-bold mt-4 mb-2">
                                No exercises yet
                            </Text>
                            <Text className="text-surface_a50 text-center">
                                {isReadOnly
                                    ? 'This workout has no exercises'
                                    : 'Tap the + button to add exercises'
                                }
                            </Text>
                        </View>
                    </View>
                ) : (
                    <View className="flex-1 justify-center items-center">
                        <View className="bg-surface_a10 p-8 rounded-2xl items-center mx-4">
                            <AntDesign name="play-circle" size={64} color="#f34023" />
                            <Text className="text-light text-xl font-bold mt-6 mb-3 text-center">
                                Ready to Start?
                            </Text>
                            <Text className="text-surface_a50 text-base text-center mb-6">
                                Add exercises to begin your workout
                            </Text>
                            <TouchableOpacity
                                onPress={onBack}
                                className="bg-surface_a20 py-3 px-8 rounded-xl"
                                activeOpacity={0.8}
                            >
                                <Text className="text-light font-semibold">Cancel Workout</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}

                {error && (
                    <View className="bg-primary_a10/20 border border-primary_a10 p-4 rounded-xl mt-4">
                        <Text className="text-primary_a10 font-semibold">{error}</Text>
                    </View>
                )}
            </View>

            {/* Floating Add Exercise Button */}
            {showAddButton && workoutId && (
                <View className="absolute bottom-6 right-6">
                    <TouchableOpacity
                        onPress={onAddExercise}
                        className="bg-primary_a0 p-4 rounded-full shadow-2xl"
                        activeOpacity={0.8}
                        style={{
                            shadowColor: '#eb0202',
                            shadowOffset: { width: 0, height: 4 },
                            shadowOpacity: 0.3,
                            shadowRadius: 8,
                            elevation: 8,
                        }}
                    >
                        <AntDesign name="plus" size={28} color="white" />
                    </TouchableOpacity>
                </View>
            )}
        </SafeAreaView>
    );
}