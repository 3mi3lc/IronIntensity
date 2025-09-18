import { db } from '@/db/client';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import type { User, NewUser } from './types';

export async function createUser(data: Omit<NewUser, 'id'> & { id: string }): Promise<User> {
    const [created] = await db.insert(users).values(data).returning();
    return created;
}

export async function updateUsername(id: string, username: string, options?: {returnData : boolean}): Promise<User | boolean> {
    const query = db
        .update(users)
        .set({ username })
        .where(eq(users.id, id));

    if(options?.returnData){
        const [updatedUser] = await query.returning();
        return updatedUser;
    }

    const result = await query;
    return result.changes > 0;
}

export async function getCurrentUser(): Promise<User | null> {
    const [user] = await db.select().from(users).limit(1);
    return user ?? null;
}

export async function createOrUpdateUser(data: User): Promise<User> {
    // Check if user exists locally
    const [existing] = await db.select().from(users).where(eq(users.id, data.id));

    if (existing) {
        await db.update(users).set({ email: data.email }).where(eq(users.id, data.id));
        return { ...existing, email: data.email };
    } else {
        await db.insert(users).values(data);
        return data;
    }
}
