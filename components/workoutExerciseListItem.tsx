import { View, Text, TouchableOpacity } from 'react-native';
import { ExerciseWithSets } from '@/repositories/types';
import SetListItem from './setListItem';


type Props = {
    exerciseItem: ExerciseWithSets;
    onEditSet?: (setId: string) => void;
    onDeleteSet?: (setId: string) => void;
    onAddSet?: (workoutExerciseId: string) => void;
};

const WorkoutExerciseItem = ({ exerciseItem, onEditSet, onDeleteSet, onAddSet }: Props) => {
    return (
        <View className="w-full px-4 mb-6">
            <Text className="text-primary_a10 font-bold text-xl mb-2">
                {exerciseItem.exercise.name}
            </Text>

            {exerciseItem.sets.map((set) => (
                <SetListItem
                    key={set.id}
                    setNumber={set.setNumber}
                    reps={set.reps}
                    weight={set.weight ?? 0}
                    onEdit={() => onEditSet?.(set.id)}
                    onDelete={() => onDeleteSet?.(set.id)}
                />
            ))}

            <TouchableOpacity
                onPress={() => onAddSet?.(exerciseItem.workoutExerciseId)}
                className="mt-2 flex-row items-center space-x-2"
            >
                <Text className="text-white font-medium">Add Set</Text>
            </TouchableOpacity>
        </View>
    );
};

export default WorkoutExerciseItem;
