import { useAuth } from '@/hooks/useAuth';
import { useWorkoutData } from '@/hooks/useWorkoutData';
import { useSetMutations } from '@/hooks/useSetMutations';
import { useWorkoutActions } from '@/hooks/useWorkoutActions';
import { useExerciseHistoryPanel } from '@/hooks/useExerciseHistoryPanel';

/**
 * Composes the focused workout-editing hooks into the single API the workout
 * screens consume. Behavior and return shape are unchanged; the concerns are
 * split across useWorkoutData / useSetMutations / useWorkoutActions /
 * useExerciseHistoryPanel.
 */
export function useWorkoutLogic(workoutId?: string, isReadOnly: boolean = false) {
    const { user } = useAuth();

    const {
        workout,
        loading,
        error,
        exerciseData,
        setExerciseData,
        exerciseMaxWeights,
        loadWorkoutData,
        loadHistoricalSetsForExercise,
    } = useWorkoutData(workoutId);

    const { handleAddSet, handleDeleteSet, handleUpdateSet } = useSetMutations({
        workoutId,
        isReadOnly,
        exerciseData,
        setExerciseData,
        loadWorkoutData,
        loadHistoricalSetsForExercise,
    });

    const {
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
    } = useWorkoutActions({
        isReadOnly,
        user,
        workout,
        exerciseData,
        setExerciseData,
        loadWorkoutData,
    });

    const {
        showExerciseHistory,
        selectedExerciseForHistory,
        handleViewExerciseHistory,
        handleCloseExerciseHistory,
    } = useExerciseHistoryPanel();

    return {
        user,
        workout,
        loading,
        error,
        exerciseData,
        exerciseToDelete,
        setExerciseToDelete,
        workoutNameInput,
        setWorkoutNameInput,
        workoutDate,
        setWorkoutDate,
        loadWorkoutData,
        handleAddSet,
        handleDeleteSet,
        handleUpdateSet,
        handleDeleteExercise,
        handleReorderExercises,
        handleFinishWorkout,
        handleDeleteWorkout,
        handleAddExercise,
        finishWorkoutWithData,
        loadHistoricalSetsForExercise,
        exerciseMaxWeights,
        showExerciseHistory,
        selectedExerciseForHistory,
        handleViewExerciseHistory,
        handleCloseExerciseHistory,
    };
}
