// hooks/useWorkoutCalendar.ts
import { useContext, useEffect, useState, useCallback } from 'react';
import { Workout } from '@/repositories/types';
import { getAllWorkouts } from '@/repositories/workouts';
import { UserContext } from '@/contexts/UserContext';

export const useWorkoutCalendar = () => {
    const { refreshTrigger } = useContext(UserContext) ?? {};
    const [selectedDate, setSelectedDate] = useState('');
    const [workouts, setWorkouts] = useState<Workout[]>([]);

    // Function to manually refresh workouts
    const refreshWorkouts = useCallback(async () => {
        const fetchedWorkouts = await getAllWorkouts();
        setWorkouts(fetchedWorkouts);
    }, []);

    // Refetch workouts when refreshTrigger changes
    useEffect(() => {
        refreshWorkouts();
    }, [refreshTrigger, refreshWorkouts]);

    const workoutDates: Record<string, boolean> = {};
    workouts.forEach((w) => {
        const date = w.created_at?.slice(0, 10);
        if (date) workoutDates[date] = true;
    });

    const markedDates: Record<string, any> = {};
    Object.keys(workoutDates).forEach((date) => {
        markedDates[date] = {
            dots: [{ key: 'workout', color: '#f95e3d' }],
        };
    });

    if (selectedDate) {
        const hasWorkout = markedDates[selectedDate]?.dots?.length > 0;
        markedDates[selectedDate] = {
            ...markedDates[selectedDate],
            selected: true,
            selectedColor: '#eb0202',
            selectedTextColor: 'white',
            ...(hasWorkout && { dots: markedDates[selectedDate].dots }),
        };
    }

    const displayedWorkouts = selectedDate
        ? workouts.filter((w) => w.created_at?.startsWith(selectedDate))
        : workouts;

    return {
        selectedDate,
        setSelectedDate,
        markedDates,
        displayedWorkouts,
        refreshWorkouts, // Export the refresh function
    };
};