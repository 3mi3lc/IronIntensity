// app/workout/edit.tsx
import React, { useEffect, useState, useCallback } from 'react';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { WorkoutScreen } from '@/components/workoutScreen';
import FinishWorkoutModal from '@/components/finishWorkoutModal';
import ExerciseDeleteModal from '@/components/exerciseDeleteModal';
import DeleteWorkoutModal from '@/components/deleteWorkoutModal';
import { useWorkoutLogic } from '@/hooks/useWorkoutLogic';

function EditWorkout() {
    const { id, name } = useLocalSearchParams<{ id: string; name?: string }>();
    const router = useRouter();

    // Use the shared hook
    const {
        user,
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
        workoutNameInput,
        setWorkoutNameInput,
        workoutDate,
        setWorkoutDate,
        handleDeleteWorkout,
        handleAddExercise,
        finishWorkoutWithData,
        // Exercise history from hook
        showExerciseHistory,
        selectedExerciseForHistory,
        handleViewExerciseHistory,
        handleCloseExerciseHistory,
    } = useWorkoutLogic(id, false);

    const [finishModalVisible, setFinishModalVisible] = useState(false);
    const [deleteModalVisible, setDeleteModalVisible] = useState(false);

    useEffect(() => {
        if (id) {
            loadWorkoutData();
        }
    }, [id, loadWorkoutData]);

    useFocusEffect(
        useCallback(() => {
            if (id) {
                loadWorkoutData();
            }
        }, [id, loadWorkoutData])
    );

    useEffect(() => {
        if (workout?.name) {
            setWorkoutNameInput(workout.name);
        }
        if (workout?.created_at) {
            setWorkoutDate(new Date(workout.created_at));
        }
    }, [workout]);

    const handleBack = () => {
        router.back();
    };

    const confirmDeleteWorkout = async () => {
        setDeleteModalVisible(false);
        const success = await handleDeleteWorkout();
        if (success) {
            router.replace('/logging');
        }
    };

    return (
        <>
            <WorkoutScreen
                title={name || workout?.name || 'Edit Workout'}
                subtitle="In Progress"
                isReadOnly={false}
                loading={loading}
                error={error}
                exerciseData={exerciseData}
                workoutId={id}
                finishButtonText="Finish Editing"
                showFinishButton={exerciseData.length > 0}
                showAddButton={true}
                showDeleteButton={true}
                showArrow={true}
                onBack={handleBack}
                onDelete={() => setDeleteModalVisible(true)}
                onAddExercise={handleAddExercise}
                onFinishWorkout={() => setFinishModalVisible(true)}
                onDeleteExercise={setExerciseToDelete}
                onAddSet={handleAddSet}
                onDeleteSet={handleDeleteSet}
                onEditSet={handleUpdateSet}
                onReorderExercises={handleReorderExercises}
                onViewExerciseHistory={handleViewExerciseHistory}
                // Exercise history props - passed to WorkoutScreen
                userId={user?.id}
                showExerciseHistory={showExerciseHistory}
                selectedExerciseForHistory={selectedExerciseForHistory}
                onCloseExerciseHistory={handleCloseExerciseHistory}
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
                title="Finish Editing"
                buttonText="Complete Editing"
            />

            <ExerciseDeleteModal
                visible={!!exerciseToDelete}
                exerciseName={exerciseToDelete?.exercise.name ?? ""}
                onCancel={() => setExerciseToDelete(null)}
                onConfirm={handleDeleteExercise}
            />

            <DeleteWorkoutModal
                visible={deleteModalVisible}
                workoutName={workout?.name || name || 'this workout'}
                onClose={() => setDeleteModalVisible(false)}
                onConfirm={confirmDeleteWorkout}
            />
        </>
    );
}

export default EditWorkout;