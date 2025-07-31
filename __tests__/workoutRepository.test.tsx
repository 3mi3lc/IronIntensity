import { createWorkout } from '@/repositories/workouts';
import { workouts } from '@/db/schema';

// Mock db and its insert chain
const mockValues = jest.fn();
const mockReturning = jest.fn();

jest.mock('@/db/client', () => ({
    db: {
        insert: jest.fn(() => {
            console.log('db.insert called');
            return {
                values: mockValues.mockReturnThis(),
                returning: mockReturning,
            };
        }),
        select: jest.fn(() => {
            console.log('db.select called');
            return {
                from: jest.fn().mockReturnThis(),
                where: jest.fn().mockResolvedValue([
                    {
                        id: 'test-id-123',
                        user_id: 'user-1',
                        name: 'My Workout',
                        created_at: '2025-07-27T10:00:00Z',
                        updated_at: '2025-07-27T10:00:00Z',
                        deleted_at: null,
                        is_synced: 0,
                    },
                ]),
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
