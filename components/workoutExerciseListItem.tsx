import { View, Text, TouchableOpacity  } from 'react-native';
import SetListItem from './setListItem';
import { ExerciseWithSets } from '@/repositories/types';

type Props = {
    exerciseItem: ExerciseWithSets;
    onEditSet?: (setId: string, updates: { reps?: number; weight?: number; setNumber?: number }) => void;
    onDeleteSet?: (setId: string) => void;
    onAddSet?: (workoutExerciseId: string) => void;
};

const WorkoutExerciseItem = ({ exerciseItem, onEditSet, onDeleteSet, onAddSet }: Props) => {
    return (
        <View className="w-full mb-6 border-b border-gray-300">
            <Text className="text-primary_a10 font-bold text-xl mb-2">
                {exerciseItem.orderIndex}.
                {exerciseItem.exercise.name}
            </Text>

            <View className="flex-row items-center mb-2">
                <View className="w-16">
                    <Text className="text-primary_a20 font-bold text-center">Sets</Text>
                </View>
                <View className="w-32 mx-2">
                    <Text className="text-primary_a20 font-bold text-center">Weights</Text>
                </View>
                <View className="w-20 mx-2">
                    <Text className="text-primary_a20 font-bold text-center">Reps</Text>
                </View>
                <View className="flex-1" />
            </View>

            {exerciseItem.sets.map((set) => (
                <SetListItem
                    key={set.id}
                    setNumber={set.setNumber}
                    reps={set.reps}
                    weight={set.weight ?? 0}
                    onEdit={(updates) => onEditSet?.(set.id, updates)}
                    onDelete={() => onDeleteSet?.(set.id)}
                />
            ))}

            <TouchableOpacity
                onPress={() => onAddSet?.(exerciseItem.workoutExerciseId)}
                className="mt-2 flex-row items-center space-x-2 justify-center space-y-8 px-4 py-3"
            >
                <Text className="text-primary_a10 font-medium">Add Set</Text>
            </TouchableOpacity>
        </View>
    );
};

export default WorkoutExerciseItem;
