// hooks/useWorkoutLogic.ts
import { useState, useCallback, useContext } from 'react';
import { Alert } from 'react-native';
import { ExerciseWithSets, Workout } from '@/repositories/types';
import {
    getWorkoutById,
    getWorkoutWithExercisesAndSets,
    updateWorkoutById,
    softDeleteWorkoutById,
} from '@/repositories/workouts';
import {
    addSet,
    getHistoricalSetsForExercise,
    softDeleteSet,
    updateSet
} from '@/repositories/workoutExerciseSets';
import { reorderWorkoutExercises, softDeleteWorkoutExerciseById } from '@/repositories/workoutExercises';
import { UserContext } from '@/contexts/UserContext';
import { router } from "expo-router";

export function useWorkoutLogic(workoutId?: string, isReadOnly: boolean = false) {
    const { user } = useContext(UserContext) ?? {};
    const [workout, setWorkout] = useState<Workout | null>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [exerciseData, setExerciseData] = useState<ExerciseWithSets[]>([]);
    const [exerciseToDelete, setExerciseToDelete] = useState<ExerciseWithSets | null>(null);
    const [workoutNameInput, setWorkoutNameInput] = useState('');
    const [workoutDate, setWorkoutDate] = useState(new Date());
    const [exerciseHistoricalSets, setExerciseHistoricalSets] = useState<Record<string, Array<{ setNumber: number; reps: number; weight: number }>>>({});


    const loadWorkoutData = useCallback(async () => {
        if (!workoutId) return;

        setLoading(true);
        try {
            const [workoutResult, exerciseResult] = await Promise.all([
                getWorkoutById(workoutId),
                getWorkoutWithExercisesAndSets(workoutId)
            ]);
            setWorkout(workoutResult);
            setExerciseData(exerciseResult);
        } catch (err: any) {
            setError(err.message || 'Failed to load workout');
        } finally {
            setLoading(false);
        }
    }, [workoutId]);

    const loadHistoricalSetsForExercise = useCallback(async (exerciseId: string) => {
        // Check if we already loaded this exercise's history
        if (exerciseHistoricalSets[exerciseId]) {
            return exerciseHistoricalSets[exerciseId];
        }

        try {
            const historicalSets = await getHistoricalSetsForExercise(exerciseId, workout?.id);
            if (historicalSets) {
                setExerciseHistoricalSets(prev => ({
                    ...prev,
                    [exerciseId]: historicalSets
                }));
                return historicalSets;
            }
        } catch (error) {
            console.log('Could not load historical sets:', error);
        }
        return null;
    }, [exerciseHistoricalSets, workout?.id]);


    // Complete handleAddSet function for hooks/useWorkoutLogic.ts

    const handleAddSet = async (workoutExerciseId: string) => {
        if (isReadOnly) return;

        try {
            const exercise = exerciseData.find(
                (ex) => ex.workoutExerciseId === workoutExerciseId
            );

            if (!exercise) return;

            const currentSetCount = exercise.sets.length;
            const nextSetNumber = currentSetCount + 1;

            let defaultReps = 10;
            let defaultWeight = 0;

            // Load historical sets once (will use cache if already loaded)
            const historicalSets = await loadHistoricalSetsForExercise(exercise.exercise.id);

            if (historicalSets && historicalSets.length > 0) {
                const matchingSet = historicalSets.find(s => s.setNumber === nextSetNumber);

                if (matchingSet) {
                    defaultReps = matchingSet.reps ?? 10;
                    defaultWeight = matchingSet.weight ?? 0;
                } else if (currentSetCount > 0) {
                    const lastSet = exercise.sets[currentSetCount - 1];
                    defaultReps = lastSet.reps ?? 10;
                    defaultWeight = lastSet.weight ?? 0;
                } else {
                    defaultReps = historicalSets[0].reps ?? 10;
                    defaultWeight = historicalSets[0].weight ?? 0;
                }
            } else if (currentSetCount > 0) {
                const lastSet = exercise.sets[currentSetCount - 1];
                defaultReps = lastSet.reps ?? 10;
                defaultWeight = lastSet.weight ?? 0;
            }

            const newSet = await addSet(
                workoutExerciseId,
                { reps: defaultReps, weight: defaultWeight },
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

    const handleDeleteExercise = async () => {
        if (!exerciseToDelete || !workout?.id || isReadOnly) return;

        try {
            await softDeleteWorkoutExerciseById(exerciseToDelete.workoutExerciseId);
            await loadWorkoutData();

            const orderedIds = exerciseData
                .filter(ex => ex.workoutExerciseId !== exerciseToDelete.workoutExerciseId)
                .map(ex => ex.workoutExerciseId);

            await reorderWorkoutExercises(workout.id, orderedIds);
            await loadWorkoutData();
        } catch (err) {
            console.error('Failed to delete exercise:', err);
        } finally {
            setExerciseToDelete(null);
        }
    };

    const handleReorderExercises = async (reorderedData: ExerciseWithSets[]) => {
        if (isReadOnly || !workout?.id) return;

        const updatedData = reorderedData.map((item, idx) => ({
            ...item,
            orderIndex: idx + 1,
        }));

        setExerciseData(updatedData);

        try {
            await reorderWorkoutExercises(
                workout.id,
                updatedData.map((ex) => ex.workoutExerciseId)
            );
        } catch (error) {
            console.error('Failed to reorder exercises:', error);
        }
    };

    const handleFinishWorkout = async (name: string, date: Date) => {
        if (!workout || !user) return false;

        try {
            // Use the provided name parameter, with fallback to 'Completed Workout'
            await updateWorkoutById(workout.id, {
                name: name.trim() || 'Completed Workout',
                created_at: date.toISOString(),
            });
            return true;
        } catch (error) {
            console.error('Failed to finish workout:', error);
            Alert.alert('Error', 'Failed to save workout. Please try again.');
            return false;
        }
    };

    const handleDeleteWorkout = async () => {
        if (!workout?.id) return false;

        try {
            await softDeleteWorkoutById(workout.id);
            return true;
        } catch (err) {
            console.error('Failed to delete workout:', err);
            return false;
        }
    };

    const handleAddExercise = () => {
        router.push({
            pathname: '/exercise/addExercise',
            params: { workoutId: workout?.id },
        });
    };

    const finishWorkoutWithData = useCallback(
        async (name = workoutNameInput, date = workoutDate) => {
            const success = await handleFinishWorkout(name, date);
            if (success) {
                router.push({ pathname: '/logging' });
            }
            return success;
        },
        [handleFinishWorkout, workoutNameInput, workoutDate]
    );

    return {
        user,
        workout,
        loading,
        error,
        exerciseData,
        exerciseToDelete,
        setExerciseToDelete,
        workoutNameInput,
        setWorkoutNameInput,
        workoutDate,
        setWorkoutDate,
        loadWorkoutData,
        handleAddSet,
        handleDeleteSet,
        handleUpdateSet,
        handleDeleteExercise,
        handleReorderExercises,
        handleFinishWorkout,
        handleDeleteWorkout,
        handleAddExercise,
        finishWorkoutWithData,
        loadHistoricalSetsForExercise
    };
}