// Manual mock for expo-crypto (ESM module Jest can't transform by default).
// Auto-applied for the node_modules package, mirroring __mocks__/expo-sqlite.tsx.
let counter = 0;
export const randomUUID = jest.fn(() => `test-uuid-${++counter}`);
