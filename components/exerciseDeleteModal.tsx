import { Modal, View, Text, TouchableOpacity } from 'react-native';

export default function ExerciseDeleteModal({
                                                visible,
                                                exerciseName,
                                                onCancel,
                                                onConfirm,
                                            }: {
    visible: boolean;
    exerciseName: string;
    onCancel: () => void;
    onConfirm: () => void;
}) {
    return (
        <Modal transparent visible={visible} animationType="fade">
            <View className="flex-1 justify-center items-center bg-black/50">
                <View className="bg-surface_a10 rounded-2xl p-6 w-80">
                    <Text className="text-white font-bold text-xl mb-3">
                        Delete Exercise
                    </Text>

                    <Text className="text-gray-300 mb-4">
                        Are you sure you want to remove{" "}
                        <Text className="text-white font-bold">
                            {exerciseName}
                        </Text>{" "}
                        from this workout?
                    </Text>

                    <View className="flex-row mt-2">
                        <TouchableOpacity
                            onPress={onCancel}
                            className="flex-1 py-3 rounded-xl bg-surface_a20 mr-2"
                        >
                            <Text className="text-white text-center font-bold">Cancel</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={onConfirm}
                            className="flex-1 py-3 rounded-xl bg-red-600 ml-2"
                        >
                            <Text className="text-white text-center font-bold">Delete</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}
