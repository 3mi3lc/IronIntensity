import React, { useState, useRef } from 'react';
import { logger } from '@/utils/logger';
import { View, Text, TouchableOpacity, Animated, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Calendar } from 'react-native-calendars';
import { useWorkoutCalendar } from '@/hooks/useWorkoutCalendar';
import WorkoutListItem from '@/components/workoutListItem';
import WorkoutOptionsModal from '@/components/workoutOptionsModal';
import { StreakCard } from '@/components/streakCard';
import { formatReadableDate } from '@/utils/formatDate';
import { useRouter } from 'expo-router';
import { Workout } from '@/repositories/types';
import { useAuth } from '@/hooks/useAuth';
import { AntDesign } from '@expo/vector-icons';
import { useStreak } from "@/hooks/useStreak";

const CALENDAR_EXPANDED_HEIGHT = 320;
const CALENDAR_COLLAPSED_HEIGHT = 180;

const CalendarComponent = () => {
    const router = useRouter();
    const { user } = useAuth();
    const [isCreating, setIsCreating] = useState(false);
    const [selectedWorkout, setSelectedWorkout] = useState<Workout | null>(null);
    const [modalVisible, setModalVisible] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    const calendarHeight = useRef(new Animated.Value(CALENDAR_COLLAPSED_HEIGHT)).current;

    const {
        selectedDate,
        setSelectedDate,
        markedDates,
        displayedWorkouts,
    } = useWorkoutCalendar();

    const { currentStreak, longestStreak } = useStreak(user?.id, displayedWorkouts);

    const toggleCalendar = () => {
        Animated.timing(calendarHeight, {
            toValue: isExpanded ? CALENDAR_COLLAPSED_HEIGHT : CALENDAR_EXPANDED_HEIGHT,
            duration: 300,
            useNativeDriver: false,
        }).start();
        setIsExpanded(prev => !prev);
    };

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
            router.push({ pathname: '/workout/create' });
        } catch (error) {
            logger.error('Failed to create workout:', error);
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
        if (!selectedWorkout) return;
        setModalVisible(false);
        router.push({
            pathname: '/workout/performAgain',
            params: { id: selectedWorkout.id, name: selectedWorkout.name },
        });
    };

    const handleViewWorkout = () => {
        if (!selectedWorkout) return;
        setModalVisible(false);
        router.push({
            pathname: '/workout/view',
            params: { id: selectedWorkout.id, name: selectedWorkout.name },
        });
    };

    const handleEditWorkout = () => {
        if (!selectedWorkout) return;
        setModalVisible(false);
        router.push({
            pathname: '/workout/edit',
            params: { id: selectedWorkout.id, name: selectedWorkout.name },
        });
    };

    return (
        <SafeAreaView className="flex-1 bg-surface_a0">
            <View className="flex-1 items-center px-4 pt-2">

                {/* Calendar Card */}
                <View className="w-full max-w-[400px] mb-1 bg-surface_a10 rounded-2xl shadow-lg overflow-hidden">
                    <Animated.View style={{ height: calendarHeight, overflow: 'hidden' }}>
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
                                arrowColor: '#eb0202',
                                selectedDayBackgroundColor: '#eb0202',
                                todayTextColor: '#f34023',
                                textMonthFontSize: 20,
                                textMonthFontWeight: 'bold',
                                textDayFontSize: 16,
                                textDayHeaderFontSize: 14,
                            }}
                        />
                    </Animated.View>

                    <TouchableOpacity
                        onPress={toggleCalendar}
                        className="items-center py-2 border-t border-surface_a20"
                        activeOpacity={0.7}
                    >
                        <AntDesign
                            name={isExpanded ? 'up' : 'down'}
                            size={16}
                            color="#8b8b8b"
                        />
                    </TouchableOpacity>
                </View>

                {/* Streak Card */}
                <View className="mb-1 mt-4 w-full max-w-[400px]">
                    <StreakCard
                        currentStreak={currentStreak}
                        longestStreak={longestStreak}
                    />
                </View>

                {/* Log New Workout Button */}
                <View className="w-full max-w-[400px] mb-4">
                    <TouchableOpacity
                        onPress={handleLogNewWorkout}
                        disabled={isCreating}
                        className={`py-4 rounded-xl ${isCreating ? 'bg-primary_a0/50' : 'bg-primary_a0'}`}
                        activeOpacity={0.8}
                        style={{
                            shadowColor: '#eb0202',
                            shadowOffset: { width: 0, height: 4 },
                            shadowOpacity: 0.3,
                            shadowRadius: 8,
                            elevation: 8,
                        }}
                    >
                        <View className="flex-row items-center justify-center">
                            {isCreating ? (
                                <AntDesign name="loading" size={24} color="white" />
                            ) : (
                                <AntDesign name="plus" size={24} color="white" />
                            )}
                            <Text className="text-white text-xl font-bold ml-2">
                                {isCreating ? 'Creating Workout...' : 'Log New Workout'}
                            </Text>
                        </View>
                    </TouchableOpacity>
                </View>

                {/* Workouts List Header */}
                <View className="w-full max-w-[400px] mb-3">
                    <View className="flex-row items-center">
                        <View className="flex-1 h-[1px] bg-surface_a20" />
                        <Text className="text-white font-bold text-base px-4">
                            {selectedDate ? formatReadableDate(selectedDate) : 'Recent Workouts'}
                        </Text>
                        <View className="flex-1 h-[1px] bg-surface_a20" />
                    </View>
                </View>

                {/* Workouts List */}
                <Animated.ScrollView
                    className="w-full max-w-[400px] flex-1"
                    contentContainerStyle={{ paddingBottom: 80 }}
                    showsVerticalScrollIndicator={false}
                >
                    {displayedWorkouts.length > 0 ? (
                        displayedWorkouts.map((workout) => (
                            <WorkoutListItem
                                key={workout.id}
                                workout={workout}
                                onPress={handleWorkoutPress}
                            />
                        ))
                    ) : (
                        <View className="bg-surface_a10 p-6 rounded-2xl items-center mt-2">
                            <AntDesign name="calendar" size={48} color="#f34023" />
                            <Text className="text-light text-lg font-bold mt-4 mb-2 text-center">
                                {selectedDate ? 'No Workouts This Day' : 'No Workouts Yet'}
                            </Text>
                            <Text className="text-surface_a50 text-sm text-center mb-4">
                                {selectedDate
                                    ? "You haven't logged any workouts for this date"
                                    : 'Start your fitness journey by logging your first workout'}
                            </Text>
                            {!selectedDate && (
                                <TouchableOpacity
                                    onPress={handleLogNewWorkout}
                                    disabled={isCreating}
                                    className="bg-primary_a0 py-3 px-8 rounded-xl"
                                    activeOpacity={0.8}
                                >
                                    <Text className="text-white font-bold text-base">Get Started</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    )}
                </Animated.ScrollView>
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
        </SafeAreaView>
    );
};

export default CalendarComponent;
