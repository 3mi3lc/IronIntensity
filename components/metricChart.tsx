import React from 'react';
import { View, Text } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { AntDesign } from '@expo/vector-icons';
import type { MetricType, ChartDataPoint } from '@/hooks/useStatistics';

const TITLES: Record<MetricType, string> = {
    volume: 'Total Volume',
    weight: 'Body Weight',
    workouts: 'Workouts Completed',
    exercises: '',
    prs: 'Personal Records',
};

interface Props {
    metric: MetricType;
    data: ChartDataPoint;
    screenWidth: number;
}

export const MetricChart = ({ metric, data, screenWidth }: Props) => {
    if (data.labels.length === 0) {
        return (
            <View className="bg-surface_a10 p-8 rounded-xl mb-6 items-center">
                <AntDesign name="frown" size={48} color="#666" />
                <Text className="text-surface_a50 text-center mt-4">No data available for this period</Text>
            </View>
        );
    }

    // Thin out labels to prevent overlap — show at most 6
    const maxLabels = 6;
    const step = Math.ceil(data.labels.length / maxLabels);
    const thinnedLabels = data.labels.map((label, i) =>
        i % step === 0 ? label : ''
    );

    return (
        <View className="bg-surface_a10 p-4 rounded-xl mb-6">
            <Text className="text-light font-bold text-lg mb-4">{TITLES[metric]}</Text>
            <LineChart
                data={{
                    labels: thinnedLabels,
                    datasets: [{ data: data.data.length > 0 ? data.data : [0] }],
                }}
                width={screenWidth - 56}
                height={220}
                chartConfig={{
                    backgroundColor: '#282828',
                    backgroundGradientFrom: '#282828',
                    backgroundGradientTo: '#282828',
                    decimalPlaces: metric === 'weight' ? 1 : 0,
                    color: (opacity = 1) => `rgba(243, 64, 35, ${opacity})`,
                    labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
                    style: { borderRadius: 16 },
                    propsForDots: { r: '4', strokeWidth: '2', stroke: '#f34023' },
                }}
                bezier
                style={{ marginVertical: 8, borderRadius: 16 }}
            />
        </View>
    );
};