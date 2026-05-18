// components/UnfinishedWorkoutModal.tsx
import React from 'react';
import { Modal, View, Text, Pressable } from 'react-native';
import { AntDesign } from '@expo/vector-icons';

interface UnfinishedWorkoutModalProps {
    visible: boolean;
    workoutName: string;
    workoutDate: string;
    onContinue: () => void;
    onSave: () => void;
    onDiscard: () => void;
}

const UnfinishedWorkoutModal = ({
                                    visible,
                                    workoutName,
                                    workoutDate,
                                    onContinue,
                                    onSave,
                                    onDiscard,
                                }: UnfinishedWorkoutModalProps) => {
    return (
        <Modal
            visible={visible}
            animationType="fade"
            transparent={true}
            onRequestClose={onDiscard}
        >
            <View className="flex-1 justify-center items-center bg-black/70 px-4">
                <View
                    className="bg-surface_a10 rounded-2xl w-full max-w-md overflow-hidden"
                    style={{
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 8 },
                        shadowOpacity: 0.3,
                        shadowRadius: 16,
                        elevation: 8,
                    }}
                >
                    {/* Header */}
                    <View className="bg-primary_a10 px-6 py-4 flex-row items-center gap-3">
                        <View className="w-10 h-10 rounded-full bg-white/20 items-center justify-center">
                            <AntDesign name="warning" size={20} color="white" />
                        </View>
                        <View>
                            <Text className="text-white text-xl font-bold">Unfinished Workout</Text>
                            <Text className="text-white/70 text-xs mt-0.5">You left a workout incomplete</Text>
                        </View>
                    </View>

                    {/* Body */}
                    <View className="p-6">
                        {/* Workout Info */}
                        <View className="bg-surface_a20 rounded-xl p-4 mb-6 flex-row items-center gap-4">
                            <View className="w-10 h-10 rounded-full bg-primary_a0/20 items-center justify-center">
                                <AntDesign name="calendar" size={20} color="#f34023" />
                            </View>
                            <View>
                                <Text className="text-white font-bold text-base">{workoutName}</Text>
                                <Text className="text-surface_a50 text-xs mt-0.5">{workoutDate}</Text>
                            </View>
                        </View>

                        {/* Actions */}
                        <View className="gap-3">
                            {/* Save as Completed - PRIMARY */}
                            <Pressable
                                onPress={onSave}
                                className="bg-primary_a10 rounded-xl py-4 flex-row items-center justify-center gap-2 active:bg-primary_a0"
                            >
                                <AntDesign name="check-circle" size={20} color="white" />
                                <Text className="text-white font-bold text-base">Save as Completed</Text>
                            </Pressable>

                            {/* Continue - SECONDARY */}
                            <Pressable
                                onPress={onContinue}
                                className="bg-surface_a20 rounded-xl py-4 flex-row items-center justify-center gap-2 active:bg-surface_a30"
                            >
                                <AntDesign name="play-circle" size={20} color="#8b8b8b" />
                                <Text className="text-surface_a50 font-bold text-base">Continue Workout</Text>
                            </Pressable>

                            {/* Discard - DESTRUCTIVE */}
                            <Pressable
                                onPress={onDiscard}
                                className="bg-surface_a20 rounded-xl py-4 flex-row items-center justify-center gap-2 active:bg-surface_a30"
                            >
                                <AntDesign name="delete" size={20} color="#eb0202" />
                                <Text className="text-primary_a0 font-bold text-base">Discard Workout</Text>
                            </Pressable>
                        </View>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

export default UnfinishedWorkoutModal;