// app/workout/performAgain.tsx
import React, { useEffect, useState, useCallback } from 'react';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { Alert } from 'react-native';
import { WorkoutScreen } from '@/components/workoutScreen';
import FinishWorkoutModal from '@/components/finishWorkoutModal';
import CancelWorkoutModal from '@/components/cancelWorkoutModal';
import ExerciseDeleteModal from '@/components/exerciseDeleteModal';
import { duplicateWorkout } from '@/repositories/workouts';
import { useWorkoutLogic } from '@/hooks/useWorkoutLogic';
import {useAuth} from "@/hooks/useAuth";

function PerformAgainWorkout() {
    const { id, name } = useLocalSearchParams<{ id: string; name?: string }>();
    const router = useRouter();
    const { user  } = useAuth();
    const [workoutId, setWorkoutId] = useState<string | undefined>();
    const [isDuplicating, setIsDuplicating] = useState(false);

    // Use the shared hook
    const {
        workout,
        workoutNameInput,
        workoutDate,
        setWorkoutNameInput,
        setWorkoutDate,
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
        handleDeleteWorkout,
        handleAddExercise,
        finishWorkoutWithData,
        exerciseMaxWeights,
        showExerciseHistory,
        selectedExerciseForHistory,
        handleViewExerciseHistory,
        handleCloseExerciseHistory,
        prToast,
        hidePrToast,
    } = useWorkoutLogic(workoutId, false);

    const [finishModalVisible, setFinishModalVisible] = useState(false);
    const [cancelModalVisible, setCancelModalVisible] = useState(false);

    // Duplicate workout on mount
    useEffect(() => {
        if (!workoutId && id && user && !isDuplicating) {
            handleDuplicateWorkout();
        }
    }, [id, user, workoutId, isDuplicating]);

    useEffect(() => {
        if (workout?.name) {
            setWorkoutNameInput(workout.name);
        }
    }, [workout?.name]);

    // Reload data when screen is focused
    useFocusEffect(
        useCallback(() => {
            if (workoutId) {
                loadWorkoutData();
            }
        }, [workoutId, loadWorkoutData])
    );

    const handleDuplicateWorkout = async () => {
        if (!user || !id) {
            Alert.alert('Error', 'Unable to start workout');
            router.back();
            return;
        }

        setIsDuplicating(true);
        try {
            const newWorkout = await duplicateWorkout(id, user.id, { returnData: true });

            if (!newWorkout || typeof newWorkout === 'boolean') {
                throw new Error('Failed to duplicate workout');
            }

            console.log('Workout duplicated:', newWorkout.id);
            setWorkoutId(newWorkout.id);
        } catch (err) {
            console.error('Failed to duplicate workout:', err);
            Alert.alert('Error', 'Failed to start workout. Please try again.');
            router.back();
        } finally {
            setIsDuplicating(false);
        }
    };

    const handleBack = () => {
        setCancelModalVisible(true);
    };


    const confirmCancelWorkout = async () => {
        setCancelModalVisible(false);
        await handleDeleteWorkout();
        router.back();
    };

    return (
        <>
            <WorkoutScreen
                title={name || 'Starting Workout'}
                isReadOnly={false}
                loading={loading || isDuplicating}
                error={error}
                exerciseData={exerciseData}
                workoutId={workoutId}
                showFinishButton={exerciseData.length > 0}
                showAddButton={true}
                showDeleteButton={false}
                onBack={handleBack}
                onAddExercise={handleAddExercise}
                onFinishWorkout={() => setFinishModalVisible(true)}
                onDeleteExercise={setExerciseToDelete}
                onAddSet={handleAddSet}
                onDeleteSet={handleDeleteSet}
                onEditSet={handleUpdateSet}
                onReorderExercises={handleReorderExercises}
                userId={user?.id}
                showExerciseHistory={showExerciseHistory}
                selectedExerciseForHistory={selectedExerciseForHistory}
                onCloseExerciseHistory={handleCloseExerciseHistory}
                onViewExerciseHistory={handleViewExerciseHistory}
                exerciseMaxWeights={exerciseMaxWeights}
                prToast={prToast}
                onHidePrToast={hidePrToast}
            />

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

export default PerformAgainWorkout;