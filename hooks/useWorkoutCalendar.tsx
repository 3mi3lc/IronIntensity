// hooks/useWorkoutCalendar.ts
import { useState, useCallback } from 'react';
import { Workout } from '@/repositories/types';
import { getAllWorkouts } from '@/repositories/workouts';
import { useFocusEffect } from 'expo-router';

export const useWorkoutCalendar = () => {
    const [selectedDate, setSelectedDate] = useState('');
    const [workouts, setWorkouts] = useState<Workout[]>([]);

    const reloadCalendarData = useCallback(async () => {
        try {
            const allWorkouts = await getAllWorkouts();
            setWorkouts(allWorkouts.reverse());
        } catch (err) {
            console.error('Failed to load workouts', err);
        }
    }, []);

    // Refresh when navigating back to this screen
    useFocusEffect(
        useCallback(() => {
            reloadCalendarData();
        }, [reloadCalendarData])
    );

    /** --- Build marked dates --- **/
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

    /** ----- Filter workouts for selected day ----- **/
    const displayedWorkouts = selectedDate
        ? workouts.filter((w) => w.created_at?.startsWith(selectedDate))
        : workouts;

    return {
        selectedDate,
        setSelectedDate,
        markedDates,
        displayedWorkouts,
        reloadCalendarData,
    };
};
