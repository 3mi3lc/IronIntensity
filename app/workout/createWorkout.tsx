import { View, Text } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import {useEffect, useState} from "react";
import {Workout} from "@/repositories/types";
import {getWorkoutById} from "@/repositories/workouts";

function CreateWorkout() {
    // Type params for better autocompletion
    const { id, name } = useLocalSearchParams<{ id: string; name: string }>();
    const [workout, setWorkout] = useState<Workout | null>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);


    useEffect(() => {
        if (!id) {
            setWorkout(null);
            setError(null);
            setLoading(false);
            return;
        }

        setLoading(true);
        getWorkoutById(id)
            .then((data) => {
                if (data) {
                    setWorkout(data);
                    setError(null);
                } else {
                    setWorkout(null);
                    setError('Workout not found');
                }
            })
            .catch((err) => setError(err.message || 'Error fetching workout'))
            .finally(() => setLoading(false));
    }, [id]);

    if (loading) {
        return (
            <View className="flex-1 justify-center items-center bg-surface_a0 pt-16">
                <Text className="text-white text-3xl font-bold">Loading workout...</Text>
            </View>
        );
    }

    return (
        <View className="flex-1 items-center bg-surface_a0 pt-16">
            <Text className="text-white font-bold text-3xl mb-4">{name ?? 'Loading...'}</Text>
            <Text className="text-white">Workout ID: {id}</Text>
            <Text className="text-white">{workout ? JSON.stringify(workout, null, 2) : 'No workout loaded'}</Text>
        </View>
    );
}

export default CreateWorkout;
