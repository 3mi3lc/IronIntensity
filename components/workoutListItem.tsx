import React from 'react';
import { Text, TouchableOpacity } from 'react-native';
import { Workout } from '@/repositories/types';
import { formatReadableDate } from '@/utils/formatDate';

interface WorkoutListItemProps {
    workout: Workout;
    onPress: (workout: Workout) => void;
}

const WorkoutListItem = ({ workout, onPress }: WorkoutListItemProps) => {
    return (
        <TouchableOpacity
            onPress={() => onPress(workout)}
            className="bg-surface_a10 p-4 rounded-xl mb-3"
            activeOpacity={0.7}
        >
            <Text className="text-white font-bold text-lg mb-1">
                {workout.name}
            </Text>
            {workout.created_at && (
                <Text className="text-gray-400 text-sm">
                    {formatReadableDate(workout.created_at)}
                </Text>
            )}
        </TouchableOpacity>
    );
};

export default WorkoutListItem;