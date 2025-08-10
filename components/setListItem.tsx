import React, { useState, useEffect } from 'react';
import {View, Text, Pressable, } from 'react-native';
import SetOptionsMenu from "@/components/setOptionsMenu";
import SetEditModal from "@/components/setEditMenu";

interface SetListItemProps {
    setNumber: number;
    reps: number;
    weight?: number | null;
    onEdit?: (updates: { reps?: number; weight?: number ; setNumber?: number }) => void;
    onDelete?: () => void;
}

export default function SetListItem({
                                        setNumber,
                                        reps: initialReps,
                                        weight: initialWeight,
                                        onEdit,
                                        onDelete,
                                    }: SetListItemProps) {
    const [reps, setReps] = useState(String(initialReps));
    const [weight, setWeight] = useState(
        initialWeight !== null && initialWeight !== undefined ? String(initialWeight) : ""
    );
    const [menuVisible, setMenuVisible] = useState(false);
    const [editModalVisible, setEditModalVisible] = useState(false);

    useEffect(() => {
        setReps(String(initialReps));
    }, [initialReps]);

    useEffect(() => {
        setWeight(
            initialWeight !== null && initialWeight !== undefined ? String(initialWeight) : ""
        );
    }, [initialWeight]);

    return (
        <>
            <View className="flex-row my-1 p-3 bg-surface_a20 rounded-lg items-center">
                <View className="flex-1">
                    <View className="flex-row items-center justify-between">
                        <Text className="text-white font-bold">Set {setNumber}</Text>

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
                                    onDelete?.();
                                }}
                            />
                        </View>
                    </View>
                </View>
            </View>

            {/* Edit modal */}
            <SetEditModal
                visible={editModalVisible}
                onClose={() => setEditModalVisible(false)}
                initialReps={reps}
                initialWeight={weight}
                onSave={(newReps, newWeight) => {
                    const parsedReps = parseInt(newReps, 10);
                    const parsedWeight = parseFloat(newWeight);

                    setReps(String(parsedReps));
                    setWeight(String(parsedWeight));

                    onEdit?.({
                        reps: parsedReps,
                        weight: parsedWeight,
                    });
                }}
            />
        </>
    );
}

