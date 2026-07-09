// Guards that the migration chain is clean-installable on a fresh database.
// Regression test for the 0002 bug where the exercise_body_parts rebuild
// SELECTed columns that 0000 never created, crashing every new install.
//
// Unlike the other suites (which build schema from test-utils/schema.sql for
// speed), this one replays the real drizzle/*.sql migrations via the drizzle
// migrator — the same mechanism the app uses at startup.
import path from 'path';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';

const MIGRATIONS_FOLDER = path.resolve(__dirname, '..', 'drizzle');

function columns(db: Database.Database, table: string): string[] {
    return (db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[]).map(r => r.name);
}

describe('migration chain — fresh install', () => {
    let sqlite: Database.Database;

    beforeAll(() => {
        sqlite = new Database(':memory:');
        // Throws if any migration fails — this is the core regression assertion.
        migrate(drizzle(sqlite), { migrationsFolder: MIGRATIONS_FOLDER });
    });

    afterAll(() => sqlite.close());

    it('applies every migration and creates all tables', () => {
        const tables = (sqlite
            .prepare("SELECT name FROM sqlite_master WHERE type='table'")
            .all() as { name: string }[]).map(t => t.name);
        expect(tables).toEqual(expect.arrayContaining([
            'users', 'exercises', 'workouts', 'workout_exercises', 'workout_exercise_sets',
            'body_parts', 'exercise_body_parts', 'sync_metadata', 'body_weight_entries',
            'user_achievements',
        ]));
    });

    it('rebuilds exercise_body_parts with its tracking columns (0002)', () => {
        expect(columns(sqlite, 'exercise_body_parts')).toEqual(
            expect.arrayContaining(['exercise_id', 'body_part_id', 'created_at', 'updated_at', 'deleted_at', 'is_synced']),
        );
    });

    it('seeds the 16 body parts (0001)', () => {
        const { c } = sqlite.prepare('SELECT COUNT(*) c FROM body_parts').get() as { c: number };
        expect(c).toBe(16);
    });

    it('adds completed_at / is_pr (0004) and sync_metadata.status (0007)', () => {
        expect(columns(sqlite, 'workouts')).toContain('completed_at');
        expect(columns(sqlite, 'workout_exercise_sets')).toContain('is_pr');
        expect(columns(sqlite, 'sync_metadata')).toContain('status');
    });
});
