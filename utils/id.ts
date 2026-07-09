// utils/id.tsx
import * as Crypto from 'expo-crypto';

export function newId(): string {
    return Crypto.randomUUID();
}

export function now(): string {
    return new Date().toISOString();
}