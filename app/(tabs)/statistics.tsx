// app/(tabs)/statistics.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LineChart } from 'react-native-chart-kit';
import { AntDesign, MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '@/hooks/useAuth';
import { getBodyWeightEntries } from '@/repositories/bodyWeightEntries';
import {
    getTotalWorkouts,
    getTotalVolume,
    getTopExercisesByVolume,
    getRecentPRs,
    getVolumeComparison,
    getWorkoutCountComparison,
    getExerciseVolumeByDay,
    getExerciseMaxWeightByDay,
    getCumulativeVolumeByDay,
    getCumulativeVolumeByWeek,
    getCumulativeVolumeByMonth,
    getCumulativeWorkoutsByDay,
    getCumulativeWorkoutsByWeek
} from '@/repositories/statistics';
import { formatDistanceToNow, format } from 'date-fns';
import { AddBodyWeightModal } from '@/components/addBodyWeightModal';
import { MetricCard } from '@/components/metricCard';
import { ExerciseHistoryScreen } from '../exercise/exerciseHistoryScreen';

type TimeRange = '7d' | '30d' | '90d' | '1y';
type MetricType = 'volume' | 'weight' | 'workouts' | 'exercises';

interface ChartDataPoint {
    labels: string[];
    data: number[];
}

const Statistics = () => {
    const { user } = useAuth();
    const [selectedRange, setSelectedRange] = useState<TimeRange>('30d');
    const [selectedMetric, setSelectedMetric] = useState<MetricType>('volume');
    const [showAddWeightModal, setShowAddWeightModal] = useState(false);
    const [loading, setLoading] = useState(true);

    // State for real data
    const [bodyWeightData, setBodyWeightData] = useState<ChartDataPoint>({ labels: [], data: [] });
    const [volumeData, setVolumeData] = useState<ChartDataPoint>({ labels: [], data: [] });
    const [workoutsData, setWorkoutsData] = useState<ChartDataPoint>({ labels: [], data: [] });
    const [topExercises, setTopExercises] = useState<Array<{ exerciseId: string; exerciseName: string; totalVolume: number }>>([]);
    const [recentPRs, setRecentPRs] = useState<Array<{ exerciseName: string; weight: number; reps: number; completedAt: string; workoutName: string }>>([]);
    const [expandedExercise, setExpandedExercise] = useState<string | null>(null);
    const [exerciseVolumeData, setExerciseVolumeData] = useState<ChartDataPoint>({ labels: [], data: [] });
    const [exerciseMaxWeightData, setExerciseMaxWeightData] = useState<ChartDataPoint>({ labels: [], data: [] });
    const [showAllExercises, setShowAllExercises] = useState(false);

    // Exercise history state
    const [showExerciseHistory, setShowExerciseHistory] = useState(false);
    const [selectedExerciseForHistory, setSelectedExerciseForHistory] = useState<{
        id: string;
        name: string;
    } | null>(null);

    // Summary stats
    const [totalVolume, setTotalVolume] = useState(0);
    const [volumeChange, setVolumeChange] = useState(0);
    const [currentWeight, setCurrentWeight] = useState(0);
    const [weightChange, setWeightChange] = useState(0);
    const [workoutCount, setWorkoutCount] = useState(0);
    const [workoutCountChange, setWorkoutCountChange] = useState(0);

    useEffect(() => {
        if (user?.id) {
            loadStatistics();
        }
    }, [user?.id, selectedRange]);

    const getDateRange = (range: TimeRange) => {
        const endDate = new Date();
        let startDate = new Date();

        switch (range) {
            case '7d':
                startDate.setDate(endDate.getDate() - 7);
                break;
            case '30d':
                startDate.setDate(endDate.getDate() - 30);
                break;
            case '90d':
                startDate.setDate(endDate.getDate() - 90);
                break;
            case '1y':
                startDate.setFullYear(endDate.getFullYear() - 1);
                break;
        }

        return {
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString()
        };
    };

    const getPreviousDateRange = (range: TimeRange) => {
        const { startDate } = getDateRange(range);
        const start = new Date(startDate);
        const end = new Date(startDate);

        switch (range) {
            case '7d':
                start.setDate(start.getDate() - 7);
                break;
            case '30d':
                start.setDate(start.getDate() - 30);
                break;
            case '90d':
                start.setDate(start.getDate() - 90);
                break;
            case '1y':
                start.setFullYear(start.getFullYear() - 1);
                break;
        }

        return {
            startDate: start.toISOString(),
            endDate: end.toISOString()
        };
    };

    const loadStatistics = async () => {
        if (!user?.id) return;

        setLoading(true);
        try {
            const { startDate, endDate } = getDateRange(selectedRange);

            await Promise.all([
                loadBodyWeightData(startDate, endDate),
                loadVolumeData(startDate, endDate),
                loadWorkoutsData(startDate, endDate),
                loadTopExercises(startDate, endDate),
                loadRecentPRs(),
            ]);

        } catch (error) {
            console.error('Error loading statistics:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadExerciseDetails = async (exerciseId: string) => {
        const { startDate, endDate } = getDateRange(selectedRange);

        try {
            const [volumeData, maxWeightData] = await Promise.all([
                getExerciseVolumeByDay(user!.id, exerciseId, startDate, endDate),
                getExerciseMaxWeightByDay(user!.id, exerciseId, startDate, endDate)
            ]);

            setExerciseVolumeData(volumeData);
            setExerciseMaxWeightData(maxWeightData);
        } catch (error) {
            console.error('Error loading exercise details:', error);
        }
    };

    const handleExerciseToggle = async (exerciseId: string) => {
        if (expandedExercise === exerciseId) {
            // Collapsing
            setExpandedExercise(null);
            setExerciseVolumeData({ labels: [], data: [] });
            setExerciseMaxWeightData({ labels: [], data: [] });
        } else {
            // Expanding
            setExpandedExercise(exerciseId);
            await loadExerciseDetails(exerciseId);
        }
    };

    const loadBodyWeightData = async (startDate: string, endDate: string) => {
        const entries = await getBodyWeightEntries(user!.id, startDate, endDate);

        if (entries.length === 0) {
            setBodyWeightData({ labels: [], data: [] });
            setCurrentWeight(0);
            setWeightChange(0);
            return;
        }

        const labels: string[] = [];
        const data: number[] = [];

        entries.forEach(entry => {
            const date = new Date(entry.recorded_at);
            let label: string;

            switch (selectedRange) {
                case '7d':
                    label = format(date, 'EEE');
                    break;
                case '30d':
                    label = format(date, 'MMM d');
                    break;
                case '90d':
                    label = format(date, 'MMM d');
                    break;
                case '1y':
                    label = format(date, 'MMM');
                    break;
            }

            labels.push(label);
            data.push(entry.weight);
        });

        setBodyWeightData({ labels, data });

        const latest = entries[0]?.weight || 0;
        const oldest = entries[entries.length - 1]?.weight || latest;
        setCurrentWeight(latest);
        setWeightChange(latest - oldest);
    };

    const loadVolumeData = async (startDate: string, endDate: string) => {
        let volumeByPeriod;

        switch (selectedRange) {
            case '7d':
                volumeByPeriod = await getCumulativeVolumeByDay(user!.id, startDate, endDate);
                break;
            case '30d':
                volumeByPeriod = await getCumulativeVolumeByDay(user!.id, startDate, endDate);
                break;
            case '90d':
                volumeByPeriod = await getCumulativeVolumeByWeek(user!.id, startDate, endDate);
                break;
            case '1y':
                volumeByPeriod = await getCumulativeVolumeByMonth(user!.id, startDate, endDate);
                break;
        }

        if (volumeByPeriod.length === 0) {
            setVolumeData({ labels: [], data: [] });
            setTotalVolume(0);
            setVolumeChange(0);
            return;
        }

        const labels = volumeByPeriod.map(v => {
            const date = new Date(v.date);
            switch (selectedRange) {
                case '7d':
                    return format(date, 'EEE');
                case '30d':
                    return format(date, 'MMM d');
                case '90d':
                    return v.date;
                case '1y':
                    return v.date;
                default:
                    return v.date;
            }
        });

        const data = volumeByPeriod.map(v => v.volume);
        setVolumeData({ labels, data });

        const total = await getTotalVolume(user!.id, startDate, endDate);
        setTotalVolume(total);

        const { startDate: prevStart, endDate: prevEnd } = getPreviousDateRange(selectedRange);
        const { changePercent } = await getVolumeComparison(
            user!.id,
            startDate,
            endDate,
            prevStart,
            prevEnd
        );
        setVolumeChange(changePercent);
    };

    const loadWorkoutsData = async (startDate: string, endDate: string) => {
        let workoutsByPeriod;

        switch (selectedRange) {
            case '7d':
            case '30d':
                workoutsByPeriod = await getCumulativeWorkoutsByDay(user!.id, startDate, endDate);
                break;
            case '90d':
            case '1y':
                workoutsByPeriod = await getCumulativeWorkoutsByWeek(user!.id, startDate, endDate);
                break;
        }

        if (workoutsByPeriod.length === 0) {
            setWorkoutsData({ labels: [], data: [] });
            setWorkoutCount(0);
            setWorkoutCountChange(0);
            return;
        }

        const labels = workoutsByPeriod.map(w => {
            const date = new Date(w.date);
            switch (selectedRange) {
                case '7d':
                    return format(date, 'EEE');
                case '30d':
                    return format(date, 'MMM d');
                case '90d':
                    return w.date;
                case '1y':
                    return w.date;
                default:
                    return w.date;
            }
        });

        const data = workoutsByPeriod.map(w => w.count);
        setWorkoutsData({ labels, data });

        const total = await getTotalWorkouts(user!.id, startDate, endDate);
        setWorkoutCount(total);

        const { startDate: prevStart, endDate: prevEnd } = getPreviousDateRange(selectedRange);
        const { change } = await getWorkoutCountComparison(
            user!.id,
            startDate,
            endDate,
            prevStart,
            prevEnd
        );
        setWorkoutCountChange(change);
    };

    const loadTopExercises = async (startDate: string, endDate: string, limit?: number) => {
        const exercises = await getTopExercisesByVolume(
            user!.id,
            startDate,
            endDate,
            limit || (showAllExercises ? 999 : 10)
        );
        setTopExercises(exercises);
    };

    const loadRecentPRs = async () => {
        const prs = await getRecentPRs(user!.id, 10);
        setRecentPRs(prs);
    };

    const getChartData = (): ChartDataPoint => {
        switch (selectedMetric) {
            case 'volume': return volumeData;
            case 'weight': return bodyWeightData;
            case 'workouts': return workoutsData;
            default: return { labels: [], data: [] };
        }
    };

    const chartData = getChartData();
    const maxVolume = topExercises.length > 0 ? Math.max(...topExercises.map(e => e.totalVolume)) : 1;
    const screenWidth = Dimensions.get('window').width;

    if (loading) {
        return (
            <SafeAreaView className="flex-1 bg-surface_a0 items-center justify-center">
                <Text className="text-surface_a50">Loading statistics...</Text>
            </SafeAreaView>
        );
    }

    // Show exercise history screen if selected
    if (showExerciseHistory && selectedExerciseForHistory) {
        return (
            <ExerciseHistoryScreen
                userId={user!.id}
                exerciseId={selectedExerciseForHistory.id}
                exerciseName={selectedExerciseForHistory.name}
                onBack={() => {
                    setShowExerciseHistory(false);
                    setSelectedExerciseForHistory(null);
                }}
            />
        );
    }

    return (
        <SafeAreaView className="flex-1 bg-surface_a0">
            {/* Header */}
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
                {/* Summary Cards - Horizontal Scroll */}
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    className="mb-6"
                    nestedScrollEnabled={true}
                >
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
                        isSelected={selectedMetric === 'exercises'}
                        onPress={() => {
                            setSelectedMetric('exercises');
                            setExpandedExercise(null);
                        }}
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

                {/* Time Range Selector */}
                <View className="flex-row justify-between mb-4">
                    {(['7d', '30d', '90d', '1y'] as TimeRange[]).map((range) => (
                        <TouchableOpacity
                            key={range}
                            onPress={() => setSelectedRange(range)}
                            className={`flex-1 mx-1 py-2 rounded-lg ${
                                selectedRange === range ? 'bg-primary_a0' : 'bg-surface_a10'
                            }`}
                            activeOpacity={0.8}
                        >
                            <Text className={`text-center font-semibold text-xs ${
                                selectedRange === range ? 'text-white' : 'text-surface_a50'
                            }`}>
                                {range === '7d' ? '7D' : range === '30d' ? '30D' : range === '90d' ? '90D' : '1Y'}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Chart or Exercise List */}
                {selectedMetric === 'exercises' ? (
                    topExercises.length > 0 ? (
                        <View className="bg-surface_a10 p-4 rounded-xl mb-6">
                            <Text className="text-light font-bold text-lg mb-4">Exercise Details</Text>

                            {topExercises.map((exercise) => {
                                const isExpanded = expandedExercise === exercise.exerciseId;

                                return (
                                    <View key={exercise.exerciseId} className="mb-4">
                                        <TouchableOpacity
                                            onPress={() => handleExerciseToggle(exercise.exerciseId)}
                                            activeOpacity={0.8}
                                            className="mb-2"
                                        >
                                            <View className="flex-row justify-between items-center mb-2">
                                                <View className="flex-1">
                                                    <Text className="text-light font-semibold">{exercise.exerciseName}</Text>
                                                    <Text className="text-surface_a50 text-sm">
                                                        {(exercise.totalVolume / 1000).toFixed(1)}k kg total volume
                                                    </Text>
                                                </View>
                                                <AntDesign
                                                    name={isExpanded ? "up" : "down"}
                                                    size={20}
                                                    color="#f34023"
                                                />
                                            </View>
                                            <View className="bg-surface_a20 h-2 rounded-full overflow-hidden">
                                                <View
                                                    className="bg-primary_a0 h-full"
                                                    style={{ width: `${(exercise.totalVolume / maxVolume) * 100}%` }}
                                                />
                                            </View>
                                        </TouchableOpacity>

                                        {isExpanded && (
                                            <View className="mt-3 bg-surface_a20 p-3 rounded-lg">
                                                {/* Volume Chart */}
                                                <Text className="text-light font-semibold mb-2">Volume Over Time</Text>
                                                {exerciseVolumeData.labels.length > 0 ? (
                                                    <LineChart
                                                        data={{
                                                            labels: exerciseVolumeData.labels,
                                                            datasets: [{ data: exerciseVolumeData.data.length > 0 ? exerciseVolumeData.data : [0] }],
                                                        }}
                                                        width={screenWidth - 88}
                                                        height={160}
                                                        chartConfig={{
                                                            backgroundColor: '#1a1a1a',
                                                            backgroundGradientFrom: '#1a1a1a',
                                                            backgroundGradientTo: '#1a1a1a',
                                                            decimalPlaces: 0,
                                                            color: (opacity = 1) => `rgba(243, 64, 35, ${opacity})`,
                                                            labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
                                                            style: { borderRadius: 12 },
                                                            propsForDots: { r: '3', strokeWidth: '1', stroke: '#f34023' },
                                                        }}
                                                        bezier
                                                        style={{ marginVertical: 8, borderRadius: 12 }}
                                                    />
                                                ) : (
                                                    <View className="py-8 items-center">
                                                        <Text className="text-surface_a50">Loading volume data...</Text>
                                                    </View>
                                                )}

                                                {/* Max Weight Chart */}
                                                <Text className="text-light font-semibold mb-2 mt-4">Max Weight Over Time</Text>
                                                {exerciseMaxWeightData.labels.length > 0 ? (
                                                    <LineChart
                                                        data={{
                                                            labels: exerciseMaxWeightData.labels,
                                                            datasets: [{ data: exerciseMaxWeightData.data.length > 0 ? exerciseMaxWeightData.data : [0] }],
                                                        }}
                                                        width={screenWidth - 88}
                                                        height={160}
                                                        chartConfig={{
                                                            backgroundColor: '#1a1a1a',
                                                            backgroundGradientFrom: '#1a1a1a',
                                                            backgroundGradientTo: '#1a1a1a',
                                                            decimalPlaces: 1,
                                                            color: (opacity = 1) => `rgba(74, 222, 128, ${opacity})`,
                                                            labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
                                                            style: { borderRadius: 12 },
                                                            propsForDots: { r: '3', strokeWidth: '1', stroke: '#4ade80' },
                                                        }}
                                                        bezier
                                                        style={{ marginVertical: 8, borderRadius: 12 }}
                                                    />
                                                ) : (
                                                    <View className="py-8 items-center">
                                                        <Text className="text-surface_a50">Loading weight data...</Text>
                                                    </View>
                                                )}

                                                {/* View History Button */}
                                                <TouchableOpacity
                                                    onPress={() => {
                                                        setSelectedExerciseForHistory({
                                                            id: exercise.exerciseId,
                                                            name: exercise.exerciseName
                                                        });
                                                        setShowExerciseHistory(true);
                                                    }}
                                                    className="mt-4 bg-primary_a0 py-3 rounded-lg"
                                                    activeOpacity={0.8}
                                                >
                                                    <View className="flex-row items-center justify-center">
                                                        <AntDesign name="history" size={18} color="white" />
                                                        <Text className="text-white font-semibold ml-2">
                                                            View Exercise History
                                                        </Text>
                                                    </View>
                                                </TouchableOpacity>
                                            </View>
                                        )}
                                    </View>
                                );
                            })}

                            {/* View All Exercises Button */}
                            {!showAllExercises && topExercises.length >= 10 && (
                                <TouchableOpacity
                                    onPress={async () => {
                                        setShowAllExercises(true);
                                        const { startDate, endDate } = getDateRange(selectedRange);
                                        await loadTopExercises(startDate, endDate, 999);
                                    }}
                                    className="mt-2 p-2 bg-primary_a0 rounded-md items-center"
                                >
                                    <Text className="text-white font-semibold">View All Exercises</Text>
                                </TouchableOpacity>
                            )}

                            {showAllExercises && topExercises.length > 10 && (
                                <TouchableOpacity
                                    onPress={async () => {
                                        setShowAllExercises(false);
                                        const { startDate, endDate } = getDateRange(selectedRange);
                                        await loadTopExercises(startDate, endDate, 10);
                                    }}
                                    className="mt-2 p-2 bg-surface_a20 rounded-md items-center"
                                >
                                    <Text className="text-surface_a50 font-semibold">Show Less</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    ) : (
                        <View className="bg-surface_a10 p-8 rounded-xl mb-6 items-center">
                            <MaterialIcons name="fitness-center" size={48} color="#666" />
                            <Text className="text-surface_a50 text-center mt-4">
                                No exercise data available for this period
                            </Text>
                        </View>
                    )
                ) : chartData.labels.length > 0 ? (
                    // Chart view for volume / weight / workouts
                    <View className="bg-surface_a10 p-4 rounded-xl mb-6">
                        <Text className="text-light font-bold text-lg mb-4">
                            {selectedMetric === 'volume' && 'Total Volume'}
                            {selectedMetric === 'weight' && 'Body Weight'}
                            {selectedMetric === 'workouts' && 'Workouts Completed'}
                        </Text>
                        <LineChart
                            data={{
                                labels: chartData.labels,
                                datasets: [{ data: chartData.data.length > 0 ? chartData.data : [0] }],
                            }}
                            width={screenWidth - 56}
                            height={220}
                            chartConfig={{
                                backgroundColor: '#282828',
                                backgroundGradientFrom: '#282828',
                                backgroundGradientTo: '#282828',
                                decimalPlaces: selectedMetric === 'weight' ? 1 : 0,
                                color: (opacity = 1) => `rgba(243, 64, 35, ${opacity})`,
                                labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
                                style: { borderRadius: 16 },
                                propsForDots: { r: '4', strokeWidth: '2', stroke: '#f34023' },
                            }}
                            bezier
                            style={{ marginVertical: 8, borderRadius: 16 }}
                        />
                    </View>
                ) : (
                    <View className="bg-surface_a10 p-8 rounded-xl mb-6 items-center">
                        <AntDesign name="frown" size={48} color="#666" />
                        <Text className="text-surface_a50 text-center mt-4">
                            No data available for this period
                        </Text>
                    </View>
                )}

                {/* Personal Records */}
                {recentPRs.length > 0 && (
                    <View className="bg-surface_a10 p-4 rounded-xl mb-20">
                        <Text className="text-light font-bold text-lg mb-4">Recent PRs</Text>
                        {recentPRs.map((pr, index) => (
                            <View
                                key={index}
                                className={`flex-row items-center ${
                                    index < recentPRs.length - 1 ? 'mb-3 pb-3 border-b border-surface_a20' : ''
                                }`}
                            >
                                <AntDesign name="star" size={20} color="#f34023" />
                                <View className="flex-1 ml-3">
                                    <Text className="text-light font-semibold">{pr.exerciseName}</Text>
                                    <Text className="text-surface_a50 text-sm">
                                        {pr.weight} kg × {pr.reps} reps
                                    </Text>
                                </View>
                                <Text className="text-surface_a50 text-sm">
                                    {formatDistanceToNow(new Date(pr.completedAt), { addSuffix: true })}
                                </Text>
                            </View>
                        ))}
                    </View>
                )}
            </ScrollView>

            {/* Add Weight Modal */}
            <AddBodyWeightModal
                visible={showAddWeightModal}
                onClose={() => setShowAddWeightModal(false)}
                onSuccess={loadStatistics}
                userId={user!.id}
            />
        </SafeAreaView>
    );
};

export default Statistics;