// src/db/client.ts
import { openDatabaseSync } from 'expo-sqlite';
import { drizzle } from 'drizzle-orm/expo-sqlite';

export const DATABASE_NAME = 'local_test.db';

const expoDb = openDatabaseSync(DATABASE_NAME);
export const db = drizzle(expoDb);
export { expoDb }; // optional for useDrizzleStudio
