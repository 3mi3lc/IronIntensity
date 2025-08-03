import React from 'react';
import {View, Text, TouchableOpacity, Animated } from 'react-native';
import { Calendar } from 'react-native-calendars';
import { useWorkoutCalendar } from '@/hooks/useWorkoutCalendar';
import WorkoutListItem from '@/components/workoutListItem';
import ScrollView = Animated.ScrollView;
import {formatReadableDate} from "@/utils/formatDate";
import {useRouter} from "expo-router";

const CalendarComponent = () => {
    const router = useRouter();

    const {
        selectedDate,
        setSelectedDate,
        markedDates,
        displayedWorkouts
    } = useWorkoutCalendar();

    const onDayPress = (day: { dateString: string }) => {
        setSelectedDate(day.dateString === selectedDate ? '' : day.dateString);
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
                        onPress={() => router.push('/workout/createWorkout')}
                        className="bg-primary_a0 p-3 rounded-xl mb-4"
                    >
                        <Text className="text-white text-xl text-center font-bold">Log New Workout</Text>
                    </TouchableOpacity>

                    <Text className="text-white font-bold text-xl pb-4">
                        {selectedDate
                            ? `Workouts logged on ${formatReadableDate(selectedDate)}`
                            : 'Previous workouts logged'}
                    </Text>

                    <ScrollView style={{ maxHeight: 300 }} contentContainerStyle={{ paddingBottom: 80 }}>
                        {displayedWorkouts.map((workout) => (
                            <WorkoutListItem key={workout.id} workout={workout} />
                        ))}
                    </ScrollView>
                </View>
            </View>
    );
};

export default CalendarComponent;
