const mockDb = {
    execAsync: jest.fn(() => Promise.resolve()),
    runAsync: jest.fn(() => Promise.resolve({ lastInsertRowId: 1, changes: 1 })),
    getFirstAsync: jest.fn(() => Promise.resolve({ id: '1' })),
    getAllAsync: jest.fn(() => Promise.resolve([])),
    getEachAsync: jest.fn(async function* () { }),
};

export const openDatabaseAsync = jest.fn(() => Promise.resolve(mockDb));
