// app/workout/createWorkout.tsx - Refactored with mode parameter

import {View, Text, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {useLocalSearchParams, useRouter, useFocusEffect} from 'expo-router';
import React, {useEffect, useState, useCallback, useContext} from 'react';
import DraggableFlatList, { RenderItemParams } from 'react-native-draggable-flatlist';
import { ExerciseWithSets, Workout } from '@/repositories/types';
import {
    getWorkoutById,
    getWorkoutWithExercisesAndSets,
    softDeleteWorkoutById,
    updateWorkoutById,
    duplicateWorkout
} from '@/repositories/workouts';
import WorkoutExerciseListItem from '@/components/workoutExerciseListItem';
import { addSet, softDeleteSet, updateSet } from '@/repositories/workoutExerciseSets';
import { reorderWorkoutExercises, softDeleteWorkoutExerciseById } from "@/repositories/workoutExercises";
import {UserContext} from "@/contexts/UserContext";
import FinishWorkoutModal from "@/components/finishWorkoutModal";
import CancelWorkoutModal from "@/components/cancelWorkoutModal";
import { AntDesign } from '@expo/vector-icons';
import ExerciseDeleteModal from "@/components/exerciseDeleteModal";

// Define workout modes
type WorkoutMode = 'create' | 'edit' | 'view' | 'perform-again';

function CreateWorkout() {
    const {
        id,
        name,
        mode = 'create'
    } = useLocalSearchParams<{
        id?: string;
        name?: string;
        mode?: WorkoutMode
    }>();

    const [workout, setWorkout] = useState<Workout | null>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [exerciseData, setExerciseData] = useState<ExerciseWithSets[]>([]);
    const [finishModalVisible, setFinishModalVisible] = useState(false);
    const [cancelModalVisible, setCancelModalVisible] = useState(false);
    const [exerciseToDelete, setExerciseToDelete] = useState<ExerciseWithSets | null>(null);
    const [workoutNameInput, setWorkoutNameInput] = useState(workout?.name || '');
    const [workoutDate, setWorkoutDate] = useState(new Date());
    const { user } = useContext(UserContext) ?? {};
    const router = useRouter();

    // Mode helpers
    const isViewMode = mode === 'view';
    const isEditMode = mode === 'edit';
    const isCreateMode = mode === 'create';
    const isPerformAgainMode = mode === 'perform-again';
    const isReadOnly = isViewMode;
    const canModify = !isReadOnly;

    // Handle "Perform Again" mode - duplicate workout on load
    useEffect(() => {
        const handlePerformAgain = async () => {
            if (isPerformAgainMode && id && user) {
                try {
                    setLoading(true);
                    const newWorkout = await duplicateWorkout(id, user.id);

                    if (typeof newWorkout !== 'boolean' && newWorkout) {
                        // Switch to edit mode with the new workout
                        router.replace({
                            pathname: '/workout/createWorkout',
                            params: {
                                id: newWorkout.id,
                                name: newWorkout.name,
                                mode: 'edit'
                            }
                        });
                    }
                } catch (err) {
                    console.error('Failed to duplicate workout:', err);
                    Alert.alert('Error', 'Failed to start workout. Please try again.');
                    router.back();
                } finally {
                    setLoading(false);
                }
            }
        };

        handlePerformAgain();
    }, [isPerformAgainMode, id, user]);

    const handleCancelWorkout = () => {
        if (isViewMode) {
            router.back();
            return;
        }

        setCancelModalVisible(true);
    };

    const confirmCancelWorkout = async () => {
        setCancelModalVisible(false);

        if (id && canModify) {
            try {
                await softDeleteWorkoutById(id);
            } catch (err) {
                console.error('Failed to delete workout:', err);
            }
        }
        router.back();
    };

    async function handleConfirmDelete() {
        if (!exerciseToDelete) return;

        await softDeleteWorkoutExerciseById(exerciseToDelete.workoutExerciseId);
        await loadWorkoutData();

        if (workout?.id) {
            const orderedIds = exerciseData
                .filter(ex => ex.workoutExerciseId !== exerciseToDelete.workoutExerciseId)
                .map(ex => ex.workoutExerciseId);

            await reorderWorkoutExercises(workout.id, orderedIds);
            await loadWorkoutData();
        }

        setExerciseToDelete(null);
    }

    const loadWorkoutData = useCallback(async () => {
        if (!id) return;

        setLoading(true);
        try {
            const [workoutResult, exerciseResult] = await Promise.all([
                getWorkoutById(id),
                getWorkoutWithExercisesAndSets(id)
            ]);
            setWorkout(workoutResult);
            setExerciseData(exerciseResult);
        } catch (err: any) {
            setError(err.message || 'Failed to load workout');
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        loadWorkoutData();
    }, [loadWorkoutData]);

    useFocusEffect(
        useCallback(() => {
            if (id && canModify) {
                loadWorkoutData();
            }
        }, [id, canModify, loadWorkoutData])
    );

    useEffect(() => {
        if (workout?.name) {
            setWorkoutNameInput(workout.name);
        }
    }, [workout]);

    const handleAddSet = async (workoutExerciseId: string) => {
        if (isReadOnly) return;

        try {
            const newSet = await addSet(
                workoutExerciseId,
                { reps: 10, weight: 0 },
                { returnData: true }
            );

            if (!newSet || typeof newSet === 'boolean') return;

            const formattedSet = {
                id: newSet.id,
                setNumber: newSet.set_number,
                reps: newSet.reps,
                weight: newSet.weight,
            };

            setExerciseData((prev) =>
                prev.map((exerciseItem) =>
                    exerciseItem.workoutExerciseId === workoutExerciseId
                        ? { ...exerciseItem, sets: [...exerciseItem.sets, formattedSet] }
                        : exerciseItem
                )
            );
        } catch (err) {
            console.error('Failed to add set:', err);
        }
    };

    const handleDeleteSet = async (workoutExerciseId: string, setId: string) => {
        if (isReadOnly) return;

        try {
            const deleted = await softDeleteSet(setId);
            if (!deleted) return;

            setExerciseData((prev) =>
                prev.map((exerciseItem) =>
                    exerciseItem.workoutExerciseId === workoutExerciseId
                        ? {
                            ...exerciseItem,
                            sets: exerciseItem.sets
                                .filter((set) => set.id !== setId)
                                .map((set, index) => ({ ...set, setNumber: index + 1 })),
                        }
                        : exerciseItem
                )
            );
        } catch (err) {
            console.error('Failed to delete set:', err);
        }
    };

    const handleUpdateSet = async (
        workoutExerciseId: string,
        setId: string,
        updates: { reps?: number; weight?: number; setNumber?: number }
    ) => {
        if (isReadOnly) return;

        try {
            const updatedSet = await updateSet(setId, updates, { returnData: true });
            if (!updatedSet || typeof updatedSet === 'boolean') return;

            const formattedSet = {
                id: updatedSet.id,
                setNumber: updatedSet.set_number,
                reps: updatedSet.reps,
                weight: updatedSet.weight,
            };

            setExerciseData((prev) =>
                prev.map((exerciseItem) =>
                    exerciseItem.workoutExerciseId === workoutExerciseId
                        ? {
                            ...exerciseItem,
                            sets: exerciseItem.sets.map((set) =>
                                set.id === setId ? formattedSet : set
                            ),
                        }
                        : exerciseItem
                )
            );
        } catch (err) {
            console.error('Failed to update set:', err);
        }
    };

    const finishWorkoutWithData = async () => {
        if (!workout || !user) return;

        try {
            await updateWorkoutById(workout.id, {
                name: workoutNameInput || 'Completed Workout',
                created_at: workoutDate.toISOString(),
            });

            router.push({ pathname: '/' });
        } catch (error) {
            console.error('Failed to finish workout:', error);
            Alert.alert('Error', 'Failed to save workout. Please try again.');
        }
    };

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
                        onDeleteExercise={isReadOnly ? undefined : () => setExerciseToDelete(item)}
                        onEditSet={isReadOnly ? undefined : (setId, updates) =>
                            handleUpdateSet(item.workoutExerciseId, setId, updates)
                        }
                        onDeleteSet={isReadOnly ? undefined : (setId) =>
                            handleDeleteSet(item.workoutExerciseId, setId)
                        }
                        onAddSet={isReadOnly ? undefined : handleAddSet}
                    />
                </TouchableOpacity>
            );
        },
        [isReadOnly]
    );

    // Get header title based on mode
    const getHeaderTitle = () => {
        switch (mode) {
            case 'view':
                return name || 'Workout Details';
            case 'edit':
                return name || 'Edit Workout';
            case 'perform-again':
                return 'Starting Workout...';
            case 'create':
            default:
                return 'New Workout';
        }
    };

    const getHeaderSubtitle = () => {
        if (isEditMode) return 'In Progress';
        if (isViewMode) return 'Completed';
        return null;
    };

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
        <>
            <SafeAreaView className="flex-1 bg-surface_a0">
                {/* Header */}
                <View className="px-4 pt-4 pb-4">
                    <View className="flex-row justify-between items-center">
                        <TouchableOpacity
                            onPress={handleCancelWorkout}
                            className="p-2 bg-surface_a10 rounded-xl"
                            activeOpacity={0.7}
                        >
                            <AntDesign
                                name={isViewMode ? "arrow-left" : "close"}
                                size={24}
                                color="#eb0202"
                            />
                        </TouchableOpacity>

                        <View className="flex-1 mx-4">
                            <Text className="text-primary_a0 font-bold text-2xl text-center">
                                {getHeaderTitle()}
                            </Text>
                            {getHeaderSubtitle() && (
                                <Text className="text-surface_a50 text-sm text-center mt-1">
                                    {getHeaderSubtitle()}
                                </Text>
                            )}
                        </View>

                        <View style={{ width: 44 }} />
                    </View>
                </View>

                {/* Content */}
                <View className="flex-1 px-4">
                    {id && workout && (
                        <DraggableFlatList
                            data={exerciseData}
                            keyExtractor={(item) => item.workoutExerciseId}
                            renderItem={renderItem}
                            onDragEnd={async ({ data }) => {
                                if (isReadOnly) return;

                                const updatedData = data.map((item, idx) => ({
                                    ...item,
                                    orderIndex: idx + 1,
                                }));

                                setExerciseData(updatedData);

                                if (!workout?.id) return;

                                try {
                                    await reorderWorkoutExercises(
                                        workout.id,
                                        updatedData.map((ex) => ex.workoutExerciseId)
                                    );
                                } catch (error) {
                                    console.error('Failed to reorder exercises:', error);
                                }
                            }}
                            ListEmptyComponent={
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
                            }
                            ListFooterComponent={
                                canModify && exerciseData.length > 0 ? (
                                    <View className="mt-6 mb-24">
                                        <TouchableOpacity
                                            onPress={() => setFinishModalVisible(true)}
                                            className="bg-primary_a10 py-4 rounded-xl shadow-lg"
                                            activeOpacity={0.8}
                                        >
                                            <View className="flex-row items-center justify-center">
                                                <AntDesign name="check" size={24} color="white" />
                                                <Text className="text-light font-bold text-lg ml-2">
                                                    Finish Workout
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
                    )}

                    {isCreateMode && (
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
                                    onPress={handleCancelWorkout}
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
                {canModify && id && (
                    <View className="absolute bottom-6 right-6">
                        <TouchableOpacity
                            onPress={() => {
                                router.push({
                                    pathname: '/exercise/addExercise',
                                    params: { workoutId: workout?.id },
                                });
                            }}
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

            {/* Modals */}
            {canModify && (
                <>
                    <FinishWorkoutModal
                        visible={finishModalVisible}
                        onClose={() => setFinishModalVisible(false)}
                        workoutNameInput={workoutNameInput}
                        setWorkoutNameInput={setWorkoutNameInput}
                        workoutDate={workoutDate}
                        setWorkoutDate={setWorkoutDate}
                        finishWorkoutWithData={finishWorkoutWithData}
                    />

                    <CancelWorkoutModal
                        visible={cancelModalVisible}
                        onClose={() => setCancelModalVisible(false)}
                        onConfirm={confirmCancelWorkout}
                    />

                    <ExerciseDeleteModal
                        visible={!!exerciseToDelete}
                        exerciseName={exerciseToDelete?.exercise.name ?? ""}
                        onCancel={() => setExerciseToDelete(null)}
                        onConfirm={handleConfirmDelete}
                    />
                </>
            )}
        </>
    );
}

export default CreateWorkout;