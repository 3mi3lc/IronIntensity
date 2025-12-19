// app/workout/view.tsx
import React, { useEffect } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { WorkoutScreen } from '@/components/workoutScreen';
import { useWorkoutLogic } from '@/hooks/useWorkoutLogic';
import {useAuth} from "@/hooks/useAuth";

function ViewWorkout() {
    const { id, name } = useLocalSearchParams<{ id: string; name?: string }>();
    const router = useRouter();
    const { user } = useAuth();

    const {
        workout,
        loading,
        error,
        exerciseData,
        loadWorkoutData,
        showExerciseHistory,
        selectedExerciseForHistory,
        handleViewExerciseHistory,
        handleCloseExerciseHistory,
    } = useWorkoutLogic(id, true); // isReadOnly = true

    useEffect(() => {
        if (id) {
            loadWorkoutData();
        }
    }, [id]);

    const handleBack = () => {
        router.back();
    };

    return (
        <WorkoutScreen
            title={name || workout?.name || 'Workout Details'}
            subtitle="Completed"
            isReadOnly={true}
            loading={loading}
            error={error}
            exerciseData={exerciseData}
            showArrow={true}
            workoutId={id}
            showFinishButton={false}
            showAddButton={false}
            onBack={handleBack}
            showExerciseHistory={showExerciseHistory}
            selectedExerciseForHistory={selectedExerciseForHistory}
            onCloseExerciseHistory={handleCloseExerciseHistory}
            onViewExerciseHistory={handleViewExerciseHistory}
            userId={user?.id}
        />
    );
}

export default ViewWorkout;