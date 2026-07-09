import { useState, useCallback } from 'react';

/** Self-contained UI state for the exercise-history panel overlay. */
export function useExerciseHistoryPanel() {
    const [showExerciseHistory, setShowExerciseHistory] = useState(false);
    const [selectedExerciseForHistory, setSelectedExerciseForHistory] = useState<{
        id: string;
        name: string;
    } | null>(null);

    const handleViewExerciseHistory = useCallback((exerciseId: string, exerciseName: string) => {
        setSelectedExerciseForHistory({ id: exerciseId, name: exerciseName });
        setShowExerciseHistory(true);
    }, []);

    const handleCloseExerciseHistory = useCallback(() => {
        setShowExerciseHistory(false);
        setSelectedExerciseForHistory(null);
    }, []);

    return {
        showExerciseHistory,
        selectedExerciseForHistory,
        handleViewExerciseHistory,
        handleCloseExerciseHistory,
    };
}
