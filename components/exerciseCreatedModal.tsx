import React from 'react';
import { View, Text, TouchableOpacity, Modal } from 'react-native';
import { AntDesign } from '@expo/vector-icons';

interface ExerciseCreatedModalProps {
    visible: boolean;
    exerciseName: string;
    onClose: () => void;
}

const ExerciseCreatedModal = ({
                                  visible,
                                  exerciseName,
                                  onClose,
                              }: ExerciseCreatedModalProps) => {
    return (
        <Modal
            animationType="fade"
            transparent={true}
            visible={visible}
            onRequestClose={onClose}
        >
            <TouchableOpacity
                activeOpacity={1}
                onPress={onClose}
                className="flex-1 justify-center items-center bg-black/50"
            >
                <TouchableOpacity
                    activeOpacity={1}
                    onPress={(e) => e.stopPropagation()}
                    className="bg-surface_a10 rounded-2xl p-6 mx-6 w-80"
                >
                    {/* Header */}
                    <View className="flex-row justify-between items-center mb-4">
                        <Text
                            className="text-white font-bold text-xl flex-1"
                            numberOfLines={1}
                        >
                            Exercise Created
                        </Text>

                        <TouchableOpacity onPress={onClose} className="ml-2">
                            <AntDesign name="close" size={24} color="#999" />
                        </TouchableOpacity>
                    </View>

                    {/* Content */}
                    <Text className="text-gray-200 text-base text-center mb-4">
                        <Text className="font-bold text-white">{exerciseName}</Text> was created successfully.
                    </Text>

                    {/* Action */}
                    <TouchableOpacity
                        onPress={onClose}
                        className="bg-primary_a10 py-4 px-6 rounded-xl"
                        activeOpacity={0.8}
                    >
                        <Text className="text-white font-bold text-lg text-center">
                            OK
                        </Text>
                    </TouchableOpacity>
                </TouchableOpacity>
            </TouchableOpacity>
        </Modal>
    );
};

export default ExerciseCreatedModal;
