// components/AddBodyWeightModal.tsx
import React, { useState } from 'react';
import { logger } from '@/utils/logger';
import { View, Text, TouchableOpacity, TextInput, Modal } from 'react-native';
import { Alert } from '@/utils/themedAlert';
import { createBodyWeightEntry } from '@/repositories/bodyWeightEntries';

interface AddBodyWeightModalProps {
    visible: boolean;
    onClose: () => void;
    onSuccess: () => void;
    userId: string;
}

export const AddBodyWeightModal: React.FC<AddBodyWeightModalProps> = ({
                                                                          visible,
                                                                          onClose,
                                                                          onSuccess,
                                                                          userId,
                                                                      }) => {
    const [newWeight, setNewWeight] = useState('');
    const [weightNotes, setWeightNotes] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSave = async () => {
        if (!newWeight || isNaN(parseFloat(newWeight))) {
            Alert.alert('Error', 'Please enter a valid weight');
            return;
        }

        setLoading(true);
        try {
            await createBodyWeightEntry({
                user_id: userId,
                weight: parseFloat(newWeight),
                recorded_at: new Date().toISOString(),
                notes: weightNotes || null,
            });

            setNewWeight('');
            setWeightNotes('');
            onClose();
            onSuccess();
            Alert.alert('Success', 'Body weight recorded');
        } catch (error) {
            logger.error('Error adding weight:', error);
            Alert.alert('Error', 'Failed to record weight');
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setNewWeight('');
        setWeightNotes('');
        onClose();
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={handleClose}
        >
            <View className="flex-1 bg-black/50 justify-center items-center px-4">
                <View className="bg-surface_a10 rounded-xl p-6 w-full max-w-sm">
                    <Text className="text-primary_a0 font-bold text-xl mb-4">Record Body Weight</Text>

                    <Text className="text-surface_a50 text-sm mb-2">Weight (kg)</Text>
                    <TextInput
                        value={newWeight}
                        onChangeText={setNewWeight}
                        keyboardType="decimal-pad"
                        placeholder="75.5"
                        placeholderTextColor="#666"
                        className="bg-surface_a20 text-light p-3 rounded-lg mb-4"
                        editable={!loading}
                    />

                    <Text className="text-surface_a50 text-sm mb-2">Notes (optional)</Text>
                    <TextInput
                        value={weightNotes}
                        onChangeText={setWeightNotes}
                        placeholder="Feeling good today..."
                        placeholderTextColor="#666"
                        className="bg-surface_a20 text-light p-3 rounded-lg mb-6"
                        multiline
                        numberOfLines={3}
                        editable={!loading}
                    />

                    <View className="flex-row gap-3">
                        <TouchableOpacity
                            onPress={handleClose}
                            className="flex-1 bg-surface_a20 py-3 rounded-lg"
                            activeOpacity={0.8}
                            disabled={loading}
                        >
                            <Text className="text-light text-center font-semibold">Cancel</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={handleSave}
                            className={`flex-1 py-3 rounded-lg ${loading ? 'bg-surface_a20' : 'bg-primary_a0'}`}
                            activeOpacity={0.8}
                            disabled={loading}
                        >
                            <Text className="text-white text-center font-semibold">
                                {loading ? 'Saving...' : 'Save'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};
