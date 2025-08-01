import {
    createWorkout,
    getAllWorkouts,
    updateWorkoutNameById,
    softDeleteWorkoutById,
    getWorkoutById,
} from '@/repositories/workouts';
import { workouts } from '@/db/schema';

// Shared mock functions
const mockValues = jest.fn();
const mockReturning = jest.fn();
const mockWhere = jest.fn();
const mockFrom = jest.fn();

jest.mock('@/db/client', () => ({
    db: {
        insert: jest.fn(() => {
            console.log('db.insert called');
            return {
                values: mockValues.mockReturnThis(),
                returning: mockReturning,
            };
        }),
        update: jest.fn(() => ({
            set: jest.fn().mockReturnThis(),
            where: mockWhere,
        })),
        select: jest.fn(() => {
            console.log('db.select called');
            return {
                from: mockFrom,
                where: mockWhere,
            };
        }),
    },
}));

import { db } from '@/db/client';

describe('createWorkout', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        console.log('Mocks cleared');
    });

    it('inserts a workout and returns the inserted workout', async () => {
        const insertedRow = {
            id: 'test-id-123',
            user_id: 'user-1',
            name: 'My Workout',
            created_at: '2025-07-27T10:00:00Z',
            updated_at: '2025-07-27T10:00:00Z',
            deleted_at: null,
            is_synced: 0,
        };
        mockReturning.mockResolvedValue([insertedRow]);

        const data = {
            user_id: 'user-1',
            name: 'My Workout',
            deleted_at: null,
        };

        console.log('Calling createWorkout with data:', data);
        const result = await createWorkout(data);
        console.log('createWorkout result:', result);

        expect(db.insert).toHaveBeenCalledWith(workouts);
        expect(mockValues).toHaveBeenCalledWith(expect.objectContaining({
            user_id: 'user-1',
            name: 'My Workout',
            is_synced: 0,
        }));
        expect(mockReturning).toHaveBeenCalled();
        expect(result).toMatchObject(insertedRow);
    });
});

describe('getAllWorkouts', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('returns all workouts from db', async () => {
        const mockSelectResult = [{ id: 'w1' }, { id: 'w2' }];
        mockFrom.mockResolvedValue(mockSelectResult);

        const result = await getAllWorkouts();
        console.log('getAllWorkouts result:', result);

        expect(db.select).toHaveBeenCalled();
        expect(mockFrom).toHaveBeenCalledWith(workouts);
        expect(result).toEqual(mockSelectResult);
    });
});

describe('updateWorkoutName', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('updates the workout name', async () => {
        const mockSet = jest.fn().mockReturnThis();
        const mockUpdate = jest.fn(() => ({
            set: mockSet,
            where: mockWhere,
        }));
        (db.update as jest.Mock) = mockUpdate;

        await updateWorkoutNameById('w123', 'New Name');

        expect(mockUpdate).toHaveBeenCalledWith(workouts);
        expect(mockSet).toHaveBeenCalledWith(expect.objectContaining({
            name: 'New Name',
            is_synced: 0,
        }));
        expect(mockWhere).toHaveBeenCalled();
    });
});

describe('softDeleteWorkout', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('soft deletes the workout by setting deleted_at', async () => {
        const mockSet = jest.fn().mockReturnThis();
        const mockUpdate = jest.fn(() => ({
            set: mockSet,
            where: mockWhere,
        }));
        (db.update as jest.Mock) = mockUpdate;

        await softDeleteWorkoutById('w999');

        expect(mockUpdate).toHaveBeenCalledWith(workouts);
        expect(mockSet).toHaveBeenCalledWith(expect.objectContaining({
            deleted_at: expect.any(String),
            updated_at: expect.any(String),
            is_synced: 0,
        }));
        expect(mockWhere).toHaveBeenCalled();
    });
});

describe('getWorkoutById', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('returns workout by id if not deleted', async () => {
        const mockWorkout = {
            id: 'w123',
            name: 'Test',
            deleted_at: null,
        };
        mockWhere.mockResolvedValue([mockWorkout]);

        const result = await getWorkoutById('w123');

        expect(db.select).toHaveBeenCalled();
        expect(mockWhere).toHaveBeenCalled();
        expect(result).toEqual(mockWorkout);
    });

    it('returns null if workout is not found', async () => {
        mockWhere.mockResolvedValue([]);

        const result = await getWorkoutById('unknown');

        expect(result).toBeNull();
    });
});
