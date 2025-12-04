// app/workout/performAgain.tsx
import React, { useEffect, useContext } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Alert, View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { duplicateWorkout } from '@/repositories/workouts';
import { UserContext } from '@/contexts/UserContext';
import { AntDesign } from '@expo/vector-icons';

function PerformAgainWorkout() {
    const { id, name } = useLocalSearchParams<{ id: string; name?: string }>();
    const router = useRouter();
    const { user } = useContext(UserContext) ?? {};

    useEffect(() => {
        if (!id || !user) {
            Alert.alert('Error', 'Invalid workout or user');
            router.back();
            return;
        }

        handlePerformAgain();
    }, [id, user]);

    const handlePerformAgain = async () => {
        if (!id || !user) return;

        try {
            const newWorkout = await duplicateWorkout(id, user.id, { returnData: true });

            if (typeof newWorkout !== 'boolean' && newWorkout) {
                // Navigate to edit mode with the new duplicated workout
                router.replace({
                    pathname: '/workout/edit',
                    params: {
                        id: newWorkout.id,
                        name: newWorkout.name,
                    }
                });
            } else {
                throw new Error('Failed to duplicate workout');
            }
        } catch (err) {
            console.error('Failed to duplicate workout:', err);
            Alert.alert('Error', 'Failed to start workout. Please try again.');
            router.back();
        }
    };

    // Loading state while duplicating
    return (
        <SafeAreaView className="flex-1 bg-surface_a0">
            <View className="flex-1 justify-center items-center">
                <View className="bg-surface_a10 p-8 rounded-2xl items-center mx-4">
                    <AntDesign name="loading" size={64} color="#f34023" />
                    <Text className="text-light text-xl font-bold mt-6 text-center">
                        Starting Workout...
                    </Text>
                    <Text className="text-surface_a50 text-base text-center mt-3">
                        {name || 'Preparing your workout'}
                    </Text>
                </View>
            </View>
        </SafeAreaView>
    );
}

export default PerformAgainWorkout;