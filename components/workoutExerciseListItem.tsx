import { View, Text, TouchableOpacity } from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import SetListItem from './setListItem';
import { ExerciseWithSets } from '@/repositories/types';

type Props = {
    exerciseItem: ExerciseWithSets;
    onEditSet?: (setId: string, updates: { reps?: number; weight?: number; setNumber?: number }) => void;
    onDeleteSet?: (setId: string) => void;
    onAddSet?: (workoutExerciseId: string) => void;
    viewOnly?: boolean;
};

const WorkoutExerciseItem = ({
                                 exerciseItem,
                                 onEditSet,
                                 onDeleteSet,
                                 onAddSet,
                                 viewOnly = false
                             }: Props) => {
    return (
        <View className="mb-6 bg-surface_a10 rounded-2xl overflow-hidden shadow-lg">
            {/* Exercise Header */}
            <View className="bg-surface_a20 px-5 py-4">
                <View className="flex-row items-center">
                    {/* Order Badge */}
                    <View className="bg-primary_a10 w-8 h-8 rounded-full items-center justify-center mr-3">
                        <Text className="text-light font-bold text-sm">{exerciseItem.orderIndex}</Text>
                    </View>

                    {/* Exercise Name */}
                    <Text className="text-light font-bold text-lg flex-1" numberOfLines={2}>
                        {exerciseItem.exercise.name}
                    </Text>

                    {/* Drag Handle Icon (optional - you can remove if not needed) */}
                    {!viewOnly && (
                        <View className="ml-2">
                            <AntDesign name="menufold" size={20} color="#8b8b8b" />
                        </View>
                    )}
                </View>

                {/* Description if exists */}
                {exerciseItem.exercise.description && (
                    <Text className="text-surface_a50 text-sm mt-2" numberOfLines={2}>
                        {exerciseItem.exercise.description}
                    </Text>
                )}
            </View>

            {/* Sets Container */}
            <View className="px-3 py-3">
                {/* Column Headers */}
                <View className="flex-row items-center px-4 mb-2">
                    <View className="w-12">
                        <Text className="text-surface_a50 text-xs font-bold">SET</Text>
                    </View>
                    <View className="flex-1 mx-1">
                        <Text className="text-surface_a50 text-xs font-bold text-center">REPS</Text>
                    </View>
                    <View className="flex-1 mx-1">
                        <Text className="text-surface_a50 text-xs font-bold text-center">WEIGHT</Text>
                    </View>
                    <View className="w-10" />
                </View>

                {/* Sets List */}
                {exerciseItem.sets.length > 0 ? (
                    exerciseItem.sets.map((set) => (
                        <SetListItem
                            key={set.id}
                            setNumber={set.setNumber}
                            reps={set.reps}
                            weight={set.weight ?? 0}
                            onEdit={(updates) => onEditSet?.(set.id, updates)}
                            onDelete={() => onDeleteSet?.(set.id)}
                            viewOnly={viewOnly}
                        />
                    ))
                ) : (
                    <View className="py-8 items-center">
                        <AntDesign name="infocirlceo" size={32} color="#3f3f3f" />
                        <Text className="text-surface_a50 text-sm mt-2">No sets yet</Text>
                    </View>
                )}

                {/* Add Set Button */}
                {!viewOnly && (
                    <TouchableOpacity
                        onPress={() => onAddSet?.(exerciseItem.workoutExerciseId)}
                        className="mt-3 mb-1 bg-primary_a10/10 border border-primary_a10 border-dashed py-3 rounded-xl active:opacity-70"
                    >
                        <View className="flex-row items-center justify-center">
                            <AntDesign name="plus" size={18} color="#f34023" />
                            <Text className="text-primary_a10 font-bold ml-2">Add Set</Text>
                        </View>
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
};

export default WorkoutExerciseItem;