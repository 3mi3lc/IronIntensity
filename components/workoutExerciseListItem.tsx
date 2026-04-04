import { View, Text, TouchableOpacity } from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import SetListItem from './setListItem';
import { ExerciseWithSets } from '@/repositories/types';

type Props = {
    exerciseItem: ExerciseWithSets;
    exerciseMaxWeights?: Record<string, Record<number, number>>;
    onEditSet?: (setId: string, updates: { reps?: number; weight?: number; setNumber?: number }) => void;
    onDeleteSet?: (setId: string) => void;
    onAddSet?: (workoutExerciseId: string) => void;
    onDeleteExercise?: (workoutExerciseId: string) => void;
    onViewHistory?: (exerciseId: string, exerciseName: string) => void;
    viewOnly?: boolean;
};

const WorkoutExerciseItem = ({
                                 exerciseItem,
                                 exerciseMaxWeights,
                                 onEditSet,
                                 onDeleteSet,
                                 onAddSet,
                                 onDeleteExercise,
                                 onViewHistory,
                                 viewOnly = false
                             }: Props) => {
    const historicalMaxWeightByReps = exerciseMaxWeights?.[exerciseItem.exercise.id];

    // For each rep count, find the single best set (highest weight) that beats the
    // historical max. Only that one set gets the live PR badge.
    const livePrSetIds = (() => {
        if (viewOnly || !historicalMaxWeightByReps) return new Set<string>();
        const best = new Map<number, { id: string; weight: number }>();
        for (const set of exerciseItem.sets) {
            const historicalMax = historicalMaxWeightByReps[set.reps] ?? 0;
            const w = set.weight ?? 0;
            if (historicalMax > 0 && w > historicalMax) {
                const curr = best.get(set.reps);
                if (!curr || w > curr.weight) {
                    best.set(set.reps, { id: set.id, weight: w });
                }
            }
        }
        return new Set(Array.from(best.values()).map(v => v.id));
    })();
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

                    {/* History Button */}
                    {onViewHistory && (
                        <TouchableOpacity
                            onPress={() => onViewHistory(exerciseItem.exercise.id, exerciseItem.exercise.name)}
                            className="ml-3 "
                            activeOpacity={1}
                        >
                            <AntDesign name="clock-circle" size={20} color="#f34023" />
                        </TouchableOpacity>
                    )}

                    {/* Delete Icon */}
                    {!viewOnly && (
                        <TouchableOpacity
                            onPress={() => onDeleteExercise?.(exerciseItem.workoutExerciseId)}
                            className="ml-3"
                            activeOpacity={1}
                        >
                            <AntDesign name="delete" size={20} color="#f34023" />
                        </TouchableOpacity>
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
                            isPr={set.isPr === 1}
                            showLivePr={livePrSetIds.has(set.id)}
                            onEdit={(updates) => onEditSet?.(set.id, updates)}
                            onDelete={() => onDeleteSet?.(set.id)}
                            viewOnly={viewOnly}
                        />
                    ))
                ) : (
                    <View className="py-8 items-center">
                        <AntDesign name="info-circle" size={32} color="#3f3f3f" />
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