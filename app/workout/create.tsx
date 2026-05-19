// app/workout/create.tsx
import React, { useEffect, useState, useCallback } from 'react';
import { useRouter, useFocusEffect } from 'expo-router';
import { Alert } from 'react-native';
import { WorkoutScreen } from '@/components/workoutScreen';
import FinishWorkoutModal from '@/components/finishWorkoutModal';
import CancelWorkoutModal from '@/components/cancelWorkoutModal';
import ExerciseDeleteModal from '@/components/exerciseDeleteModal';
import { createWorkout } from '@/repositories/workouts';
import { useWorkoutLogic } from '@/hooks/useWorkoutLogic';
import {useAuth} from "@/hooks/useAuth";

function CreateWorkout() {
    const router = useRouter();
    const { user } = useAuth();
    const [workoutId, setWorkoutId] = useState<string | undefined>();
    const [isCreating, setIsCreating] = useState(false);

    // Use the shared hook
    const {
        loading,
        error,
        exerciseData,
        exerciseToDelete,
        setExerciseToDelete,
        loadWorkoutData,
        workoutNameInput,
        setWorkoutNameInput,
        workoutDate,
        setWorkoutDate,
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
    } = useWorkoutLogic(workoutId, false);

    const [finishModalVisible, setFinishModalVisible] = useState(false);
    const [cancelModalVisible, setCancelModalVisible] = useState(false);

    // Create workout on mount
    useEffect(() => {
        if (!workoutId && user && !isCreating) {
            handleCreateWorkout();
        }
    }, [user, workoutId, isCreating]);

    // Reload data when screen is focused
    useFocusEffect(
        useCallback(() => {
            if (workoutId) {
                loadWorkoutData();
            }
        }, [workoutId, loadWorkoutData])
    );

    const handleCreateWorkout = async () => {
        if (!user) {
            Alert.alert('Error', 'You must be logged in to create a workout');
            router.back();
            return;
        }

        setIsCreating(true);
        try {
            const newWorkout = await createWorkout(
                { name: 'Workout in Progress', user_id: user.id },
                { returnData: true }
            );

            if (!newWorkout || typeof newWorkout === 'boolean') {
                throw new Error('Failed to create workout');
            }

            setWorkoutId(newWorkout.id);
        } catch (err) {
            console.error('Failed to create workout:', err);
            Alert.alert('Error', 'Failed to create workout');
            router.back();
        } finally {
            setIsCreating(false);
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
                title="New Workout"
                isReadOnly={false}
                loading={loading || isCreating}
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

export default CreateWorkout;