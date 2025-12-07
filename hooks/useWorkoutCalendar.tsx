// hooks/useWorkoutCalendar.ts
import { useState, useCallback,  useMemo } from 'react';
import { Workout } from '@/repositories/types';
import { getWorkoutsForCalendar } from '@/repositories/workouts';
import { useFocusEffect } from 'expo-router';
import {useAuth} from "@/hooks/useAuth";

export const useWorkoutCalendar = () => {
    const [selectedDate, setSelectedDate] = useState('');
    const [workouts, setWorkouts] = useState<Workout[]>([]);
    const { user } = useAuth();
    const userId = user?.id;

    const reloadCalendarData = useCallback(async () => {
        if (!userId) return;

        try {
            // Always load ALL workouts for calendar markers
            const all = await getWorkoutsForCalendar(userId);
            setWorkouts(all);
        } catch (err) {
            console.error('Failed to load workouts:', err);
        }
    }, [userId]); // Removed selectedDate from dependencies

    // Refresh when navigating back to this screen
    useFocusEffect(
        useCallback(() => {
            reloadCalendarData();
        }, [reloadCalendarData])
    );

    // Build marked dates - memoized for performance
    const markedDates = useMemo(() => {
        const dates: Record<string, any> = {};

        // Add dots for all workout dates
        workouts.forEach((workout) => {
            const date = workout.created_at?.slice(0, 10);
            if (date) {
                if (!dates[date]) {
                    dates[date] = { dots: [] };
                }
                dates[date].dots.push({
                    key: workout.id, // ✅ Use workout ID instead of 'workout'
                    color: '#f95e3d'
                });
            }
        });

        // Add selection styling if a date is selected
        if (selectedDate) {
            dates[selectedDate] = {
                ...dates[selectedDate], // Preserve existing dots
                selected: true,
                selectedColor: '#eb0202',
                selectedTextColor: 'white',
                dots: dates[selectedDate]?.dots || [], // Keep dots even if no workouts
            };
        }

        return dates;
    }, [workouts, selectedDate]);

    // Filter workouts for display based on selected date
    const displayedWorkouts = useMemo(() => {
        if (!selectedDate) {
            return workouts; // Show all workouts when no date selected
        }
        return workouts.filter((w) => w.created_at?.startsWith(selectedDate));
    }, [workouts, selectedDate]);

    return {
        selectedDate,
        setSelectedDate,
        markedDates,
        displayedWorkouts,
        reloadCalendarData,
    };
};