import { View, Text, TouchableOpacity, SafeAreaView, ScrollView } from 'react-native';
import React, { useEffect, useState } from 'react';
import { AntDesign } from '@expo/vector-icons';
import { getAllExercisesWithBodyPart } from '@/repositories/exercises';
import type { BodypartWithExercises } from '@/repositories/types';

type BodyPartSection = BodypartWithExercises & {
    expanded: boolean;
};

function AddExercise() {
    const [bodyPartSections, setBodyPartSections] = useState<BodyPartSection[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadData() {
            setLoading(true);
            try {
                const sections = await getAllExercisesWithBodyPart();

                // Sort body parts alphabetically
                const sortedSections = sections.sort((a, b) =>
                    a.name.localeCompare(b.name)
                );

                // Initialize all sections as expanded
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
        }

        loadData();
    }, []);

    const toggleSection = (id: string) => {
        setBodyPartSections((prev) =>
            prev.map((sec) =>
                sec.id === id ? { ...sec, expanded: !sec.expanded } : sec
            )
        );
    };

    const handleSelectExercise = (exerciseId: string) => {
        console.log('Selected exercise:', exerciseId);
        // TODO: add exercise to workout or navigate back
    };

    if (loading) {
        return (
            <View className="flex-1 justify-center items-center bg-surface_a0 pt-16">
                <Text className="text-white text-3xl font-bold">Loading exercises...</Text>
            </View>
        );
    }

    return (
        <SafeAreaView className="flex-1 bg-surface_a0 pt-16 px-4">
            <Text className="text-primary_a0 font-bold text-3xl mb-4">
                Select Exercise
            </Text>

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
