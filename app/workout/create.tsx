// app/workout/create.tsx
import React, { useEffect, useState, useCallback, useContext } from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import DraggableFlatList, { RenderItemParams } from 'react-native-draggable-flatlist';
import { ExerciseWithSets } from '@/repositories/types';
import WorkoutExerciseListItem from '@/components/workoutExerciseListItem';
import FinishWorkoutModal from '@/components/finishWorkoutModal';
import CancelWorkoutModal from '@/components/cancelWorkoutModal';
import ExerciseDeleteModal from '@/components/exerciseDeleteModal';
import { AntDesign } from '@expo/vector-icons';
import { UserContext } from '@/contexts/UserContext';
import { createWorkout } from '@/repositories/workouts';
import { useWorkoutLogic } from '@/hooks/useWorkoutLogic';

function CreateWorkout() {
    const router = useRouter();
    const { user } = useContext(UserContext) ?? {};
    const [workoutId, setWorkoutId] = useState<string | undefined>();
    const [isCreating, setIsCreating] = useState(false);

    // Use the shared hook
    const {
        workout,
        loading,
        error,
        exerciseData,
        exerciseToDelete,
        setExerciseToDelete,
        loadWorkoutData,
        handleAddSet,
        handleDeleteSet,
        handleUpdateSet,
        handleDeleteExercise,
        handleReorderExercises,
        handleFinishWorkout,
        handleDeleteWorkout,
    } = useWorkoutLogic(workoutId, false);

    const [finishModalVisible, setFinishModalVisible] = useState(false);
    const [cancelModalVisible, setCancelModalVisible] = useState(false);
    const [workoutNameInput, setWorkoutNameInput] = useState('');
    const [workoutDate, setWorkoutDate] = useState(new Date());

    // Create workout on mount
    useEffect(() => {
        if (!workoutId && user && !isCreating) {
            handleCreateWorkout();
        }
    }, [user, workoutId, isCreating]);

    // Reload data when screen is focused
    useFocusEffect(
        useCallback(() => {
            if (workoutId) {
                loadWorkoutData();
            }
        }, [workoutId, loadWorkoutData])
    );

    const handleCreateWorkout = async () => {
        if (!user) {
            Alert.alert('Error', 'You must be logged in to create a workout');
            router.back();
            return;
        }

        setIsCreating(true);
        try {
            const newWorkout = await createWorkout(
                { name: 'Workout in Progress', user_id: user.id },
                { returnData: true }
            );

            if (!newWorkout || typeof newWorkout === 'boolean') {
                throw new Error('Failed to create workout');
            }

            setWorkoutId(newWorkout.id);
        } catch (err) {
            console.error('Failed to create workout:', err);
            Alert.alert('Error', 'Failed to create workout');
            router.back();
        } finally {
            setIsCreating(false);
        }
    };

    const handleBack = () => {
        setCancelModalVisible(true);
    };

    const handleAddExercise = () => {
        router.push({
            pathname: '/exercise/addExercise',
            params: { workoutId: workout?.id },
        });
    };

    const confirmCancelWorkout = async () => {
        setCancelModalVisible(false);
        await handleDeleteWorkout();
        router.back();
    };

    const finishWorkoutWithData = async () => {
        const success = await handleFinishWorkout(workoutNameInput, workoutDate);
        if (success) {
            router.push({ pathname: '/' });
        }
    };

    const renderItem = useCallback(
        ({ item, drag, isActive }: RenderItemParams<ExerciseWithSets>) => {
            return (
                <TouchableOpacity
                    onLongPress={drag}
                    disabled={isActive}
                    activeOpacity={0.8}
                    style={{ opacity: isActive ? 0.8 : 1 }}
                >
                    <WorkoutExerciseListItem
                        exerciseItem={item}
                        onDeleteExercise={() => setExerciseToDelete(item)}
                        onEditSet={(setId, updates) =>
                            handleUpdateSet(item.workoutExerciseId, setId, updates)
                        }
                        onDeleteSet={(setId) =>
                            handleDeleteSet(item.workoutExerciseId, setId)
                        }
                        onAddSet={handleAddSet}
                    />
                </TouchableOpacity>
            );
        },
        [handleAddSet, handleDeleteSet, handleUpdateSet, setExerciseToDelete]
    );

    if (loading || isCreating) {
        return (
            <View className="flex-1 justify-center items-center bg-surface_a0 pt-16">
                <View className="bg-surface_a10 p-6 rounded-2xl">
                    <AntDesign name="loading" size={48} color="#f34023" />
                    <Text className="text-light text-xl font-bold mt-4">
                        {isCreating ? 'Creating workout...' : 'Loading workout...'}
                    </Text>
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
                            onPress={handleBack}
                            className="p-2 bg-surface_a10 rounded-xl"
                            activeOpacity={0.7}
                        >
                            <AntDesign name="close" size={24} color="#eb0202" />
                        </TouchableOpacity>

                        <View className="flex-1 mx-4">
                            <Text className="text-primary_a0 font-bold text-2xl text-center">
                                New Workout
                            </Text>
                        </View>

                        <View style={{ width: 44 }} />
                    </View>
                </View>

                {/* Content */}
                <View className="flex-1 px-4">
                    {workoutId && exerciseData.length > 0 ? (
                        <DraggableFlatList
                            data={exerciseData}
                            keyExtractor={(item) => item.workoutExerciseId}
                            renderItem={renderItem}
                            onDragEnd={({ data }) => handleReorderExercises(data)}
                            ListFooterComponent={
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
                            }
                            contentContainerStyle={{ paddingBottom: 100 }}
                        />
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
                                    onPress={handleBack}
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
                {workoutId && (
                    <View className="absolute bottom-6 right-6">
                        <TouchableOpacity
                            onPress={handleAddExercise}
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
                exerciseName={exerciseToDelete?.exercise.name ?? ''}
                onCancel={() => setExerciseToDelete(null)}
                onConfirm={handleDeleteExercise}
            />
        </>
    );
}

export default CreateWorkout;