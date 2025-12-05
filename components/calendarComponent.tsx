import React, {useCallback, useContext, useState} from 'react';
import {View, Text, TouchableOpacity, Animated, Alert } from 'react-native';
import { Calendar } from 'react-native-calendars';
import { useWorkoutCalendar } from '@/hooks/useWorkoutCalendar';
import WorkoutListItem from '@/components/workoutListItem';
import WorkoutOptionsModal from '@/components/workoutOptionsModal';
import ScrollView = Animated.ScrollView;
import {formatReadableDate} from "@/utils/formatDate";
import {useFocusEffect, useRouter} from "expo-router";
import { UserContext } from '@/contexts/UserContext';
import { Workout } from '@/repositories/types';

const CalendarComponent = () => {
    const router = useRouter();
    const { user } = useContext(UserContext) ?? {};
    const [isCreating, setIsCreating] = useState(false);
    const [selectedWorkout, setSelectedWorkout] = useState<Workout | null>(null);
    const [modalVisible, setModalVisible] = useState(false);

    const {
        selectedDate,
        setSelectedDate,
        markedDates,
        displayedWorkouts
    } = useWorkoutCalendar();

    const onDayPress = (day: { dateString: string }) => {
        setSelectedDate(day.dateString === selectedDate ? '' : day.dateString);
    };

    const handleLogNewWorkout = async () => {
        if (!user) {
            Alert.alert('Error', 'You must be logged in to create a workout');
            return;
        }

        setIsCreating(true);
        try {
            // Navigate to the create workout screen
            router.push({
                pathname: '/workout/create',
            });
        } catch (error) {
            console.error('Failed to create workout:', error);
            Alert.alert('Error', 'Failed to create workout. Please try again.');
        } finally {
            setIsCreating(false);
        }
    };

    const handleWorkoutPress = (workout: Workout) => {
        setSelectedWorkout(workout);
        setModalVisible(true);
    };

    const handlePerformAgain = () => {
        if (!selectedWorkout) {
            Alert.alert('Error', 'Unable to start workout');
            return;
        }

        setModalVisible(false);

        // Navigate with perform-again mode - duplication happens in createWorkout screen
        router.push({
            pathname: '/workout/performAgain',
            params: {
                id: selectedWorkout.id,
                name: selectedWorkout.name,
            },
        });
    };

    const handleViewWorkout = () => {
        if (!selectedWorkout) return;

        setModalVisible(false);
        router.push({
            pathname: '/workout/view',
            params: {
                id: selectedWorkout.id,
                name: selectedWorkout.name,
            },
        });

    };


    const handleEditWorkout = () => {
        if (!selectedWorkout) return;

        setModalVisible(false);
        router.push({
            pathname: '/workout/edit',
            params: {
                id: selectedWorkout.id,
                name: selectedWorkout.name,
            },
        });
    };

    return (
        <View className="flex-1 items-center bg-surface_a0 pt-16">
            <View className="w-[320px] rounded-xl bg-surface_a10 px-4">
                <Calendar
                    firstDay={1}
                    onDayPress={onDayPress}
                    hideExtraDays={false}
                    markedDates={markedDates}
                    markingType="multi-dot"
                    theme={{
                        calendarBackground: '#282828',
                        dayTextColor: '#ffffff',
                        monthTextColor: '#ffffff',
                        arrowColor: '#ffffff',
                        selectedDayBackgroundColor: '#f95e3d',
                        todayTextColor: '#f95e3d',
                        textMonthFontSize: 20,
                        textMonthFontWeight: 'bold',
                    }}
                />
            </View>

            <View className="w-[320px] rounded-xl bg-surface_a0 pt-4">
                <TouchableOpacity
                    onPress={handleLogNewWorkout}
                    disabled={isCreating}
                    className={`p-3 rounded-xl mb-4 ${isCreating ? 'bg-primary_a0/50' : 'bg-primary_a0'}`}
                >
                    <Text className="text-white text-xl text-center font-bold">
                        {isCreating ? 'Creating Workout...' : 'Log New Workout'}
                    </Text>
                </TouchableOpacity>

                <Text className="text-white font-bold text-xl pb-4">
                    {selectedDate
                        ? `Workouts logged on ${formatReadableDate(selectedDate)}`
                        : 'Previous workouts logged'}
                </Text>

                <ScrollView style={{ maxHeight: 300 }} contentContainerStyle={{ paddingBottom: 80 }}>
                    {displayedWorkouts.map((workout) => (
                        <WorkoutListItem
                            key={workout.id}
                            workout={workout}
                            onPress={handleWorkoutPress}
                        />
                    ))}
                </ScrollView>
            </View>

            <WorkoutOptionsModal
                visible={modalVisible}
                workoutId={selectedWorkout?.id || ''}
                workoutName={selectedWorkout?.name || ''}
                onClose={() => setModalVisible(false)}
                onPerformAgain={handlePerformAgain}
                onViewWorkout={handleViewWorkout}
                onEditWorkout={handleEditWorkout}
            />
        </View>
    );
};

export default CalendarComponent;