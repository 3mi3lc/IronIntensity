import React, { useState, useEffect } from 'react';
import {View, Text, Pressable, } from 'react-native';
import SetOptionsMenu from "@/components/setOptionsMenu";
import SetEditModal from "@/components/setEditMenu";

interface SetListItemProps {
    setNumber: number;
    reps: number;
    weight?: number | null;
    onRepsChange?: (newReps: number) => void;
    onWeightChange?: (newWeight: number | null) => void;
    onEdit?: () => void;
    onDelete?: () => void;
}

export default function SetListItem({
                                        setNumber,
                                        reps: initialReps,
                                        weight: initialWeight,
                                        onRepsChange,
                                        onWeightChange,
                                        onEdit,
                                        onDelete,
                                    }: SetListItemProps) {
    const [reps, setReps] = useState(String(initialReps));
    const [weight, setWeight] = useState(initialWeight !== null && initialWeight !== undefined ? String(initialWeight) : '');
    const [menuVisible, setMenuVisible] = React.useState(false);
    const [editModalVisible, setEditModalVisible] = React.useState(false);

    // Keep internal state in sync if props change from parent
    useEffect(() => {
        setReps(String(initialReps));
    }, [initialReps]);

    useEffect(() => {
        setWeight(initialWeight !== null && initialWeight !== undefined ? String(initialWeight) : '');
    }, [initialWeight]);

    const handleRepsChange = (text: string) => {
        setReps(text);
        const val = parseInt(text, 10);
        if (!isNaN(val) && onRepsChange) {
            onRepsChange(val);
        }
    };

    const handleWeightChange = (text: string) => {
        setWeight(text);
        if (text === '') {
            onWeightChange?.(null);
            return;
        }
        const val = parseFloat(text);
        if (!isNaN(val) && onWeightChange) {
            onWeightChange(val);
        }
    };

    return (
        <>
            <View className="flex-row my-1 p-4 mx-4 bg-surface_a20 rounded-lg items-center">
                <View className="flex-1">
                    <View className="flex-row items-center justify-between">
                        <Text className="text-white font-bold">Set 1</Text>

                        {/* Reps Display */}
                        <Pressable
                            onPress={() => setEditModalVisible(true)}
                            className="bg-surface_a30 rounded w-14 h-10 justify-center items-center mx-2"
                        >
                            <Text className="text-white text-center">{reps}</Text>
                        </Pressable>

                        {/* Weight Display */}
                        <Pressable
                            onPress={() => setEditModalVisible(true)}
                            className="bg-surface_a30 rounded w-14 h-10 justify-center items-center mx-2"
                        >
                            <Text className="text-white text-center">{weight}</Text>
                        </Pressable>

                        {/* Three dot menu */}
                        <View className="flex-row items-center space-x-2">
                            <Pressable
                                onPress={() => setMenuVisible(true)}
                                className="px-2 py-1 rounded"
                            >
                                <Text className="text-white text-2xl">⋮</Text>
                            </Pressable>
                            <SetOptionsMenu
                                visible={menuVisible}
                                onClose={() => setMenuVisible(false)}
                                onDelete={() => {
                                    setMenuVisible(false);
                                    // handle delete
                                }}
                            />
                        </View>
                    </View>
                </View>
            </View>

            <SetEditModal
                visible={editModalVisible}
                onClose={() => setEditModalVisible(false)}
                initialReps={reps}
                initialWeight={weight}
                onSave={(newReps, newWeight) => {
                    setReps(newReps);
                    setWeight(newWeight);
                }}
            />
        </>
    );
}
