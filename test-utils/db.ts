// In-memory SQLite test harness.
//
// The app runs Drizzle on top of expo-sqlite, which cannot load in a Node/Jest
// environment. For tests we run the *same* Drizzle schema on better-sqlite3 with
// the real migrations applied, giving genuine query behavior (soft-delete
// filters, cascades, PR logic) instead of asserting Drizzle call shapes.
//
// Repositories import `db` from '@/db/client'. Tests replace that module with
// this one via `jest.mock('@/db/client', () => require('@/test-utils/db'))`.
// `db` is reassigned by resetTestDb(); the CommonJS `exports.db` binding tracks
// the reassignment, so repositories see the current in-memory database.
import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';

let sqlite: Database.Database | undefined;

// eslint-disable-next-line import/no-mutable-exports
export let db: BetterSQLite3Database = undefined as unknown as BetterSQLite3Database;

const SCHEMA_SQL = fs.readFileSync(path.resolve(__dirname, 'schema.sql'), 'utf8');

/** Create a fresh in-memory database with the current schema applied. */
export function resetTestDb(): void {
    if (sqlite) sqlite.close();
    sqlite = new Database(':memory:');
    // Match the app: expo-sqlite runs with foreign_keys OFF and the repositories
    // perform manual cascade soft-deletes. better-sqlite3 defaults FKs ON.
    sqlite.pragma('foreign_keys = OFF');
    sqlite.exec(SCHEMA_SQL);
    db = drizzle(sqlite);
}

/** Close the underlying database (call in afterAll to free resources). */
export function closeTestDb(): void {
    if (sqlite) {
        sqlite.close();
        sqlite = undefined;
    }
}
