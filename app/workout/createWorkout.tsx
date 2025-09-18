import {View, Text, TouchableOpacity, SafeAreaView, } from 'react-native';
import {useLocalSearchParams, useRouter} from 'expo-router';
import React, {useEffect, useState, useCallback, useContext} from 'react';
import DraggableFlatList, { RenderItemParams } from 'react-native-draggable-flatlist';
import { ExerciseWithSets, Workout } from '@/repositories/types';
import {createWorkout, getWorkoutById, getWorkoutWithExercisesAndSets,} from '@/repositories/workouts';
import WorkoutExerciseListItem from '@/components/workoutExerciseListItem';
import { addSet,  softDeleteSet, updateSet, } from '@/repositories/workoutExerciseSets';
import {addExerciseToWorkoutById, reorderWorkoutExercises} from "@/repositories/workoutExercises";
import {UserContext} from "@/contexts/UserContext";
import FinishWorkoutModal from "@/components/finishWorkoutModal";


function CreateWorkout() {
    const { id, name } = useLocalSearchParams<{ id?: string; name?: string }>();
    const [workout, setWorkout] = useState<Workout | null>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [exerciseData, setExerciseData] = useState<ExerciseWithSets[]>([]);
    const [modalVisible, setModalVisible] = useState(false);
    const [workoutNameInput, setWorkoutNameInput] = useState(workout?.name || '');
    const [workoutDate, setWorkoutDate] = useState(new Date());
    const { user  } = useContext(UserContext) ?? {};
    const isNewWorkout = !id;
    const router = useRouter();

    // Load workout if editing an existing one
    useEffect(() => {
        if (!id) return;

        setLoading(true);
        Promise.all([getWorkoutById(id), getWorkoutWithExercisesAndSets(id)])
            .then(([workoutResult, exerciseResult]) => {
                setWorkout(workoutResult);
                setExerciseData(exerciseResult);
            })
            .catch((err) => {
                setError(err.message || 'Failed to load workout');
            })
            .finally(() => setLoading(false));
    }, [id]);

    useEffect(() => {
        if (workout?.name) {
            setWorkoutNameInput(workout.name);
        }
    }, [workout]);

    const handleAddSet = async (workoutExerciseId: string) => {
        try {
            const newSet = await addSet(
                workoutExerciseId,
                {
                    reps: 10,
                    weight: 0,
                },
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
                        ? {
                            ...exerciseItem,
                            sets: [...exerciseItem.sets, formattedSet],
                        }
                        : exerciseItem
                )
            );
        } catch (err) {
            console.error('Failed to add set:', err);
        }
    };

    const handleDeleteSet = async (workoutExerciseId: string, setId: string) => {
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
                                .map((set, index) => ({
                                ...set,
                                setNumber: index + 1,
                            })),

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
        if (!workout) return;
        if (!user) {
            console.warn('No user logged in, cannot finish workout');
            return;
        }

        try {
            const newWorkout = await createWorkout(
                {
                    name: workoutNameInput || 'New Workout',
                    user_id: user.id,
                    created_at: workoutDate.toISOString(), // pass date as ISO string or format as needed
                },
                { returnData: true }
            );

            if (!newWorkout || typeof newWorkout === 'boolean') {
                throw new Error('Failed to create new workout');
            }

            for (const exercise of exerciseData) {
                const newWorkoutExercise = await addExerciseToWorkoutById(newWorkout.id, exercise.exercise.id);

                for (const set of exercise.sets) {
                    await addSet(newWorkoutExercise.id, {
                        reps: set.reps,
                        weight: set.weight,
                    });
                }
            }

            router.push({ pathname: '/' });
        } catch (error) {
            console.error('Failed to finish workout:', error);
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
        []
    );

    if (loading) {
        return (
            <View className="flex-1 justify-center items-center bg-surface_a0 pt-16">
                <Text className="text-white text-3xl font-bold">Loading workout...</Text>
            </View>
        );
    }

    return (
        <>
            <SafeAreaView className="flex-1 bg-surface_a0 pt-16 px-4">
                <Text className="text-primary_a0 font-bold text-3xl mb-4">
                    {isNewWorkout ? 'New Workout' : name ?? 'Workout'}
                </Text>

                {!isNewWorkout && workout && (
                    <>
                        <DraggableFlatList
                            data={exerciseData}
                            keyExtractor={(item) => item.workoutExerciseId}
                            renderItem={renderItem}
                            onDragEnd={async ({ data }) => {
                                // update local state with new order (and update orderIndex to match)
                                const updatedData = data.map((item, idx) => ({
                                    ...item,
                                    orderIndex: idx + 1, // match your DB starting at 1
                                }));

                                setExerciseData(updatedData); // update UI immediately

                                if (!workout?.id) return; // safeguard

                                try {
                                    // persist new order in DB
                                    await reorderWorkoutExercises(
                                        workout.id,
                                        updatedData.map((ex) => ex.workoutExerciseId)
                                    );
                                } catch (error) {
                                    console.error('Failed to reorder exercises:', error);
                                    // optionally revert UI changes or show error message here
                                }
                            }}
                            ListFooterComponent={
                                <View className="mt-6 mb-20 px-4">
                                    <TouchableOpacity
                                        onPress={() => setModalVisible(true)}
                                        className="bg-primary_a10 py-4 rounded-xl shadow-md items-center"
                                        activeOpacity={0.8}
                                    >
                                        <Text className="text-white font-bold text-lg">Finish Workout</Text>
                                    </TouchableOpacity>
                                </View>
                            }
                            contentContainerStyle={{ paddingBottom: 200 }}
                        />
                    </>
                )}

                {isNewWorkout && (
                    <Text className="text-white">Start building your new workout here.</Text>
                )}

                {error && <Text className="text-red-400 mt-4">{error}</Text>}

                {/* Floating buttons container */}
                <View className="absolute bottom-6 right-4 flex-row justify-end">
                    <TouchableOpacity
                        onPress={() => {
                            // Navigate to the SelectExerciseScreen and pass the workout ID
                            router.push({
                                pathname: '/exercise/addExercise', // path to your exercises screen
                                params: { workoutId: workout?.id },
                            });
                        }}
                        className="bg-primary_a0 py-3 px-6 rounded-xl shadow-md"
                        activeOpacity={0.8}
                    >
                        <Text className="text-white font-bold text-lg">+ Exercise</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>

            <View>
                <FinishWorkoutModal
                    visible={modalVisible}
                    onClose={() => setModalVisible(false)}
                    workoutNameInput={workoutNameInput}
                    setWorkoutNameInput={setWorkoutNameInput}
                    workoutDate={workoutDate}
                    setWorkoutDate={setWorkoutDate}
                    finishWorkoutWithData={finishWorkoutWithData}
                />
            </View>
        </>
    );
}
export default CreateWorkout;
