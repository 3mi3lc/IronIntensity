// src/repositories/users.ts
import { db } from '@/db/client';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { newId } from '@/utils/id';
import type { NewUser, User } from './types';

export async function createUser(data: Omit<NewUser, 'id'>): Promise<User> {
    const id = newId();
    await db.insert(users).values({ ...data, id });
    const [created] = await db.select().from(users).where(eq(users.id, id));
    return created;
}

export async function getUserById(id: string) {
    const [u] = await db.select().from(users).where(eq(users.id, id));
    return u ?? null;
}

export async function getUserByEmail(email: string) {
    const [u] = await db.select().from(users).where(eq(users.email, email));
    return u ?? null;
}

export async function listUsers() {
    return db.select().from(users);
}

// soft delete helper if you add deleted_at/is_synced to users later
