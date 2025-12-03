import React from 'react';
import { View, Text, TouchableOpacity, Modal } from 'react-native';
import { AntDesign } from '@expo/vector-icons';

interface WorkoutOptionsModalProps {
    visible: boolean;
    workoutName: string;
    onClose: () => void;
    onPerformAgain: () => void;
    onViewWorkout: () => void;
}

const WorkoutOptionsModal = ({
                                 visible,
                                 workoutName,
                                 onClose,
                                 onPerformAgain,
                                 onViewWorkout,
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
                        <TouchableOpacity
                            onPress={onPerformAgain}
                            className="bg-primary_a10 py-4 px-6 rounded-xl flex-row items-center"
                            activeOpacity={0.8}
                        >
                            <AntDesign name="reload1" size={20} color="white" />
                            <Text className="text-white font-bold text-lg ml-3">
                                Perform Again
                            </Text>
                        </TouchableOpacity>

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

                    <Text className="text-gray-400 text-sm text-center mt-4">
                        Perform Again creates a new workout with the same exercises
                    </Text>
                </TouchableOpacity>
            </TouchableOpacity>
        </Modal>
    );
};

export default WorkoutOptionsModal;