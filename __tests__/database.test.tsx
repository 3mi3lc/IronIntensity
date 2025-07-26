import * as SQLite from 'expo-sqlite';
import { initializeDatabase } from '@/db/database';

// Mock the whole module
jest.mock('expo-sqlite');

describe('Database Initialization', () => {
    it('calls execAsync with SQL statements', async () => {
        // Create a mock function for execAsync
        const execAsyncMock = jest.fn().mockResolvedValue({});

        // Mock openDatabaseAsync to return an object with execAsync mocked
        (SQLite.openDatabaseAsync as jest.Mock).mockResolvedValue({
            execAsync: execAsyncMock,
        });

        // Call your DB init function
        await initializeDatabase();

        // Assert openDatabaseAsync called correctly
        expect(SQLite.openDatabaseAsync).toHaveBeenCalledWith('local.db');

        // Assert execAsync was called at least once
        expect(execAsyncMock).toHaveBeenCalled();

        // Grab the first SQL string sent to execAsync
        const sqlString = execAsyncMock.mock.calls[0][0];

        expect(sqlString).toContain('CREATE TABLE IF NOT EXISTS exercises');
        expect(sqlString).toContain('CREATE TABLE IF NOT EXISTS workouts');
        expect(sqlString).toContain('CREATE TABLE IF NOT EXISTS users');
        expect(sqlString).toContain('CREATE TABLE IF NOT EXISTS workout_exercises');
        expect(sqlString).toContain('CREATE TABLE IF NOT EXISTS workout_exercise_sets');
    });
});
