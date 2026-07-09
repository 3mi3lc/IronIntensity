import {useEffect, useState, useCallback, useRef} from 'react';
import { logger } from '@/utils/logger';
import { router } from 'expo-router';
import { db } from '@/db/client';
import { workouts } from '@/db/schema';
import { and, isNull, eq } from 'drizzle-orm';
import { updateWorkoutById, softDeleteWorkoutById } from '@/repositories/workouts';
import { markPRsForWorkout } from '@/repositories/workoutExerciseSets';
import { Workout } from '@/repositories/types';

export function useUnfinishedWorkoutCheck(userId: string | null | undefined) {
    const [unfinishedWorkout, setUnfinishedWorkout] = useState<Workout | null>(null);
    const [modalVisible, setModalVisible] = useState(false);
    const hasChecked = useRef(false); // only check once

    const checkForUnfinishedWorkouts = useCallback(async () => {
        if (!userId) return;
        try {
            const unfinished = await db
                .select()
                .from(workouts)
                .where(
                    and(
                        eq(workouts.user_id, userId),
                        isNull(workouts.completed_at),
                        isNull(workouts.deleted_at)
                    )
                );

            if (unfinished.length === 0) {
                setUnfinishedWorkout(null);
                setModalVisible(false);
                return;
            }

            setUnfinishedWorkout(unfinished[0] as Workout);
            setModalVisible(true);
        } catch (err) {
            logger.error('Failed to check for unfinished workouts:', err);
        }
    }, [userId]);

    // Run once when user becomes available
    useEffect(() => {
        if (userId && !hasChecked.current) {
            hasChecked.current = true;
            checkForUnfinishedWorkouts();
        }

        if (!userId) {
            hasChecked.current = false; // reset on logout
        }
    }, [userId, checkForUnfinishedWorkouts]);

    const handleContinue = () => {
        if (!unfinishedWorkout) return;
        setModalVisible(false);
        router.push({
            pathname: '/workout/edit',
            params: {
                id: unfinishedWorkout.id,
                name: unfinishedWorkout.name,
            },
        });
    };

    const handleSave = async () => {
        if (!unfinishedWorkout) return;
        setModalVisible(false);
        try {
            await updateWorkoutById(unfinishedWorkout.id, {
                completed_at: unfinishedWorkout.created_at!,
            });
            await markPRsForWorkout(unfinishedWorkout.id);
        } catch (err) {
            logger.error('Failed to save workout:', err);
        }
        checkForUnfinishedWorkouts(); // check for more
    };

    const handleDiscard = async () => {
        if (!unfinishedWorkout) return;
        setModalVisible(false);
        try {
            await softDeleteWorkoutById(unfinishedWorkout.id);
        } catch (err) {
            logger.error('Failed to discard workout:', err);
        }
        checkForUnfinishedWorkouts(); // check for more
    };

    return {
        unfinishedWorkout,
        modalVisible,
        handleContinue,
        handleSave,
        handleDiscard,
    };
}
