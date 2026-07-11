// app/_layout.tsx
import { Stack, useRouter, useSegments } from 'expo-router';
import { logger } from '@/utils/logger';
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
import { useUnfinishedWorkoutCheck } from '@/hooks/useUnfinishedWorkoutCheck';
import UnfinishedWorkoutModal from '@/components/unfinishedWorkoutModal';
import Toast from 'react-native-toast-message';
import { toastConfig } from '@/components/toastConfig';
import { ConfettiOverlay } from '@/components/confettiOverlay';
import { LoadingScreen } from '@/components/loadingScreen';
import { NotificationsGate } from '@/components/notificationsGate';


function RootLayoutNav() {
    const { user, isLoading } = useAuth();
    const segments = useSegments();
    const router = useRouter();

    const { isSyncing } = useAutoSync();

    const {
        unfinishedWorkout,
        modalVisible,
        handleContinue,
        handleSave,
        handleDiscard,
    } = useUnfinishedWorkoutCheck(user?.id);

    useEffect(() => {
        if (isLoading) return;

        const inAuthGroup = segments[0] === 'auth';

        logger.debug('Layout: Auth state changed', {
            user: user?.email,
            inAuthGroup,
            currentPath: segments.join('/')
        });

        if (!user && !inAuthGroup) {
            logger.debug('Layout: Redirecting to login...');
            router.replace('/auth/login');
        } else if (user && inAuthGroup) {
            logger.debug('Layout: Redirecting to app...');
            router.replace('/(tabs)/logging');
        }
    }, [user, isLoading, segments]);

    if (isLoading) {
        return <LoadingScreen />;
    }

    return (
        <>
            <Stack screenOptions={{ headerShown: false }} />

            {isSyncing && (
                <View
                    style={{
                        position: 'absolute',
                        top: 50,
                        right: 16,
                        backgroundColor: '#282828',
                        borderRadius: 20,
                        paddingHorizontal: 12,
                        paddingVertical: 6,
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 6,
                        zIndex: 999,
                        elevation: 999,
                    }}
                >
                    <ActivityIndicator size="small" color="#f34023" />
                    <Text style={{ color: 'white', fontSize: 12, fontWeight: '600' }}>
                        Syncing...
                    </Text>
                </View>
            )}



            {unfinishedWorkout && (
                <UnfinishedWorkoutModal
                    visible={modalVisible}
                    workoutName={unfinishedWorkout.name}
                    workoutDate={new Date(unfinishedWorkout.created_at!).toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                    })}
                    onContinue={handleContinue}
                    onSave={handleSave}
                    onDiscard={handleDiscard}
                />
            )}
            <Toast config={toastConfig} />
            <ConfettiOverlay />
            <NotificationsGate />
        </>
    );
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
                <Suspense fallback={<LoadingScreen message={null} />}>
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
