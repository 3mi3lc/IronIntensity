// app/index.tsx
import { Redirect } from 'expo-router';
import { useContext, useEffect } from 'react';
import { UserContext } from '@/contexts/UserContext';
import { View, ActivityIndicator, Text } from 'react-native';

export default function Index() {
    const { user, isLoading } = useContext(UserContext) ?? { user: null, isLoading: true };

    useEffect(() => {
        console.log('Index: User state changed:', { user: user?.email, isLoading });
    }, [user, isLoading]);

    if (isLoading) {
        return (
            <View className="flex-1 bg-surface_a0 justify-center items-center">
                <ActivityIndicator size="large" color="#eb0202" />
                <Text className="text-white mt-4">Loading...</Text>
            </View>
        );
    }

    console.log('Index: Redirecting...', user ? 'to app' : 'to login');

    // Redirect based on auth state
    if (!user) {
        return <Redirect href="/auth/login" />;
    }

    return <Redirect href="/(tabs)/logging" />;
}