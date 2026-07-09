import { useState, useCallback } from 'react';
import { logger } from '@/utils/logger';
import { ExerciseWithSets, Workout } from '@/repositories/types';
import { getWorkoutById, getWorkoutWithExercisesAndSets } from '@/repositories/workouts';
import { getHistoricalSetsForExercise, getMaxWeightsByRepsForExercise } from '@/repositories/workoutExerciseSets';

export type HistoricalSet = { setNumber: number; reps: number; weight: number };
export type HistoricalSetsByExercise = Record<string, HistoricalSet[]>;

/**
 * Owns everything about loading a workout's data: the workout, its exercises and
 * sets, per-exercise historical max weights, and lazily-loaded historical sets.
 * Mutations elsewhere refresh via loadWorkoutData / mutate via setExerciseData.
 */
export function useWorkoutData(workoutId?: string) {
    const [workout, setWorkout] = useState<Workout | null>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [exerciseData, setExerciseData] = useState<ExerciseWithSets[]>([]);
    const [exerciseMaxWeights, setExerciseMaxWeights] = useState<Record<string, Record<number, number>>>({});
    const [exerciseHistoricalSets, setExerciseHistoricalSets] = useState<HistoricalSetsByExercise>({});

    const loadWorkoutData = useCallback(async () => {
        if (!workoutId) return;

        setLoading(true);
        try {
            const [workoutResult, exerciseResult] = await Promise.all([
                getWorkoutById(workoutId),
                getWorkoutWithExercisesAndSets(workoutId),
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
        } catch (err) {
            setError((err instanceof Error && err.message) || 'Failed to load workout');
        } finally {
            setLoading(false);
        }
    }, [workoutId]);

    const loadHistoricalSetsForExercise = useCallback(async (exerciseId: string): Promise<HistoricalSet[] | null> => {
        if (exerciseHistoricalSets[exerciseId]) {
            return exerciseHistoricalSets[exerciseId];
        }

        try {
            const historicalSets = await getHistoricalSetsForExercise(exerciseId, workout?.id);
            if (historicalSets) {
                setExerciseHistoricalSets(prev => ({
                    ...prev,
                    [exerciseId]: historicalSets,
                }));
                return historicalSets;
            }
        } catch (error) {
            logger.debug('Could not load historical sets:', error);
        }
        return null;
    }, [exerciseHistoricalSets, workout?.id]);

    return {
        workout,
        loading,
        error,
        exerciseData,
        setExerciseData,
        exerciseMaxWeights,
        loadWorkoutData,
        loadHistoricalSetsForExercise,
    };
}
