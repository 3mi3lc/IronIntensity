import { useState, useCallback } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { Alert } from '@/utils/themedAlert';
import { router } from 'expo-router';
import Toast from 'react-native-toast-message';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from '@/utils/logger';
import { ExerciseWithSets, Workout } from '@/repositories/types';
import { updateWorkoutById, softDeleteWorkoutById, updateWorkoutTimestamps } from '@/repositories/workouts';
import { markPRsForWorkout, getPRsForWorkout, getWorkoutSummary } from '@/repositories/workoutExerciseSets';
import { reorderWorkoutExercises, softDeleteWorkoutExerciseById } from '@/repositories/workoutExercises';
import { syncUnlockedAchievements } from '@/repositories/achievements';
import { getWorkoutStreak, getTotalWorkouts, getVolumeByMonth } from '@/repositories/statistics';
import { pickFinishReward } from '@/utils/rewardEngine';
import { buildActivityEvents, type BadgeUnlock } from '@/utils/activityEvents';
import { queueActivity } from '@/repositories/pendingActivity';
import { getLatestBodyweight } from '@/repositories/bodyWeightEntries';
import { Confetti } from '@/components/confettiOverlay';

const EPOCH_START = '1970-01-01T00:00:00.000Z';
const FAR_FUTURE = '2999-12-31T23:59:59.999Z';
const LAST_CONFETTI_KEY = 'finishReward.prevFinishHadConfetti';

/**
 * Roll the variable finish reward and, if anything pays out, show its toast and
 * (occasionally) fire confetti. Reads/writes a small cooldown flag so confetti
 * never fires two finishes in a row. Best-effort: any failure is swallowed so it
 * can never block the finish flow.
 */
async function maybeShowFinishReward(params: {
    userId: string;
    workoutId: string;
    workoutDate: Date;
    newStreak: number;
    newBadgeCount: number;
}): Promise<void> {
    const { userId, workoutId, workoutDate, newStreak, newBadgeCount } = params;

    try {
        const [prs, totalWorkouts, monthly, prevFlag] = await Promise.all([
            getPRsForWorkout(workoutId),
            getTotalWorkouts(userId, EPOCH_START, FAR_FUTURE),
            getVolumeByMonth(userId, EPOCH_START, FAR_FUTURE),
            AsyncStorage.getItem(LAST_CONFETTI_KEY),
        ]);

        // "Best month yet" = this workout's calendar month is uniquely the
        // highest-volume month, and there is more than one month of history.
        const monthKey = workoutDate.toISOString().slice(0, 7);
        const currentMonth = monthly.find(m => m.date === monthKey);
        const maxOtherMonth = monthly
            .filter(m => m.date !== monthKey)
            .reduce((max, m) => Math.max(max, m.volume), 0);
        const isBestVolumeMonth =
            monthly.length >= 2 && !!currentMonth && currentMonth.volume > maxOtherMonth;

        const reward = pickFinishReward({
            prCount: prs.length,
            bestPr: prs[0] ?? null,
            newBadgeCount,
            currentStreak: newStreak,
            totalWorkouts,
            isBestVolumeMonth,
            prevFinishHadConfetti: prevFlag === '1',
        });

        if (!reward) {
            await AsyncStorage.setItem(LAST_CONFETTI_KEY, '0');
            return;
        }

        // Let any achievement toasts land first (they occupy the top slot).
        setTimeout(() => {
            Toast.show({
                type: reward.toastType,
                text1: reward.text1,
                text2: reward.text2,
                visibilityTime: 3000,
                position: 'top',
            });
        }, newBadgeCount * 3500);

        if (reward.confetti) {
            setTimeout(() => Confetti.fire(), newBadgeCount * 3500 + 150);
        }

        await AsyncStorage.setItem(LAST_CONFETTI_KEY, reward.confetti ? '1' : '0');
    } catch (error) {
        logger.error('Failed to show finish reward:', error);
    }
}

/**
 * Queue this finished workout's community feed events (workout summary, PRs,
 * streak milestone, new badges) for the emit_activity RPC on next sync. Purely
 * additive and best-effort: any failure is swallowed so it can never affect the
 * finish flow, and a user in no communities simply queues events that emit into
 * nothing.
 */
async function queueFinishActivity(params: {
    userId: string;
    workoutId: string;
    workoutName: string;
    currentStreak: number;
    newBadges: BadgeUnlock[];
}): Promise<void> {
    const { userId, workoutId, workoutName, currentStreak, newBadges } = params;

    try {
        const [prs, summary, bodyweightKg] = await Promise.all([
            getPRsForWorkout(workoutId),
            getWorkoutSummary(workoutId),
            getLatestBodyweight(userId),
        ]);

        const events = buildActivityEvents({
            summary: { workoutName, ...summary },
            prCount: prs.length,
            bestPr: prs[0] ?? null,
            currentStreak,
            newBadges,
            bodyweightKg,
        });

        await queueActivity(events);
    } catch (error) {
        logger.error('Failed to queue finish activity:', error);
    }
}

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
                const success = await handleFinishWorkout(name, date);

                if (success) {
                    // Navigate immediately
                    router.push({ pathname: '/logging' });

                    setTimeout(async () => {
                        // Persist any newly-earned achievements and toast them.
                        const { current: newStreak, longest: newLongest } = await getWorkoutStreak(user.id);
                        const newlyUnlocked = await syncUnlockedAchievements(user.id, newStreak, newLongest);

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

                        // Variable reward for the finish moment. Runs after
                        // achievements so it can defer to them when a badge unlocks.
                        await maybeShowFinishReward({
                            userId: user.id,
                            workoutId: workout.id,
                            workoutDate: date,
                            newStreak,
                            newBadgeCount: newlyUnlocked.length,
                        });

                        // Queue community feed events for this finish (emitted on
                        // next sync). Best-effort; never blocks the finish flow.
                        await queueFinishActivity({
                            userId: user.id,
                            workoutId: workout.id,
                            workoutName: name.trim() || 'Completed Workout',
                            currentStreak: newStreak,
                            newBadges: newlyUnlocked.map(a => ({
                                id: a.id,
                                title: a.title,
                                icon: a.icon,
                            })),
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
