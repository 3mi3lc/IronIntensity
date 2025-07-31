/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
    preset: 'ts-jest',                // Use ts-jest preset for TypeScript
    testEnvironment: 'node',         // Use Node.js environment
    transformIgnorePatterns: [
        "node_modules/(?!uuid)/"       // Transform uuid module (ESM), ignore others
    ],
    moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'], // extensions Jest looks for
    moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/$1',
    },
};
