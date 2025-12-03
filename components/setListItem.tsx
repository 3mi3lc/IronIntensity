import React, { useState, useEffect } from 'react';
import { View, Text, Pressable } from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import SetOptionsMenu from "@/components/setOptionsMenu";
import SetEditModal from "@/components/setEditMenu";

interface SetListItemProps {
    setNumber: number;
    reps: number;
    weight?: number | null;
    onEdit?: (updates: { reps?: number; weight?: number; setNumber?: number }) => void;
    onDelete?: () => void;
    viewOnly?: boolean;
}

export default function SetListItem({
                                        setNumber,
                                        reps: initialReps,
                                        weight: initialWeight,
                                        onEdit,
                                        onDelete,
                                        viewOnly = false,
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
            <View className="flex-row my-1.5 px-4 py-3 bg-surface_a10 rounded-xl items-center">
                {/* Set Number Badge */}
                <View className="bg-primary_a10/20 px-3 py-1.5 rounded-lg mr-3">
                    <Text className="text-primary_a10 font-bold text-sm">#{setNumber}</Text>
                </View>

                {/* Reps */}
                <Pressable
                    onPress={viewOnly ? undefined : () => setEditModalVisible(true)}
                    disabled={viewOnly}
                    className={`flex-1 mx-1 ${viewOnly ? '' : 'active:opacity-70'}`}
                >
                    <View className="bg-surface_a20 rounded-lg px-3 py-1">
                        <Text className="text-surface_a50 text-xs mb-0.5">REPS</Text>
                        <Text className="text-light font-bold text-lg">{reps}</Text>
                    </View>
                </Pressable>

                {/* Weight */}
                <Pressable
                    onPress={viewOnly ? undefined : () => setEditModalVisible(true)}
                    disabled={viewOnly}
                    className={`flex-1 mx-1 ${viewOnly ? '' : 'active:opacity-70'}`}
                >
                    <View className="bg-surface_a20 rounded-lg px-3 py-1">
                        <Text className="text-surface_a50 text-xs mb-0.5">KG</Text>
                        <Text className="text-light font-bold text-lg">{weight || '0'}</Text>
                    </View>
                </Pressable>

                {/* Menu Button */}
                {!viewOnly && (
                    <Pressable
                        onPress={() => setMenuVisible(true)}
                        className="ml-2 p-2 bg-surface_a20 rounded-lg active:opacity-70"
                    >
                        <AntDesign name="ellipsis" size={20} color="#8b8b8b" />
                    </Pressable>
                )}
            </View>

            {/* Options Menu */}
            {!viewOnly && (
                <SetOptionsMenu
                    visible={menuVisible}
                    onClose={() => setMenuVisible(false)}
                    onDelete={() => {
                        setMenuVisible(false);
                        onDelete?.();
                    }}
                />
            )}

            {/* Edit Modal */}
            {!viewOnly && (
                <SetEditModal
                    visible={editModalVisible}
                    onClose={() => setEditModalVisible(false)}
                    initialReps={String(initialReps)}
                    initialWeight={initialWeight != null ? String(initialWeight) : ""}
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
            )}
        </>
    );
}