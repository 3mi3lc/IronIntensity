import { useState, useCallback } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { Alert } from 'react-native';
import { router } from 'expo-router';
import Toast from 'react-native-toast-message';
import { logger } from '@/utils/logger';
import { ExerciseWithSets, Workout } from '@/repositories/types';
import { updateWorkoutById, softDeleteWorkoutById, updateWorkoutTimestamps } from '@/repositories/workouts';
import { markPRsForWorkout } from '@/repositories/workoutExerciseSets';
import { reorderWorkoutExercises, softDeleteWorkoutExerciseById } from '@/repositories/workoutExercises';
import { checkAchievements } from '@/repositories/achievements';
import { getTotalVolume, getTotalWorkouts, getWorkoutStreak } from '@/repositories/statistics';

interface UseWorkoutActionsParams {
    isReadOnly: boolean;
    user: { id: string } | null | undefined;
    workout: Workout | null;
    exerciseData: ExerciseWithSets[];
    setExerciseData: Dispatch<SetStateAction<ExerciseWithSets[]>>;
    loadWorkoutData: () => Promise<void>;
}

/**
 * Workout-level actions: delete/reorder exercises, finish (with achievement +
 * PR side-effects), delete, and navigation. Also owns the edit-form state
 * (name, date) and the pending-delete exercise.
 */
export function useWorkoutActions({
    isReadOnly,
    user,
    workout,
    exerciseData,
    setExerciseData,
    loadWorkoutData,
}: UseWorkoutActionsParams) {
    const [exerciseToDelete, setExerciseToDelete] = useState<ExerciseWithSets | null>(null);
    const [workoutNameInput, setWorkoutNameInput] = useState('');
    const [workoutDate, setWorkoutDate] = useState(new Date());

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
            logger.error('Failed to delete exercise:', err);
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
            logger.error('Failed to reorder exercises:', error);
        }
    };

    const handleFinishWorkout = async (name: string, date: Date) => {
        if (!workout || !user) return false;

        try {
            const newWorkoutDate = date.toISOString();
            const updates: Record<string, string> = {
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
            logger.error('Failed to finish workout:', error);
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
            logger.error('Failed to delete workout:', err);
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
            if (!workout || !user) return false;

            try {
                // Capture stats BEFORE any DB writes
                const allTime = { startDate: '2000-01-01', endDate: new Date().toISOString() };
                const [prevVolume, prevWorkoutCount, { current: prevStreak }] = await Promise.all([
                    getTotalVolume(user.id, allTime.startDate, allTime.endDate),
                    getTotalWorkouts(user.id, allTime.startDate, allTime.endDate),
                    getWorkoutStreak(user.id),
                ]);

                const success = await handleFinishWorkout(name, date);

                if (success) {
                    // Navigate immediately
                    router.push({ pathname: '/logging' });

                    setTimeout(async () => {
                        const { current: newStreak, longest: newLongest } = await getWorkoutStreak(user.id);
                        const newlyUnlocked = await checkAchievements(
                            user.id,
                            newStreak,
                            prevWorkoutCount,
                            prevVolume,
                            prevStreak,
                            newLongest,
                        );

                        // Show one toast per achievement, staggered
                        newlyUnlocked.forEach((achievement, index) => {
                            setTimeout(() => {
                                Toast.show({
                                    type: 'achievement',
                                    text1: achievement.title,
                                    text2: achievement.icon,
                                    visibilityTime: 3000,
                                    position: 'top',
                                });
                            }, index * 3500);
                        });
                    }, 500);
                }

                return success;
            } catch (error) {
                logger.error('Failed to finish workout:', error);
                return false;
            }
        },
        [handleFinishWorkout, workoutNameInput, workoutDate, user]
    );

    return {
        exerciseToDelete,
        setExerciseToDelete,
        workoutNameInput,
        setWorkoutNameInput,
        workoutDate,
        setWorkoutDate,
        handleDeleteExercise,
        handleReorderExercises,
        handleFinishWorkout,
        handleDeleteWorkout,
        handleAddExercise,
        finishWorkoutWithData,
    };
}
