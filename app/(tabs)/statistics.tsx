// app/(tabs)/statistics.tsx
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '@/hooks/useAuth';
import { useStatistics, getDateRange } from '@/hooks/useStatistics';
import { MetricCard } from '@/components/metricCard';
import { TimeRangeSelector } from '@/components/timeRangeSelector';
import { MetricChart } from '@/components/metricChart';
import { ExerciseList } from '@/components/exerciseList';
import { RecentPRsList } from '@/components/recentPRsList';
import { AddBodyWeightModal } from '@/components/addBodyWeightModal';
import { ExerciseHistoryScreen } from '../exercise/exerciseHistoryScreen';
import { LoadingScreen } from '@/components/loadingScreen';

const Statistics = () => {
    const { user } = useAuth();
    const [showAddWeightModal, setShowAddWeightModal] = useState(false);
    const [showExerciseHistory, setShowExerciseHistory] = useState(false);
    const [selectedExerciseForHistory, setSelectedExerciseForHistory] = useState<{ id: string; name: string } | null>(null);

    const {
        selectedRange, setSelectedRange,
        selectedMetric, setSelectedMetric,
        loading,
        bodyWeightData, volumeData, workoutsData,
        topExercises, recentPRs,
        totalVolume, volumeChange,
        currentWeight, weightChange,
        workoutCount, workoutCountChange,
        loadStatistics,
        reloadTopExercises,
    } = useStatistics(user?.id);

    const screenWidth = Dimensions.get('window').width;

    const chartData = selectedMetric === 'volume' ? volumeData
        : selectedMetric === 'weight' ? bodyWeightData
        : workoutsData;

    if (loading) {
        return <LoadingScreen message="Loading statistics..." />;
    }

    if (showExerciseHistory && selectedExerciseForHistory && user?.id) {
        return (
            <ExerciseHistoryScreen
                userId={user.id}
                exerciseId={selectedExerciseForHistory.id}
                exerciseName={selectedExerciseForHistory.name}
                onBack={() => {
                    setShowExerciseHistory(false);
                    setSelectedExerciseForHistory(null);
                }}
            />
        );
    }

    const { startDate, endDate } = getDateRange(selectedRange);

    return (
        <SafeAreaView className="flex-1 bg-surface_a0">
            <View className="pt-4 pb-6 flex-row justify-between items-center px-6">
                <View>
                    <Text className="text-primary_a0 font-bold text-3xl">Statistics</Text>
                    <Text className="text-surface_a50 text-sm mt-1">Track your progress</Text>
                </View>
                <TouchableOpacity
                    onPress={() => setShowAddWeightModal(true)}
                    className="bg-primary_a0 p-3 rounded-full"
                    activeOpacity={0.8}
                >
                    <MaterialIcons name="monitor-weight" size={24} color="white" />
                </TouchableOpacity>
            </View>

            <ScrollView
                className="flex-1 px-4"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 60 }}
            >
                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-6" nestedScrollEnabled>
                    <MetricCard
                        isSelected={selectedMetric === 'weight'}
                        onPress={() => setSelectedMetric('weight')}
                        iconSource="AntDesign"
                        iconName="line-chart"
                        value={currentWeight > 0 ? `${currentWeight.toFixed(1)} kg` : 'No data'}
                        label="Body Weight"
                        sublabel={weightChange !== 0 ? `${weightChange > 0 ? '+' : ''}${weightChange.toFixed(1)} kg` : '-'}
                        sublabelColor={weightChange > 0 ? 'green' : weightChange < 0 ? 'red' : 'default'}
                    />
                    <MetricCard
                        isSelected={selectedMetric === 'prs'}
                        onPress={() => setSelectedMetric('prs')}
                        iconSource="AntDesign"
                        iconName="star"
                        value={recentPRs.length.toString()}
                        label="Recent PRs"
                        sublabel="Tap to view"
                        sublabelColor="default"
                    />
                    <MetricCard
                        isSelected={selectedMetric === 'exercises'}
                        onPress={() => setSelectedMetric('exercises')}
                        iconSource="MaterialIcons"
                        iconName="fitness-center"
                        value={topExercises.length.toString()}
                        label="Top Exercises"
                        sublabel="Tap to view"
                        sublabelColor="default"
                    />
                    <MetricCard
                        isSelected={selectedMetric === 'workouts'}
                        onPress={() => setSelectedMetric('workouts')}
                        iconSource="AntDesign"
                        iconName="calendar"
                        value={workoutCount.toString()}
                        label="Workouts"
                        sublabel={`${workoutCountChange > 0 ? '+' : ''}${workoutCountChange}`}
                        sublabelColor={workoutCountChange > 0 ? 'green' : workoutCountChange < 0 ? 'red' : 'default'}
                    />
                    <MetricCard
                        isSelected={selectedMetric === 'volume'}
                        onPress={() => setSelectedMetric('volume')}
                        iconSource="AntDesign"
                        iconName="bar-chart"
                        value={`${(totalVolume / 1000).toFixed(1)}k kg`}
                        label="Volume"
                        sublabel={`${volumeChange > 0 ? '+' : ''}${volumeChange}%`}
                        sublabelColor={volumeChange > 0 ? 'green' : volumeChange < 0 ? 'red' : 'default'}
                    />
                </ScrollView>

                <TimeRangeSelector selectedRange={selectedRange} onRangeChange={setSelectedRange} />

                {selectedMetric === 'exercises' ? (
                    user?.id && (
                        <ExerciseList
                            exercises={topExercises}
                            userId={user.id}
                            startDate={startDate}
                            endDate={endDate}
                            onViewHistory={(id, name) => {
                                setSelectedExerciseForHistory({ id, name });
                                setShowExerciseHistory(true);
                            }}
                            onLoadMore={reloadTopExercises}
                        />
                    )
                ) : selectedMetric === 'prs' ? (
                    <RecentPRsList prs={recentPRs} />
                ) : (
                    <MetricChart metric={selectedMetric} data={chartData} screenWidth={screenWidth} />
                )}
            </ScrollView>

            {user?.id && (
                <AddBodyWeightModal
                    visible={showAddWeightModal}
                    onClose={() => setShowAddWeightModal(false)}
                    onSuccess={loadStatistics}
                    userId={user.id}
                />
            )}
        </SafeAreaView>
    );
};

export default Statistics;
