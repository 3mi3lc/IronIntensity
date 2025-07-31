import { Stack } from 'expo-router';
import { Suspense } from 'react';
import { ActivityIndicator } from 'react-native';
import { SQLiteProvider } from 'expo-sqlite';
import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';
import migrations from '@/drizzle/migrations';
import {useDrizzleStudio} from "expo-drizzle-studio-plugin";
import { db, expoDb, DATABASE_NAME } from '@/db/client';


export default function RootLayout() {
    const { } = useMigrations(db, migrations);
    useDrizzleStudio(expoDb);

    return (
        <Suspense fallback={<ActivityIndicator size="large" />}>
            <SQLiteProvider
                databaseName={DATABASE_NAME}
                options={{ enableChangeListener: true }}
                useSuspense>
                <Stack screenOptions={{ headerShown: false }} />
            </SQLiteProvider>
        </Suspense>
    );
}