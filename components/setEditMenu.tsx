import React, { useEffect, useState } from 'react';
import { Modal, Pressable, Text, TextInput, View } from 'react-native';
import { AntDesign } from '@expo/vector-icons';

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

    const handleSave = () => {
        onSave(modalReps, modalWeight);
        onClose();
    };

    return (
        <Modal
            transparent
            animationType="fade"
            visible={visible}
            onRequestClose={onClose}
        >
            <Pressable
                onPress={onClose}
                className="flex-1 bg-black/70 justify-center items-center"
            >
                <Pressable
                    onPress={(event) => event.stopPropagation()}
                    className="bg-surface_a10 rounded-2xl w-[85%] overflow-hidden"
                    style={{
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 8 },
                        shadowOpacity: 0.3,
                        shadowRadius: 16,
                        elevation: 8,
                    }}
                >
                    {/* Header */}
                    <View className="bg-primary_a0 px-6 py-4 flex-row items-center justify-between">
                        <View className="flex-row items-center gap-3">
                            <View className="w-10 h-10 rounded-full bg-white/30 items-center justify-center">
                                <AntDesign name="edit" size={20} color="white" />
                            </View>
                            <Text className="text-white text-xl font-bold">Edit Set</Text>
                        </View>
                        <Pressable
                            onPress={onClose}
                            className="w-10 h-10 rounded-full bg-white/30 items-center justify-center active:bg-white/40"
                        >
                            <AntDesign name="close" size={20} color="white" />
                        </Pressable>
                    </View>

                    <View className="p-6">
                        {/* Reps Controls */}
                        <View className="mb-6">
                            <Text className="text-surface_a50 text-xs font-bold uppercase tracking-wider mb-3">
                                REPETITIONS
                            </Text>
                            <View className="flex-row items-center justify-between bg-surface_a20 rounded-xl p-2">
                                <Pressable
                                    onPress={decrementReps}
                                    className="w-12 h-12 rounded-xl bg-surface_a30 items-center justify-center active:bg-surface_a40"
                                >
                                    <AntDesign name="minus" size={20} color="#ff7857" />
                                </Pressable>

                                <View className="flex-1 mx-3">
                                    <TextInput
                                        keyboardType="numeric"
                                        value={modalReps}
                                        onChangeText={setModalReps}
                                        className="bg-surface_a30 text-white text-center rounded-xl px-2 py-2 text-2xl font-bold"
                                        placeholderTextColor="#8b8b8b"
                                    />
                                </View>

                                <Pressable
                                    onPress={incrementReps}
                                    className="w-12 h-12 rounded-xl bg-primary_a10 items-center justify-center active:bg-primary_a0"
                                >
                                    <AntDesign name="plus" size={20} color="white" />
                                </Pressable>
                            </View>
                        </View>

                        {/* Weight Controls */}
                        <View className="mb-6">
                            <Text className="text-surface_a50 text-xs font-bold uppercase tracking-wider mb-3">
                                WEIGHT (KG)
                            </Text>
                            <View className="flex-row items-center justify-between bg-surface_a20 rounded-xl p-2">
                                <Pressable
                                    onPress={decrementWeight}
                                    className="w-12 h-12 rounded-xl bg-surface_a30 items-center justify-center active:bg-surface_a40"
                                >
                                    <AntDesign name="minus" size={20} color="#ff7857" />
                                </Pressable>

                                <View className="flex-1 mx-3">
                                    <TextInput
                                        keyboardType="numeric"
                                        value={modalWeight}
                                        onChangeText={setModalWeight}
                                        className="bg-surface_a30 text-white text-center rounded-xl px-2 py-2 text-2xl font-bold"
                                        placeholderTextColor="#8b8b8b"
                                    />
                                </View>

                                <Pressable
                                    onPress={incrementWeight}
                                    className="w-12 h-12 rounded-xl bg-primary_a10 items-center justify-center active:bg-primary_a0"
                                >
                                    <AntDesign name="plus" size={20} color="white" />
                                </Pressable>
                            </View>
                        </View>

                        {/* Save Button */}
                        <Pressable
                            onPress={handleSave}
                            className="bg-primary_a0 rounded-xl py-4 flex-row items-center justify-center gap-2 active:bg-primary_a0"
                        >
                            <AntDesign name="check" size={20} color="white" />
                            <Text className="text-white text-base font-bold">Save Changes</Text>
                        </Pressable>
                    </View>
                </Pressable>
            </Pressable>
        </Modal>
    );
};

export default EditSetModal;