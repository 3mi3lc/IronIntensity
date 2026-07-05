import { useState, useEffect, useRef } from 'react';
import { format } from 'date-fns';
import { getBodyWeightEntries } from '@/repositories/bodyWeightEntries';
import {
    getTotalWorkouts,
    getTotalVolume,
    getTopExercisesByVolume,
    getRecentPRs,
    getVolumeComparison,
    getWorkoutCountComparison,
    getCumulativeVolumeByDay,
    getCumulativeVolumeByWeek,
    getCumulativeVolumeByMonth,
    getCumulativeWorkoutsByDay,
    getCumulativeWorkoutsByWeek, getCumulativeWorkoutsByMonth, getWorkoutStreak,
} from '@/repositories/statistics';

export type TimeRange = '7d' | '30d' | '90d' | '1y';
export type MetricType = 'volume' | 'weight' | 'workouts' | 'exercises' | 'prs';

export interface ChartDataPoint {
    labels: string[];
    data: number[];
}

export interface TopExercise {
    exerciseId: string;
    exerciseName: string;
    totalVolume: number;
}

export interface PersonalRecord {
    exerciseName: string;
    weight: number;
    reps: number;
    completedAt: string;
    workoutName: string;
}

export function getDateRange(range: TimeRange) {
    const endDate = new Date();
    const startDate = new Date();

    switch (range) {
        case '7d': startDate.setDate(endDate.getDate() - 7); break;
        case '30d': startDate.setDate(endDate.getDate() - 30); break;
        case '90d': startDate.setDate(endDate.getDate() - 90); break;
        case '1y': startDate.setFullYear(endDate.getFullYear() - 1); break;
    }

    return { startDate: startDate.toISOString(), endDate: endDate.toISOString() };
}

function getPreviousDateRange(range: TimeRange) {
    const { startDate } = getDateRange(range);
    const start = new Date(startDate);
    const end = new Date(startDate);

    switch (range) {
        case '7d': start.setDate(start.getDate() - 7); break;
        case '30d': start.setDate(start.getDate() - 30); break;
        case '90d': start.setDate(start.getDate() - 90); break;
        case '1y': start.setFullYear(start.getFullYear() - 1); break;
    }

    return { startDate: start.toISOString(), endDate: end.toISOString() };
}

function formatPeriodLabel(dateStr: string, range: TimeRange): string {
    switch (range) {
        case '7d': {
            const date = new Date(dateStr + 'T00:00:00');
            return isNaN(date.getTime()) ? dateStr : format(date, 'EEE');
        }
        case '30d': {
            const date = new Date(dateStr + 'T00:00:00');
            return isNaN(date.getTime()) ? dateStr : format(date, 'MMM d');
        }
        case '90d': {
            // "YYYY-W##" format — convert to the Monday of that week
            const [year, week] = dateStr.split('-W');
            if (!year || !week) return dateStr;

            // Calculate the date of Monday for this ISO week
            const jan1 = new Date(parseInt(year), 0, 1);
            const daysToMonday = (1 - jan1.getDay() + 7) % 7;
            const firstMonday = new Date(jan1);
            firstMonday.setDate(jan1.getDate() + daysToMonday);
            const weekDate = new Date(firstMonday);
            weekDate.setDate(firstMonday.getDate() + (parseInt(week) - 1) * 7);

            return isNaN(weekDate.getTime()) ? dateStr : format(weekDate, 'MMM d');
        }
        case '1y': {
            // "YYYY-MM" format — parse manually
            const [year, month] = dateStr.split('-');
            if (!year || !month) return dateStr;
            const date = new Date(parseInt(year), parseInt(month) - 1, 1);
            return isNaN(date.getTime()) ? dateStr : format(date, 'MMM yy');
        }
    }
}

