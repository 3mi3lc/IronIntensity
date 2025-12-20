// app/index.tsx
import { Redirect } from 'expo-router';
import { useContext, useEffect } from 'react';
import { UserContext } from '@/contexts/UserContext';
import { View, ActivityIndicator, Text } from 'react-native';

export default function Index() {
    const { user, isLoading, isOffline } = useContext(UserContext) ?? {
        user: null,
        isLoading: true,
        isOffline: false
    };

    useEffect(() => {
        console.log('Index: User state changed:', {
            user: user?.email,
            isLoading,
            isOffline
        });
    }, [user, isLoading, isOffline]);

    if (isLoading) {
        return (
            <View className="flex-1 bg-surface_a0 justify-center items-center">
                <ActivityIndicator size="large" color="#eb0202" />
                <Text className="text-white mt-4">Loading...</Text>
                {isOffline && (
                    <Text className="text-gray-400 text-sm mt-2">
                        (Offline mode)
                    </Text>
                )}
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