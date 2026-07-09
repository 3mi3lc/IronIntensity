// components/workoutOptionsModal.tsx
import React from 'react';
import { View, Text, TouchableOpacity, Modal } from 'react-native';
import { AntDesign } from '@expo/vector-icons';

interface WorkoutOptionsModalProps {
    visible: boolean;
    workoutId: string;
    workoutName: string;
    onClose: () => void;
    onPerformAgain: () => void;
    onViewWorkout: () => void;
    onEditWorkout: () => void;
}

const WorkoutOptionsModal = ({
                                 visible,
                                 workoutId,
                                 workoutName,
                                 onClose,
                                 onPerformAgain,
                                 onViewWorkout,
                                 onEditWorkout,
                             }: WorkoutOptionsModalProps) => {
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
                        <Text className="text-white font-bold text-xl flex-1" numberOfLines={1}>
                            {workoutName}
                        </Text>
                        <TouchableOpacity onPress={onClose} className="ml-2">
                            <AntDesign name="close" size={24} color="#999" />
                        </TouchableOpacity>
                    </View>

                    {/* Options */}
                    <View className="gap-y-3">
                        {/* Perform Again */}
                        <TouchableOpacity
                            onPress={onPerformAgain}
                            className="bg-primary_a0 py-4 px-6 rounded-xl flex-row items-center"
                            activeOpacity={0.8}
                        >
                            <AntDesign name="reload" size={20} color="white" />
                            <Text className="text-white font-bold text-lg ml-3">
                                Perform Again
                            </Text>
                        </TouchableOpacity>

                        {/* Edit Workout */}
                        <TouchableOpacity
                            onPress={onEditWorkout}
                            className="bg-surface_a20 py-4 px-6 rounded-xl flex-row items-center"
                            activeOpacity={0.8}
                        >
                            <AntDesign name="edit" size={20} color="white" />
                            <Text className="text-white font-bold text-lg ml-3">
                                Edit Workout
                            </Text>
                        </TouchableOpacity>

                        {/* View Workout */}
                        <TouchableOpacity
                            onPress={onViewWorkout}
                            className="bg-surface_a20 py-4 px-6 rounded-xl flex-row items-center"
                            activeOpacity={0.8}
                        >
                            <AntDesign name="eye" size={20} color="white" />
                            <Text className="text-white font-bold text-lg ml-3">
                                View Workout
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {/* Info text */}
                    <View className="mt-4 bg-surface_a20 p-3 rounded-xl">
                        <Text className="text-surface_a50 text-xs text-center">
                            <Text className="font-bold">Perform Again:</Text> Creates a new workout with the same exercises{'\n'}
                            <Text className="font-bold">Edit:</Text> Modify this workout&apos;s details{'\n'}
                            <Text className="font-bold">View:</Text> See workout in read-only mode
                        </Text>
                    </View>
                </TouchableOpacity>
            </TouchableOpacity>
        </Modal>
    );
};

export default WorkoutOptionsModal;