import { eq } from 'drizzle-orm';
import { db, users } from '../db';
import { publicUserColumns } from '../lib/api';

export async function getUsers() {
    return db
        .select(publicUserColumns)
        .from(users)
        .orderBy(users.created_at);
}

export async function getUserById(id: string) {
    const [user] = await db
        .select(publicUserColumns)
        .from(users)
        .where(eq(users.id, id));

    return user ?? null;
}

export async function createUser(data: {
    name:        string;
    email:       string;
    password:    string;
    role?:       'admin' | 'agent';
    phone?:      string | null;
    avatar_url?: string | null;
}) {
    const [user] = await db
        .insert(users)
        .values(data)
        .returning(publicUserColumns);

    return user;
}

export async function updateUser(id: string, data: Record<string, unknown>) {
    const [user] = await db
        .update(users)
        .set(data)
        .where(eq(users.id, id))
        .returning(publicUserColumns);

    return user ?? null;
}

export async function deleteUser(id: string) {
    const [user] = await db
        .delete(users)
        .where(eq(users.id, id))
        .returning({ id: users.id });

    return user ?? null;
}
