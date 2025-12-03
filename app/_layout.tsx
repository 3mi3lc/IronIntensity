import { Stack } from 'expo-router';
import { Suspense } from 'react';
import { ActivityIndicator, View, Text } from 'react-native';
import { SQLiteProvider } from 'expo-sqlite';
import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';
import migrations from '@/drizzle/migrations';
import { useDrizzleStudio } from 'expo-drizzle-studio-plugin';
import { db, expoDb, DATABASE_NAME } from '@/db/client';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { UserProvider } from '@/contexts/UserContext';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';


export default function RootLayout() {
    const { success, error } = useMigrations(db, migrations);
    //console.log(error);
    //console.log(success);
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
                        <UserProvider>
                            <Stack screenOptions={{ headerShown: false }} />
                        </UserProvider>
                    </SQLiteProvider>
                </Suspense>
            </GestureHandlerRootView>
        </SafeAreaProvider>
    );
}