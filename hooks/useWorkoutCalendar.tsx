// hooks/useWorkoutCalendar.ts
import {useState, useCallback, useContext} from 'react';
import { Workout } from '@/repositories/types';
import {getAllWorkouts, getWorkoutsByDate, getWorkoutsForCalendar} from '@/repositories/workouts';
import { useFocusEffect } from 'expo-router';
import {UserContext} from "@/contexts/UserContext";

export const useWorkoutCalendar = () => {
    const [selectedDate, setSelectedDate] = useState('');
    const [workouts, setWorkouts] = useState<Workout[]>([]);
    const { user } = useContext(UserContext)!;   // <-- grab user
    const userId = user?.id;                     // string | undefined


    const reloadCalendarData = useCallback(async () => {
        if (!userId) return;                       // guard while logging out
        try {
            const all = selectedDate
                ? await getWorkoutsByDate(userId, selectedDate)
                : await getWorkoutsForCalendar(userId);
            setWorkouts(all);
        } catch (err) {
            console.error(err);
        }
    }, [userId, selectedDate]);

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
