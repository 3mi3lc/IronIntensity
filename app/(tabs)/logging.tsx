import React, { useState } from 'react';
import { View, Text, Button, ScrollView } from 'react-native';
import {
    createWorkout,
    updateWorkoutNameById,
    getAllWorkouts,
    getWorkoutById,
    softDeleteWorkoutById
} from '@/repositories/workouts';

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
            }, {returnCreated: true});
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

    async function handleGetAllWorkouts() {
        setLoading(true);
        setError(null);
        setResult(null);
        try{
            const workouts = await getAllWorkouts();
            setResult(workouts);
            console.log('Workouts obtained from DB:', workouts);
        }
        catch(err: any) {
            setError(err.message || 'Unknown error');
            console.error(err);
        }
        setLoading(false);
    }

    async function handleGetWorkoutById() {
        setLoading(true);
        setError(null);
        setResult(null);
        try{
            const workout = await getWorkoutById('1335664e-b46c-47cd-a837-960d93361d6b');
            setResult(workout);
            console.log('Workouts obtained from DB:', workout);
        }
        catch(err: any) {
            setError(err.message || 'Unknown error');
            console.error(err);
        }
        setLoading(false);
    }

    async function handleSoftDeleteWorkout() {
        setLoading(true);
        setError(null);
        setResult(null);
        try{
            const workout = await softDeleteWorkoutById('1ab4fec6-2e71-4750-9fee-188ccca65453');
            setResult(workout);
            console.log('Workouts obtained from DB:', workout);
        }
        catch(err: any) {
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

            <View className="w-full">
                <Button title={loading ? 'Getting Workouts...' : 'Get all workouts'}
                        onPress={handleGetAllWorkouts}
                        disabled={loading}>
                </Button>
            </View>

            <View className="w-full">
                <Button title={loading ? 'Getting Workouts...' : 'Get workout by Id'}
                        onPress={handleGetWorkoutById}
                        disabled={loading}>
                </Button>
            </View>

            <View className="w-full">
                <Button title={loading ? 'Getting Workouts...' : 'Delete workout by Id'}
                        onPress={handleSoftDeleteWorkout}
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
