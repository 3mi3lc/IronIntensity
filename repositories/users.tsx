// src/repositories/users.ts
import { db } from '@/db/client';
import { logger } from '@/utils/logger';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import type { User } from './types';
import AsyncStorage from '@react-native-async-storage/async-storage';

export async function getUserById(id: string): Promise<User | null> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user ?? null;
}

export async function createOrUpdateUser(data: User): Promise<User> {
    // Check if user exists locally
    const [existing] = await db.select().from(users).where(eq(users.id, data.id));

    if (existing) {
        await db.update(users).set({
            email: data.email,
            username: data.username
        }).where(eq(users.id, data.id));
        return { ...existing, email: data.email, username: data.username };
    } else {
        await db.insert(users).values(data);
        return data;
    }
}

export async function getLastLocalUser(): Promise<User | null> {
    try {
        const lastUserId = await AsyncStorage.getItem('lastUserId');

        if (!lastUserId) return null;

        return await getUserById(lastUserId);
    } catch (error) {
        logger.error('Failed to get last local user:', error);
        return null;
    }
}