export function useStatistics(userId: string | undefined) {
    const [selectedRange, setSelectedRange] = useState<TimeRange>('30d');
    const [selectedMetric, setSelectedMetric] = useState<MetricType>('volume');
    const [loading, setLoading] = useState(true);

    const [bodyWeightData, setBodyWeightData] = useState<ChartDataPoint>({ labels: [], data: [] });
    const [volumeData, setVolumeData] = useState<ChartDataPoint>({ labels: [], data: [] });
    const [workoutsData, setWorkoutsData] = useState<ChartDataPoint>({ labels: [], data: [] });

    const [topExercises, setTopExercises] = useState<TopExercise[]>([]);
    const [recentPRs, setRecentPRs] = useState<PersonalRecord[]>([]);

    const [totalVolume, setTotalVolume] = useState(0);
    const [volumeChange, setVolumeChange] = useState(0);
    const [currentWeight, setCurrentWeight] = useState(0);
    const [weightChange, setWeightChange] = useState(0);
    const [workoutCount, setWorkoutCount] = useState(0);
    const [workoutCountChange, setWorkoutCountChange] = useState(0);

    const [currentStreak, setCurrentStreak] = useState(0);
    const [longestStreak, setLongestStreak] = useState(0);

    const isInitialMount = useRef(true);

    useEffect(() => {
        if (userId) {
            loadStatistics();
        } else {
            setLoading(false);
        }
    }, [userId, selectedRange]);

    useEffect(() => {
        if (isInitialMount.current) {
            isInitialMount.current = false;
            return;
        }
        if (userId) {
            const { startDate, endDate } = getDateRange(selectedRange);
            loadChartDataForMetric(startDate, endDate);
        }
    }, [selectedMetric]);

    const loadStatistics = async () => {
        if (!userId) return;
        setLoading(true);
        try {
            const { startDate, endDate } = getDateRange(selectedRange);
            await Promise.all([
                loadSummaryData(startDate, endDate),
                loadChartDataForMetric(startDate, endDate),
            ]);
        } catch (error) {
            console.error('Error loading statistics:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadSummaryData = async (startDate: string, endDate: string) => {
        if (!userId) return;
        const { startDate: prevStart, endDate: prevEnd } = getPreviousDateRange(selectedRange);

        await Promise.all([
            (async () => {
                const { current, longest } = await getWorkoutStreak(userId);
                setCurrentStreak(current);
                setLongestStreak(longest);
            })(),
            (async () => {
                const [total, { changePercent }] = await Promise.all([
                    getTotalVolume(userId, startDate, endDate),
                    getVolumeComparison(userId, startDate, endDate, prevStart, prevEnd),
                ]);
                setTotalVolume(total);
                setVolumeChange(changePercent);
            })(),
            (async () => {
                const [total, { change }] = await Promise.all([
                    getTotalWorkouts(userId, startDate, endDate),
                    getWorkoutCountComparison(userId, startDate, endDate, prevStart, prevEnd),
                ]);
                setWorkoutCount(total);
                setWorkoutCountChange(change);
            })(),
            (async () => {
                const entries = await getBodyWeightEntries(userId, startDate, endDate);
                const latest = entries[0]?.weight || 0;
                const oldest = entries[entries.length - 1]?.weight || latest;
                setCurrentWeight(latest);
                setWeightChange(latest - oldest);
            })(),
            loadTopExercises(startDate, endDate),
            loadRecentPRs(startDate, endDate),
        ]);
    };

    const loadChartDataForMetric = async (startDate: string, endDate: string) => {
        switch (selectedMetric) {
            case 'weight': await loadBodyWeightChartData(startDate, endDate); break;
            case 'volume': await loadVolumeChartData(startDate, endDate); break;
            case 'workouts': await loadWorkoutsChartData(startDate, endDate); break;
            case 'exercises': break; // list populated by loadSummaryData
        }
    };

    const loadBodyWeightChartData = async (startDate: string, endDate: string) => {
        if (!userId) return;
        const entries = await getBodyWeightEntries(userId, startDate, endDate);

        if (entries.length === 0) {
            setBodyWeightData({ labels: [], data: [] });
            return;
        }

        // entries are DESC (newest first) — reverse so time flows left→right
        const chartEntries = [...entries].reverse();
        const labels: string[] = [];
        const data: number[] = [];

        chartEntries.forEach(entry => {
            const date = new Date(entry.recorded_at);
            switch (selectedRange) {
                case '7d': labels.push(format(date, 'EEE')); break;
                case '30d': labels.push(format(date, 'MMM d')); break;
                case '90d': labels.push(format(date, 'MMM d')); break;
                case '1y': labels.push(format(date, 'MMM')); break;
            }
            data.push(entry.weight);
        });

        setBodyWeightData({ labels, data });
    };

    const loadVolumeChartData = async (startDate: string, endDate: string) => {
        if (!userId) return;
        let volumeByPeriod;

        switch (selectedRange) {
            case '7d':
            case '30d':
                volumeByPeriod = await getCumulativeVolumeByDay(userId, startDate, endDate);
                break;
            case '90d':
                volumeByPeriod = await getCumulativeVolumeByWeek(userId, startDate, endDate);
                break;
            case '1y':
                volumeByPeriod = await getCumulativeVolumeByMonth(userId, startDate, endDate);
                break;
        }

        if (volumeByPeriod.length === 0) {
            setVolumeData({ labels: [], data: [] });
            return;
        }

        setVolumeData({
            labels: volumeByPeriod.map(v => formatPeriodLabel(v.date, selectedRange)),
            data: volumeByPeriod.map(v => v.volume),
        });
    };

    const loadWorkoutsChartData = async (startDate: string, endDate: string) => {
        if (!userId) return;
        let workoutsByPeriod;

        switch (selectedRange) {
            case '7d':
            case '30d':
                workoutsByPeriod = await getCumulativeWorkoutsByDay(userId, startDate, endDate);
                break;
            case '90d':
                workoutsByPeriod = await getCumulativeWorkoutsByWeek(userId, startDate, endDate);
                break;
            case '1y':
                workoutsByPeriod = await getCumulativeWorkoutsByMonth(userId, startDate, endDate);
                break;
        }

        if (workoutsByPeriod.length === 0) {
            setWorkoutsData({ labels: [], data: [] });
            return;
        }

        setWorkoutsData({
            labels: workoutsByPeriod.map(w => formatPeriodLabel(w.date, selectedRange)),
            data: workoutsByPeriod.map(w => w.count),
        });
    };

    const loadTopExercises = async (startDate: string, endDate: string, limit = 10) => {
        if (!userId) return;
        const exercises = await getTopExercisesByVolume(userId, startDate, endDate, limit);
        setTopExercises(exercises);
    };

    const loadRecentPRs = async (startDate: string, endDate: string) => {
        if (!userId) return;
        const prs = await getRecentPRs(userId, startDate, endDate);
        setRecentPRs(prs);
    };

    const reloadTopExercises = async (limit: number) => {
        const { startDate, endDate } = getDateRange(selectedRange);
        await loadTopExercises(startDate, endDate, limit);
    };

    return {
        selectedRange,
        setSelectedRange,
        selectedMetric,
        setSelectedMetric,
        loading,
        bodyWeightData,
        volumeData,
        workoutsData,
        topExercises,
        recentPRs,
        totalVolume,
        volumeChange,
        currentWeight,
        weightChange,
        workoutCount,
        workoutCountChange,
        loadStatistics,
        reloadTopExercises,
        currentStreak,
        longestStreak,
    };
}
