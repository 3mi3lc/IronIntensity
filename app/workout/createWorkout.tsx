import { View, Text, ScrollView } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {ExerciseWithSets, Workout} from '@/repositories/types';
import {getWorkoutById, getWorkoutWithExercisesAndSets} from '@/repositories/workouts';
import WorkoutExerciseListItem from "@/components/workoutExerciseListItem";
import {addSet} from "@/repositories/workoutExerciseSets";

function CreateWorkout() {
    const { id, name } = useLocalSearchParams<{ id?: string; name?: string }>();
    const [workout, setWorkout] = useState<Workout | null>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [exerciseData, setExerciseData] = useState<ExerciseWithSets[]>([]);

    const isNewWorkout = !id;

    // Load workout if editing an existing one
    useEffect(() => {
        if (!id) return;

        setLoading(true);
        Promise.all([
            getWorkoutById(id),
            getWorkoutWithExercisesAndSets(id)
        ])
            .then(([workoutResult, exerciseResult]) => {
                setWorkout(workoutResult);
                setExerciseData(exerciseResult);
                //console.log(workoutResult);
                console.log(exerciseResult);
            })
            .catch((err) => {
                setError(err.message || 'Failed to load workout');
            })
            .finally(() => setLoading(false));
    }, [id]);

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
                setNumber: newSet.set_number, // ✅ fix naming
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
            // Optionally show toast or error state
        }
    };



    if (loading) {
        return (
            <View className="flex-1 justify-center items-center bg-surface_a0 pt-16">
                <Text className="text-white text-3xl font-bold">Loading workout...</Text>
            </View>
        );
    }

    return (
        <ScrollView className="flex-1 bg-surface_a0 pt-16 px-4">
            <Text className="text-primary_a0 font-bold text-3xl mb-4">
                {isNewWorkout ? 'New Workout' : name ?? 'Workout'}
            </Text>

            {!isNewWorkout && workout && (
                <>
                    <Text className="text-white mb-2">Workout ID: {id}</Text>

                    {exerciseData.map((exerciseItem) => (
                        <WorkoutExerciseListItem
                            key={exerciseItem.workoutExerciseId}
                            exerciseItem={exerciseItem}
                            onEditSet={(setId) => console.log('Edit set', setId)}
                            onDeleteSet={(setId) => console.log('Delete set', setId)}
                            onAddSet={handleAddSet}
                        />
                    ))}
                </>
            )}

            {isNewWorkout && (
                <>
                    <Text className="text-white">Start building your new workout here.</Text>
                    {/* Add button: Add Exercise → then Add Set → render SetListItem for each */}
                </>
            )}

            {error && <Text className="text-red-400 mt-4">{error}</Text>}
        </ScrollView>
    );
}

export default CreateWorkout;
