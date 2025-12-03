import React, { useEffect, useState, useContext } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    ScrollView,
    Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useRouter } from 'expo-router';
import { createExercise } from '@/repositories/exercises';
import { getAllBodyParts } from '@/repositories/bodyParts';
import { addBodyPartToExercise } from '@/repositories/exerciseBodyParts';
import { UserContext } from '@/contexts/UserContext';
import type { BodyPart } from '@/repositories/types';
import ExerciseCreatedModal from "@/components/exerciseCreatedModal";

function CreateExercise() {
    const router = useRouter();
    const { user } = useContext(UserContext) ?? {};

    const [exerciseName, setExerciseName] = useState('');
    const [description, setDescription] = useState('');
    const [bodyParts, setBodyParts] = useState<BodyPart[]>([]);
    const [selectedBodyParts, setSelectedBodyParts] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);

    useEffect(() => {
        async function loadBodyParts() {
            setLoading(true);
            try {
                const parts = await getAllBodyParts();
                // Sort alphabetically
                const sortedParts = parts.sort((a, b) => a.name.localeCompare(b.name));
                setBodyParts(sortedParts);
            } catch (err) {
                console.error('Failed to load body parts:', err);
                Alert.alert('Error', 'Failed to load body parts');
            } finally {
                setLoading(false);
            }
        }

        loadBodyParts();
    }, []);

    const toggleBodyPart = (bodyPartId: string) => {
        setSelectedBodyParts((prev) => {
            const newSet = new Set(prev);
            if (newSet.has(bodyPartId)) {
                newSet.delete(bodyPartId);
            } else {
                newSet.add(bodyPartId);
            }
            return newSet;
        });
    };

    const handleSave = async () => {
        // Validation
        if (!exerciseName.trim()) {
            Alert.alert('Validation Error', 'Please enter an exercise name');
            return;
        }

        if (selectedBodyParts.size === 0) {
            Alert.alert('Validation Error', 'Please select at least one body part');
            return;
        }

        if (!user) {
            Alert.alert('Error', 'You must be logged in to create an exercise');
            return;
        }

        setSaving(true);
        try {
            // Create the exercise
            const newExercise = await createExercise(
                {
                    name: exerciseName.trim(),
                    description: description.trim() || null,
                    user_id: user.id,
                    deleted_at: null,
                },
                { returnData: true }
            );

            if (!newExercise || typeof newExercise === 'boolean') {
                throw new Error('Failed to create exercise');
            }

            // Link exercise to selected body parts
            const linkPromises = Array.from(selectedBodyParts).map((bodyPartId) =>
                addBodyPartToExercise(newExercise.id, bodyPartId)
            );

            await Promise.all(linkPromises);

            setShowSuccess(true);

        } catch (err) {
            console.error('Failed to create exercise:', err);
            Alert.alert('Error', 'Failed to create exercise. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    const handleSuccessClose = () => {
        setShowSuccess(false);
        router.back();
    };

    if (loading) {
        return (
            <View className="flex-1 justify-center items-center bg-surface_a0 pt-16">
                <Text className="text-white text-3xl font-bold">Loading...</Text>
            </View>
        );
    }

    return (
        <SafeAreaView className="flex-1 bg-surface_a0 pt-4">
            <ScrollView className="flex-1 px-4">
                <Text className="text-primary_a0 font-bold text-3xl mb-6">
                    Create Exercise
                </Text>

                {/* Exercise Name Input */}
                <View className="mb-6">
                    <Text className="text-white font-semibold text-lg mb-2">
                        Exercise Name *
                    </Text>
                    <TextInput
                        value={exerciseName}
                        onChangeText={setExerciseName}
                        placeholder="e.g., Barbell Bench Press"
                        placeholderTextColor="#666"
                        className="bg-surface_a10 text-white px-4 py-3 rounded-lg text-base"
                        maxLength={100}
                    />
                </View>

                {/* Description Input */}
                <View className="mb-6">
                    <Text className="text-white font-semibold text-lg mb-2">
                        Description (Optional)
                    </Text>
                    <TextInput
                        value={description}
                        onChangeText={setDescription}
                        placeholder="Add notes about form, variations, etc."
                        placeholderTextColor="#666"
                        className="bg-surface_a10 text-white px-4 py-3 rounded-lg text-base"
                        multiline
                        numberOfLines={4}
                        textAlignVertical="top"
                        maxLength={500}
                    />
                </View>

                {/* Body Parts Selection */}
                <View className="mb-6">
                    <Text className="text-white font-semibold text-lg mb-3">
                        Target Body Parts * ({selectedBodyParts.size} selected)
                    </Text>
                    <View className="bg-surface_a10 rounded-lg p-2">
                        {bodyParts.map((bodyPart) => {
                            const isSelected = selectedBodyParts.has(bodyPart.id);
                            return (
                                <TouchableOpacity
                                    key={bodyPart.id}
                                    onPress={() => toggleBodyPart(bodyPart.id)}
                                    className={`flex-row justify-between items-center px-4 py-3 rounded-lg mb-2 ${
                                        isSelected ? 'bg-primary_a10' : 'bg-surface_a20'
                                    }`}
                                    activeOpacity={0.7}
                                >
                                    <Text
                                        className={`font-medium text-base ${
                                            isSelected ? 'text-white' : 'text-gray-200'
                                        }`}
                                    >
                                        {bodyPart.name}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </View>

                {/* Action Buttons */}
                <View className="flex-row justify-between mb-8 mt-4">
                    <TouchableOpacity
                        onPress={() => router.back()}
                        className="flex-1 bg-surface_a20 py-4 rounded-xl mr-2"
                        activeOpacity={0.8}
                    >
                        <Text className="text-white font-bold text-center text-lg">
                            Cancel
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={handleSave}
                        disabled={saving}
                        className={`flex-1 py-4 rounded-xl ml-2 ${
                            saving ? 'bg-primary_a10/50' : 'bg-primary_a10'
                        }`}
                        activeOpacity={0.8}
                    >
                        <Text className="text-white font-bold text-center text-lg">
                            {saving ? 'Creating...' : 'Create Exercise'}
                        </Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>

            <ExerciseCreatedModal
                visible={showSuccess}
                exerciseName={exerciseName}
                onClose={handleSuccessClose}
            />
        </SafeAreaView>
    );
}

export default CreateExercise;