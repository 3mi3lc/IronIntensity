import { View, Text, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { logger } from '@/utils/logger';
import React, {  useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
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
            logger.error('Failed to load exercises with body parts', err);
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
            logger.error('Failed to add exercise to workout:', err);
            Alert.alert('Error', 'Failed to add exercise to workout');
        } finally {
            setAddingExercise(false);
        }
    };

    if (loading || addingExercise) {
        return (
            <View className="flex-1 justify-center items-center bg-surface_a0">
                <View className="bg-surface_a10 p-8 rounded-2xl items-center">
                    <ActivityIndicator size="large" color="#eb0202" />
                    <Text className="text-white text-xl font-bold mt-4">
                        {loading ? 'Loading exercises...' : 'Adding exercise...'}
                    </Text>
                </View>
            </View>
        );
    }

    return (
        <SafeAreaView className="flex-1 bg-surface_a0">
            {/* Header */}
            <View className="px-6 pt-4 pb-4">
                <View className="flex-row justify-between items-center mb-2">
                    <TouchableOpacity
                        onPress={() => router.back()}
                        className="p-2 bg-surface_a10 rounded-xl items-center justify-center"
                        activeOpacity={0.8}
                    >
                        <AntDesign name="arrow-left" size={24} color="#eb0202" />
                    </TouchableOpacity>

                    <View className="flex-1 ml-4">
                        <Text className="text-primary_a0 font-bold text-2xl">
                            Select Exercise
                        </Text>
                        <Text className="text-surface_a50 text-sm mt-1">
                            Choose an exercise to add to your workout
                        </Text>
                    </View>
                </View>

                {/* Create New Exercise Button */}
                <TouchableOpacity
                    onPress={() => router.push('/exercise/createExercise')}
                    className="bg-primary_a10 px-6 py-4 rounded-xl flex-row items-center justify-center mt-4"
                    activeOpacity={0.8}
                    style={{
                        shadowColor: '#eb0202',
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: 0.3,
                        shadowRadius: 8,
                        elevation: 8,
                    }}
                >
                    <AntDesign name="plus" size={20} color="#fff" />
                    <Text className="text-white font-bold text-base ml-2">
                        Create New Exercise
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Body Part Sections */}
            <ScrollView
                className="flex-1 px-6"
                showsVerticalScrollIndicator={false}
            >
                {bodyPartSections.length === 0 ? (
                    <View className="flex-1 justify-center items-center py-20">
                        <View className="w-20 h-20 bg-surface_a10 rounded-full items-center justify-center mb-4">
                            <AntDesign name="inbox" size={40} color="#8b8b8b" />
                        </View>
                        <Text className="text-surface_a50 text-lg font-semibold">
                            No exercises yet
                        </Text>
                        <Text className="text-surface_a40 text-sm mt-2 text-center">
                            Create your first exercise to get started
                        </Text>
                    </View>
                ) : (
                    bodyPartSections.map((section) => (
                        <View key={section.id} className="mb-4">
                            {/* Body Part Header */}
                            <TouchableOpacity
                                onPress={() => toggleSection(section.id)}
                                className="flex-row justify-between items-center bg-surface_a10 px-5 py-4 rounded-xl"
                                activeOpacity={0.8}
                                style={{
                                    shadowColor: '#000',
                                    shadowOffset: { width: 0, height: 2 },
                                    shadowOpacity: 0.1,
                                    shadowRadius: 4,
                                    elevation: 3,
                                }}
                            >
                                <View className="flex-row items-center flex-1">
                                    <View className="w-10 h-10 bg-primary_a10 rounded-full items-center justify-center mr-3">
                                        <AntDesign name="tags" size={18} color="#fff" />
                                    </View>
                                    <View className="flex-1">
                                        <Text className="text-white font-bold text-lg">
                                            {section.name}
                                        </Text>
                                        <Text className="text-surface_a50 text-xs mt-1">
                                            {section.exercises.length} {section.exercises.length === 1 ? 'exercise' : 'exercises'}
                                        </Text>
                                    </View>
                                </View>

                                <View className={`w-8 h-8 rounded-full items-center justify-center ${
                                    section.expanded ? 'bg-primary_a20' : 'bg-surface_a20'
                                }`}>
                                    <AntDesign
                                        name={section.expanded ? 'up' : 'down'}
                                        size={16}
                                        color="#fff"
                                    />
                                </View>
                            </TouchableOpacity>

                            {/* Exercises List */}
                            {section.expanded && (
                                <View className="mt-2 space-y-2">
                                    {section.exercises.length === 0 ? (
                                        <View className="bg-surface_a10 px-5 py-6 rounded-xl items-center">
                                            <Text className="text-surface_a50 text-sm">
                                                No exercises in this category
                                            </Text>
                                        </View>
                                    ) : (
                                        section.exercises.map((ex, index) => (
                                            <TouchableOpacity
                                                key={ex.id}
                                                onPress={() => handleSelectExercise(ex.id)}
                                                className="bg-surface_a20 px-5 py-4 rounded-xl flex-row items-center"
                                                activeOpacity={0.7}
                                                style={{
                                                    marginTop: index === 0 ? 0 : 8,
                                                }}
                                            >
                                                <View className="w-8 h-8 bg-surface_a30 rounded-full items-center justify-center mr-3">
                                                    <AntDesign name="plus-circle" size={16} color="#f95e3d" />
                                                </View>

                                                <View className="flex-1">
                                                    <Text className="text-white font-semibold text-base">
                                                        {ex.name}
                                                    </Text>
                                                    {ex.description && (
                                                        <Text className="text-surface_a50 text-xs mt-1" numberOfLines={1}>
                                                            {ex.description}
                                                        </Text>
                                                    )}
                                                </View>

                                                <AntDesign name="right" size={16} color="#8b8b8b" />
                                            </TouchableOpacity>
                                        ))
                                    )}
                                </View>
                            )}
                        </View>
                    ))
                )}

                {/* Bottom Padding */}
                <View className="h-8" />
            </ScrollView>
        </SafeAreaView>
    );
}

export default AddExercise;
