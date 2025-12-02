import { View, Text, TouchableOpacity, SafeAreaView, ScrollView, Alert } from 'react-native';
import React, { useEffect, useState } from 'react';
import { AntDesign } from '@expo/vector-icons';
import { useRouter, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { getAllExercisesWithBodyPart } from '@/repositories/exercises';
import { addExerciseToWorkoutById } from '@/repositories/workoutExercises';
import type { BodypartWithExercises } from '@/repositories/types';

type BodyPartSection = BodypartWithExercises & {
    expanded: boolean;
};

function AddExercise() {
    const router = useRouter();
    const { workoutId } = useLocalSearchParams<{ workoutId?: string }>();
    const [bodyPartSections, setBodyPartSections] = useState<BodyPartSection[]>([]);
    const [loading, setLoading] = useState(true);
    const [addingExercise, setAddingExercise] = useState(false);

    const loadData = async () => {
        setLoading(true);
        try {
            const sections = await getAllExercisesWithBodyPart();

            // Sort body parts alphabetically
            const sortedSections = sections.sort((a, b) =>
                a.name.localeCompare(b.name)
            );

            // Initialize all sections as collapsed
            const sectionsWithExpanded = sortedSections.map((s) => ({
                ...s,
                expanded: false,
            }));

            setBodyPartSections(sectionsWithExpanded);
        } catch (err) {
            console.error('Failed to load exercises with body parts', err);
        } finally {
            setLoading(false);
        }
    };

    // Reload data when screen comes into focus (after creating new exercise)
    useFocusEffect(
        React.useCallback(() => {
            loadData();
        }, [])
    );

    const toggleSection = (id: string) => {
        setBodyPartSections((prev) =>
            prev.map((sec) =>
                sec.id === id ? { ...sec, expanded: !sec.expanded } : sec
            )
        );
    };

    const handleSelectExercise = async (exerciseId: string) => {
        if (!workoutId) {
            Alert.alert('Error', 'No workout selected');
            return;
        }

        setAddingExercise(true);
        try {
            // Add exercise to the workout
            await addExerciseToWorkoutById(workoutId, exerciseId);

            // Navigate back to the workout screen
            router.back();
        } catch (err) {
            console.error('Failed to add exercise to workout:', err);
            Alert.alert('Error', 'Failed to add exercise to workout');
        } finally {
            setAddingExercise(false);
        }
    };

    if (loading || addingExercise) {
        return (
            <View className="flex-1 justify-center items-center bg-surface_a0 pt-16">
                <Text className="text-white text-3xl font-bold">
                    {loading ? 'Loading exercises...' : 'Adding exercise...'}
                </Text>
            </View>
        );
    }

    return (
        <SafeAreaView className="flex-1 bg-surface_a0 pt-16 px-4">
            <View className="flex-row justify-between items-center mb-4">
                <Text className="text-primary_a0 font-bold text-3xl">
                    Select Exercise
                </Text>
                <TouchableOpacity
                    onPress={() => router.push('/exercise/createExercise')}
                    className="bg-primary_a10 px-4 py-2 rounded-lg"
                    activeOpacity={0.8}
                >
                    <Text className="text-white font-bold">+ New</Text>
                </TouchableOpacity>
            </View>

            <ScrollView>
                {bodyPartSections.map((section) => (
                    <View key={section.id} className="mb-4">
                        <TouchableOpacity
                            onPress={() => toggleSection(section.id)}
                            className="flex-row justify-between items-center bg-surface_a10 px-4 py-3 rounded-lg"
                        >
                            <Text className="text-primary_a10 font-semibold text-lg">
                                {section.name} ({section.exercises.length})
                            </Text>
                            <AntDesign
                                name={section.expanded ? 'up' : 'down'}
                                size={20}
                                color="#f34023"
                            />
                        </TouchableOpacity>

                        {section.expanded &&
                            section.exercises.map((ex) => (
                                <TouchableOpacity
                                    key={ex.id}
                                    onPress={() => handleSelectExercise(ex.id)}
                                    className="bg-surface_a20 px-4 py-3 rounded-lg mt-2"
                                >
                                    <Text className="text-white">{ex.name}</Text>
                                    {ex.description && (
                                        <Text className="text-gray-200 text-xs">
                                            {ex.description}
                                        </Text>
                                    )}
                                </TouchableOpacity>
                            ))}
                    </View>
                ))}
            </ScrollView>
        </SafeAreaView>
    );
}

export default AddExercise;