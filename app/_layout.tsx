// app/_layout.tsx
import { Stack, useRouter, useSegments } from 'expo-router';
import { Suspense, useEffect } from 'react';
import { ActivityIndicator, View, Text } from 'react-native';
import { SQLiteProvider } from 'expo-sqlite';
import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';
import migrations from '@/drizzle/migrations';
import { useDrizzleStudio } from 'expo-drizzle-studio-plugin';
import { db, expoDb, DATABASE_NAME } from '@/db/client';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AuthProvider } from '@/contexts/AuthContext';
import { UserProvider } from '@/contexts/UserContext';
import { useAuth } from '@/hooks/useAuth';
import { useAutoSync } from '@/hooks/useAutoSync';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import './globals.css';

function RootLayoutNav() {
    const { user, isLoading } = useAuth();
    const segments = useSegments();
    const router = useRouter();

    // Auto-sync when user logs in
    useAutoSync();

    useEffect(() => {
        if (isLoading) return;

        const inAuthGroup = segments[0] === 'auth';

        console.log('Layout: Auth state changed', {
            user: user?.email,
            inAuthGroup,
            currentPath: segments.join('/')
        });

        if (!user && !inAuthGroup) {
            // User is not logged in and not on auth screen
            console.log('Layout: Redirecting to login...');
            router.replace('/auth/login');
        } else if (user && inAuthGroup) {
            // User is logged in but still on auth screen
            console.log('Layout: Redirecting to app...');
            router.replace('/(tabs)/logging');
        }
    }, [user, isLoading, segments]);

    if (isLoading) {
        return (
            <View className="flex-1 bg-surface_a0 justify-center items-center">
                <ActivityIndicator size="large" color="#eb0202" />
                <Text className="text-white text-lg mt-4">Loading...</Text>
            </View>
        );
    }

    return <Stack screenOptions={{ headerShown: false }} />;
}

export default function RootLayout() {
    const { success, error } = useMigrations(db, migrations);
    useDrizzleStudio(expoDb);

    if (error) {
        return (
            <View className="flex-1 bg-surface_a0 justify-center items-center">
                <StatusBar style="light" backgroundColor="#121212" />
                <Text className="text-white text-lg">Migration error: {error.message}</Text>
            </View>
        );
    }

    if (!success) {
        return (
            <View className="flex-1 bg-surface_a0 justify-center items-center">
                <StatusBar style="light" backgroundColor="#121212" />
                <Text className="text-white text-lg">Migration is in progress...</Text>
            </View>
        );
    }

    return (
        <SafeAreaProvider>
            <GestureHandlerRootView className="flex-1">
                <StatusBar style="light" backgroundColor="#121212" />
                <Suspense fallback={
                    <View className="flex-1 bg-surface_a0 justify-center items-center">
                        <ActivityIndicator size="large" color="#eb0202" />
                    </View>
                }>
                    <SQLiteProvider
                        databaseName={DATABASE_NAME}
                        options={{ enableChangeListener: true }}
                        useSuspense>
                        <AuthProvider>
                            <UserProvider>
                                <RootLayoutNav />
                            </UserProvider>
                        </AuthProvider>
                    </SQLiteProvider>
                </Suspense>
            </GestureHandlerRootView>
        </SafeAreaProvider>
    );
}