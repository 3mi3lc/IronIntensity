// components/deleteWorkoutModal.tsx
import React from 'react';
import { View, Text, TouchableOpacity, Modal } from 'react-native';
import { AntDesign } from '@expo/vector-icons';

interface DeleteWorkoutModalProps {
    visible: boolean;
    workoutName: string;
    onClose: () => void;
    onConfirm: () => void;
}

const DeleteWorkoutModal = ({
                                visible,
                                workoutName,
                                onClose,
                                onConfirm,
                            }: DeleteWorkoutModalProps) => {
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
                    {/* Warning Icon */}
                    <View className="items-center mb-4">
                        <View className="bg-primary_a0/20 p-4 rounded-full">
                            <AntDesign name="warning" size={40} color="#eb0202" />
                        </View>
                    </View>

                    {/* Header */}
                    <Text className="text-white font-bold text-2xl text-center mb-2">
                        Delete Workout?
                    </Text>

                    {/* Message */}
                    <View className="mb-6">
                        <Text className="text-surface_a50 text-center mb-3">
                            Are you sure you want to delete
                        </Text>
                        <Text className="text-white font-bold text-lg text-center mb-3">
                            &quot;{workoutName}&quot;
                        </Text>
                        <Text className="text-surface_a50 text-center text-sm">
                            This will permanently delete this workout and all its exercises and sets. This action cannot be undone.
                        </Text>
                    </View>

                    {/* Action Buttons */}
                    <View className="gap-y-3">
                        <TouchableOpacity
                            onPress={onConfirm}
                            className="bg-primary_a0 py-4 rounded-xl"
                            activeOpacity={0.8}
                        >
                            <Text className="text-white font-bold text-lg text-center">
                                Delete Workout
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={onClose}
                            className="bg-surface_a20 py-4 rounded-xl"
                            activeOpacity={0.8}
                        >
                            <Text className="text-white font-semibold text-lg text-center">
                                Cancel
                            </Text>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </TouchableOpacity>
        </Modal>
    );
};

export default DeleteWorkoutModal;