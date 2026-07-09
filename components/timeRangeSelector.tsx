import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import type { TimeRange } from '@/hooks/useStatistics';

const RANGES: TimeRange[] = ['7d', '30d', '90d', '1y'];
const LABELS: Record<TimeRange, string> = { '7d': '7D', '30d': '30D', '90d': '90D', '1y': '1Y' };

interface Props {
    selectedRange: TimeRange;
    onRangeChange: (range: TimeRange) => void;
}

export const TimeRangeSelector = ({ selectedRange, onRangeChange }: Props) => (
    <View className="flex-row justify-between mb-4">
        {RANGES.map(range => (
            <TouchableOpacity
                key={range}
                onPress={() => onRangeChange(range)}
                className={`flex-1 mx-1 py-2 rounded-lg ${selectedRange === range ? 'bg-primary_a0' : 'bg-surface_a10'}`}
                activeOpacity={0.8}
            >
                <Text className={`text-center font-semibold text-xs ${selectedRange === range ? 'text-white' : 'text-surface_a50'}`}>
                    {LABELS[range]}
                </Text>
            </TouchableOpacity>
        ))}
    </View>
);
