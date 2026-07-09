import { useRef } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import Toast from 'react-native-toast-message';
import { logger } from '@/utils/logger';
import { ExerciseWithSets } from '@/repositories/types';
import { addSet, checkAndMarkSetAsPR, softDeleteSet, updateSet } from '@/repositories/workoutExerciseSets';
import type { HistoricalSet } from '@/hooks/useWorkoutData';

interface UseSetMutationsParams {
    workoutId?: string;
    isReadOnly: boolean;
    exerciseData: ExerciseWithSets[];
    setExerciseData: Dispatch<SetStateAction<ExerciseWithSets[]>>;
    loadWorkoutData: () => Promise<void>;
    loadHistoricalSetsForExercise: (exerciseId: string) => Promise<HistoricalSet[] | null>;
}

/** Add / delete / update-with-debounce for sets, including PR detection + toast. */
export function useSetMutations({
    workoutId,
    isReadOnly,
    exerciseData,
    setExerciseData,
    loadWorkoutData,
    loadHistoricalSetsForExercise,
}: UseSetMutationsParams) {
    const updateTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

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

            await loadWorkoutData();
        } catch (err) {
            logger.error('Failed to add set:', err);
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
            logger.error('Failed to delete set:', err);
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

        // Capture current set values BEFORE debounce delay
        const currentExercise = exerciseData.find(ex => ex.workoutExerciseId === workoutExerciseId);
        const currentSet = currentExercise?.sets.find(s => s.id === setId);
        const wasAlreadyPr = currentSet?.isPr === 1;
        const previousWeight = currentSet?.weight ?? 0;
        const previousReps = currentSet?.reps ?? 0;

        updateTimers.current[setId] = setTimeout(async () => {
            try {
                const updatedSet = await updateSet(setId, updates, { returnData: true });
                if (!updatedSet || typeof updatedSet === 'boolean') return;

                if (updatedSet.weight && workoutId) {
                    const exercise = exerciseData.find(ex => ex.workoutExerciseId === workoutExerciseId);
                    if (exercise) {
                        const isNewPr = await checkAndMarkSetAsPR(
                            updatedSet.id,
                            exercise.exercise.id,
                            updatedSet.weight,
                            updatedSet.reps,
                        );

                        const valuesImproved = wasAlreadyPr && (
                            updatedSet.weight > previousWeight ||
                            (updatedSet.weight === previousWeight && updatedSet.reps > previousReps)
                        );

                        if (isNewPr || valuesImproved) {
                            Toast.show({
                                type: 'pr',
                                text1: 'New Personal Record! 🏆',
                                text2: `${updatedSet.weight}kg × ${updatedSet.reps} reps`,
                                visibilityTime: 2500,
                                position: 'top',
                            });
                        }
                    }
                }

                await loadWorkoutData();
            } catch (err) {
                logger.error('Failed to update set:', err);
            }
        }, 500);
    };

    return { handleAddSet, handleDeleteSet, handleUpdateSet };
}
