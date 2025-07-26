import { openDatabaseSync } from 'expo-sqlite';
import { drizzle } from 'drizzle-orm/expo-sqlite';
import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';
import migrations from '@/drizzle/migrations';
import { useEffect, useState } from 'react';

// Initialize SQLite database with Drizzle
const DATABASE_NAME = 'local.db';
const expoDb = openDatabaseSync(DATABASE_NAME);
export const db = drizzle(expoDb);

// Hook to run migrations and expose migration status
export function useDbReady() {
    const { success, error } = useMigrations(db, migrations);
    const [ready, setReady] = useState(false);

    useEffect(() => {
        if (success) setReady(true);
        if (error) {
            console.error('Database migration error:', error);
            setReady(false);
        }
    }, [success, error]);

    return { ready, error };
}
