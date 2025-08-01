import React, { useState } from 'react';
import { View, Text, Button, ScrollView } from 'react-native';
import { createWorkout, updateWorkoutNameById } from '@/repositories/workouts';

const Logging = () => {
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);

    async function handleCreateWorkout() {
        setLoading(true);
        setError(null);
        setResult(null);
        try {
            const newWorkout = await createWorkout({
                user_id: 'test-user',
                name: 'Manual Test Workout',
                deleted_at: null,
            });
            setResult(newWorkout);
            console.log('Workout created:', newWorkout);
        } catch (err: any) {
            setError(err.message || 'Unknown error');
            console.error(err);
        }
        setLoading(false);
    }

    async function handleUpdateWorkout() {
        setLoading(true);
        setError(null);
        setResult(null);
        try {
            // Replace 'some-workout-id' with a valid workout id you want to update
            const updatedWorkout = await updateWorkoutNameById('d04e5d6f-2ddd-4bcb-8d94-5bd29f7d2283',  'Updated Test Workout');
            setResult(updatedWorkout);
            console.log('Workout updated:', updatedWorkout);
        } catch (err: any) {
            setError(err.message || 'Unknown error');
            console.error(err);
        }
        setLoading(false);
    }



    return (
        <View className="flex-1 justify-center items-center bg-surface_a10 p-4">
            <View className="w-full">
                <Button
                    title={loading ? 'Creating Workout...' : 'Create Test Workout'}
                    onPress={handleCreateWorkout}
                    disabled={loading}
                />
            </View>
            <View className="w-full">
                <Button title={loading ? 'Updating Workout...' : 'Update Workout'}
                        onPress={handleUpdateWorkout}
                        disabled={loading}>
                </Button>
            </View>

            {result && (
                <ScrollView className="mt-5 max-h-52 w-full rounded border border-white p-2">
                    <Text className="text-white font-bold mb-1">Result:</Text>
                    <Text className="text-white font-mono">{JSON.stringify(result, null, 2)}</Text>
                </ScrollView>
            )}

            {error && (
                <Text className="text-red-500 mt-5">{`Error: ${error}`}</Text>
            )}
        </View>
    );
};

export default Logging;
