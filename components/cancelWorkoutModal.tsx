import React from 'react';
import { View, Text, TouchableOpacity, Modal } from 'react-native';
import { AntDesign } from '@expo/vector-icons';

interface CancelWorkoutModalProps {
    visible: boolean;
    onClose: () => void;
    onConfirm: () => void;
}

const CancelWorkoutModal = ({
                                visible,
                                onClose,
                                onConfirm,
                            }: CancelWorkoutModalProps) => {
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
                className="flex-1 justify-center items-center bg-black/70"
            >
                <TouchableOpacity
                    activeOpacity={1}
                    onPress={(e) => e.stopPropagation()}
                    className="bg-surface_a10 rounded-2xl p-6 mx-6 w-80"
                >
                    {/* Icon */}
                    <View className="items-center mb-4">
                        <View className="bg-primary_a10/20 p-4 rounded-full">
                            <AntDesign name="warning" size={48} color="#f34023" />
                        </View>
                    </View>

                    {/* Title */}
                    <Text className="text-light font-bold text-2xl text-center mb-3">
                        Cancel Workout?
                    </Text>

                    {/* Description */}
                    <Text className="text-surface_a50 text-base text-center mb-6">
                        Are you sure you want to cancel this workout? All progress will be lost.
                    </Text>

                    {/* Buttons */}
                    <View className="space-y-3">
                        <TouchableOpacity
                            onPress={onConfirm}
                            className="bg-primary_a10 py-4 px-6 rounded-xl"
                            activeOpacity={0.8}
                        >
                            <Text className="text-light font-bold text-lg text-center">
                                Yes, Cancel Workout
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={onClose}
                            className="bg-surface_a20 py-4 px-6 rounded-xl"
                            activeOpacity={0.8}
                        >
                            <Text className="text-light font-bold text-lg text-center">
                                Keep Editing
                            </Text>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </TouchableOpacity>
        </Modal>
    );
};

export default CancelWorkoutModal;