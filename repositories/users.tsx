// src/repositories/users.ts
import { db } from '@/db/client';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import type { User } from './types';

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