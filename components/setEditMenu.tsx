import React, {useEffect, useState} from 'react';
import { Modal, Pressable, Text, TextInput, View } from 'react-native';

interface EditSetModalProps {
    visible: boolean;
    onClose: () => void;
    onSave: (reps: string, weight: string) => void;
    initialReps: string;
    initialWeight: string;
}

const EditSetModal: React.FC<EditSetModalProps> = ({
                                                       visible,
                                                       onClose,
                                                       onSave,
                                                       initialReps,
                                                       initialWeight,
                                                   }) => {
    const [modalReps, setModalReps] = useState(initialReps);
    const [modalWeight, setModalWeight] = useState(initialWeight);

    useEffect(() => {
        setModalReps(initialReps);
        setModalWeight(initialWeight);
    }, [initialReps, initialWeight, visible]);

    const decrementReps = () => {
        const val = Math.max(0, (parseInt(modalReps) || 0) - 1);
        setModalReps(val.toString());
    };

    const incrementReps = () => {
        const val = (parseInt(modalReps) || 0) + 1;
        setModalReps(val.toString());
    };

    const decrementWeight = () => {
        const val = Math.max(0, (parseFloat(modalWeight) || 0) - 2.5);
        setModalWeight(val.toFixed(1));
    };

    const incrementWeight = () => {
        const val = (parseFloat(modalWeight) || 0) + 2.5;
        setModalWeight(val.toFixed(1));
    };

    return (
        <Modal transparent animationType="fade" visible={visible} onRequestClose={onClose}>
            <Pressable
                onPress={() => {
                    onSave(modalReps, modalWeight); // Save current changes
                    onClose();                      // Then close the modal
                }}
                className="flex-1 bg-black/50 justify-center items-center"
            >
                {/* This inner Pressable prevents the press from bubbling up */}
                <Pressable
                    onPress={(event) => event.stopPropagation()}
                    className="bg-surface_a30 p-6 rounded-lg w-4/5"
                >
                    <Text className="text-white text-lg font-semibold mb-6 text-center">Edit Set</Text>

                    {/* Reps Controls */}
                    {/* Reps Controls */}
                    <View className="flex-row items-center mb-4">
                        <Text className="text-white font-bold w-24">Edit Reps</Text>

                        <View className="flex-row items-center space-x-4">
                            <Pressable
                                onPress={decrementReps}
                                className="w-10 h-10 rounded bg-surface_a30 items-center justify-center"
                                android_ripple={{ color: 'rgba(249,94,61,0.3)', borderless: true, radius: 20 }}
                            >
                                <Text className="text-primary_a20 text-2xl">−</Text>
                            </Pressable>

                            <TextInput
                                keyboardType="numeric"
                                value={modalReps}
                                onChangeText={setModalReps}
                                className="bg-surface_a40 text-white text-center rounded w-16 h-12  "
                            />

                            <Pressable
                                onPress={incrementReps}
                                className="w-10 h-10 rounded bg-surface_a30 items-center justify-center"
                                android_ripple={{ color: 'rgba(249,94,61,0.3)', borderless: true, radius: 20 }}
                            >
                                <Text className="text-primary_a20 text-2xl">+</Text>
                            </Pressable>
                        </View>
                    </View>

                    {/* Weight Controls */}
                    <View className="flex-row items-center mb-6">
                        <Text className="text-white font-bold w-24">Edit Weight</Text>

                        <View className="flex-row items-center space-x-4">
                            <Pressable
                                onPress={decrementWeight}
                                className="w-10 h-10 rounded bg-surface_a30 items-center justify-center"
                                android_ripple={{ color: 'rgba(249,94,61,0.3)', borderless: true, radius: 20 }}
                            >
                                <Text className="text-primary_a20 text-2xl">−</Text>
                            </Pressable>

                            <TextInput
                                keyboardType="numeric"
                                value={modalWeight}
                                onChangeText={setModalWeight}
                                className="bg-surface_a40 text-white text-center rounded w-16 h-12   "
                            />

                            <Pressable
                                onPress={incrementWeight}
                                android_ripple={{ color: 'rgba(249,94,61,0.3)', borderless: true, radius: 20 }}
                                className="w-10 h-10 rounded bg-surface_a30 items-center justify-center"
                                style={({ pressed }) => ({
                                    opacity: pressed ? 0.6 : 1,
                                })}
                            >
                                <Text className="text-primary_a20 text-2xl">+</Text>
                            </Pressable>
                        </View>
                    </View>
                </Pressable>
            </Pressable>
        </Modal>

    );
};

export default EditSetModal;
