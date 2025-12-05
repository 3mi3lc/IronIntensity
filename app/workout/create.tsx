// app/workout/create.tsx
import React, { useEffect, useState, useCallback, useContext } from 'react';
import { useRouter, useFocusEffect } from 'expo-router';
import { Alert } from 'react-native';
import { WorkoutScreen } from '@/components/workoutScreen';
import FinishWorkoutModal from '@/components/finishWorkoutModal';
import CancelWorkoutModal from '@/components/cancelWorkoutModal';
import ExerciseDeleteModal from '@/components/exerciseDeleteModal';
import { UserContext } from '@/contexts/UserContext';
import { createWorkout } from '@/repositories/workouts';
import { useWorkoutLogic } from '@/hooks/useWorkoutLogic';

function CreateWorkout() {
    const router = useRouter();
    const { user, triggerRefresh } = useContext(UserContext) ?? {};
    const [workoutId, setWorkoutId] = useState<string | undefined>();
    const [isCreating, setIsCreating] = useState(false);

    // Use the shared hook
    const {
        workout,
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
        handleFinishWorkout,
        handleDeleteWorkout,
        handleAddExercise
    } = useWorkoutLogic(workoutId, false);

    const [finishModalVisible, setFinishModalVisible] = useState(false);
    const [cancelModalVisible, setCancelModalVisible] = useState(false);
    const [workoutNameInput, setWorkoutNameInput] = useState('');
    const [workoutDate, setWorkoutDate] = useState(new Date());

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

    const finishWorkoutWithData = async () => {
        const success = await handleFinishWorkout(workoutNameInput, workoutDate);
        if (success) {
            triggerRefresh?.();
            router.push({ pathname: '/' });
        }
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