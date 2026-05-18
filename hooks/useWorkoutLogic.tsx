// hooks/useWorkoutLogic.ts
import {useState, useCallback, useRef} from 'react';
import { Alert } from 'react-native';
import { ExerciseWithSets, Workout } from '@/repositories/types';
import {
    getWorkoutById,
    getWorkoutWithExercisesAndSets,
    updateWorkoutById,
    softDeleteWorkoutById, updateWorkoutTimestamps,
} from '@/repositories/workouts';
import {
    addSet,
    checkAndMarkSetAsPR,
    getHistoricalSetsForExercise,
    getMaxWeightsByRepsForExercise,
    markPRsForWorkout,
    softDeleteSet,
    updateSet
} from '@/repositories/workoutExerciseSets';
import { reorderWorkoutExercises, softDeleteWorkoutExerciseById } from '@/repositories/workoutExercises';
import { router } from "expo-router";
import {useAuth} from "@/hooks/useAuth";

export function useWorkoutLogic(workoutId?: string, isReadOnly: boolean = false) {
    const { user } = useAuth();
    const [workout, setWorkout] = useState<Workout | null>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [exerciseData, setExerciseData] = useState<ExerciseWithSets[]>([]);
    const [exerciseToDelete, setExerciseToDelete] = useState<ExerciseWithSets | null>(null);
    const [workoutNameInput, setWorkoutNameInput] = useState('');
    const [workoutDate, setWorkoutDate] = useState(new Date());
    const [exerciseHistoricalSets, setExerciseHistoricalSets] = useState<Record<string, Array<{ setNumber: number; reps: number; weight: number }>>>({});
    const [exerciseMaxWeights, setExerciseMaxWeights] = useState<Record<string, Record<number, number>>>({});
    const updateTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

    const [prToast, setPrToast] = useState<{ visible: boolean; weight: number; reps: number }>({
        visible: false,
        weight: 0,
        reps: 0,
    });


    // Exercise history state
    const [showExerciseHistory, setShowExerciseHistory] = useState(false);
    const [selectedExerciseForHistory, setSelectedExerciseForHistory] = useState<{
        id: string;
        name: string;
    } | null>(null);

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

            const maxWeights: Record<string, Record<number, number>> = {};
            await Promise.all(
                exerciseResult.map(async (ex) => {
                    maxWeights[ex.exercise.id] = await getMaxWeightsByRepsForExercise(ex.exercise.id, workoutId);
                })
            );
            setExerciseMaxWeights(maxWeights);
        } catch (err: any) {
            setError(err.message || 'Failed to load workout');
        } finally {
            setLoading(false);
        }
    }, [workoutId]);

    const loadHistoricalSetsForExercise = useCallback(async (exerciseId: string) => {
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

    const handleViewExerciseHistory = useCallback((exerciseId: string, exerciseName: string) => {
        setSelectedExerciseForHistory({ id: exerciseId, name: exerciseName });
        setShowExerciseHistory(true);
    }, []);

    const handleCloseExerciseHistory = useCallback(() => {
        setShowExerciseHistory(false);
        setSelectedExerciseForHistory(null);
    }, []);

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

            // Reload to get updated isPr flags
            await loadWorkoutData();
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

        if (updateTimers.current[setId]) {
            clearTimeout(updateTimers.current[setId]);
        }

        updateTimers.current[setId] = setTimeout(async () => {
            try {
                const updatedSet = await updateSet(setId, updates, { returnData: true });
                if (!updatedSet || typeof updatedSet === 'boolean') return;

                if (updatedSet.weight && workoutId) {
                    const exercise = exerciseData.find(ex => ex.workoutExerciseId === workoutExerciseId);
                    if (exercise) {
                        const newlyPR = await checkAndMarkSetAsPR(
                            updatedSet.id,
                            exercise.exercise.id,
                            updatedSet.weight,
                            updatedSet.reps,
                            workoutId
                        );

                        if (newlyPR) {
                            setPrToast({ visible: true, weight: updatedSet.weight, reps: updatedSet.reps });
                        }
                    }
                }

                await loadWorkoutData();
            } catch (err) {
                console.error('Failed to update set:', err);
            }
        }, 500);
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
            const newWorkoutDate = date.toISOString();

            const updates: Record<string, any> = {
                name: name.trim() || 'Completed Workout',
                created_at: newWorkoutDate,
            };

            if (workout.completed_at && workout.created_at) {
                const originalCreatedAt = new Date(workout.created_at);
                const originalCompletedAt = new Date(workout.completed_at);
                const timeDifferenceMs = originalCompletedAt.getTime() - originalCreatedAt.getTime();

                const newCompletedAt = new Date(date.getTime() + timeDifferenceMs);
                updates.completed_at = newCompletedAt.toISOString();

                const dateShiftMs = date.getTime() - originalCreatedAt.getTime();
                await updateWorkoutTimestamps(workout.id, dateShiftMs);
            } else {
                updates.completed_at = new Date().toISOString();
            }

            await updateWorkoutById(workout.id, updates);
            await markPRsForWorkout(workout.id);
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
        loadHistoricalSetsForExercise,
        exerciseMaxWeights,
        showExerciseHistory,
        selectedExerciseForHistory,
        handleViewExerciseHistory,
        handleCloseExerciseHistory,
        prToast,
        hidePrToast: () => setPrToast(prev => ({ ...prev, visible: false })),
    };
}