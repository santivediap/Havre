import type { APIRoute } from 'astro';
import bcrypt from 'bcryptjs';
import { json, emailRegex } from '../../../lib/api';
import { getUserById, updateUser, deleteUser } from '../../../services/users';

export const GET: APIRoute = async ({ params }) => {
    const { id } = params;

    try {
        const user = await getUserById(id!);

        if (!user) {
            return json({ error: 'User not found' }, 404);
        }

        return json({ user }, 200);
    } catch (err: any) {
        if (err?.code === '22P02') {
            return json({ error: 'Invalid ID' }, 400);
        }
        console.error(err);
        return json({ error: 'Internal server error' }, 500);
    }
};

export const PATCH: APIRoute = async ({ params, request }) => {
    const { id } = params;

    let body: Record<string, unknown>;
    try {
        body = await request.json();
    } catch {
        return json({ error: 'Invalid body' }, 400);
    }

    const { name, email, password, role, phone, avatar_url, is_active } = body;

    const values: Record<string, unknown> = { updated_at: new Date() };

    if (name       !== undefined) values.name       = String(name);
    if (role       !== undefined) values.role       = role === 'admin' ? 'admin' : 'agent';
    if (phone      !== undefined) values.phone      = phone      ? String(phone)      : null;
    if (avatar_url !== undefined) values.avatar_url = avatar_url ? String(avatar_url) : null;
    if (is_active  !== undefined) values.is_active  = Boolean(is_active);

    if (email !== undefined) {
        if (!emailRegex.test(String(email))) {
            return json({ error: 'Invalid email format' }, 400);
        }
        values.email = String(email);
    }

    if (password !== undefined) {
        values.password = await bcrypt.hash(String(password), 12);
    }

    try {
        const user = await updateUser(id!, values);

        if (!user) {
            return json({ error: 'User not found' }, 404);
        }

        return json({ user }, 200);
    } catch (err: any) {
        if (err?.code === '23505') {
            return json({ error: 'Email already in use' }, 409);
        }
        if (err?.code === '22P02') {
            return json({ error: 'Invalid ID' }, 400);
        }
        console.error(err);
        return json({ error: 'Internal server error' }, 500);
    }
};

export const DELETE: APIRoute = async ({ params }) => {
    const { id } = params;

    try {
        const user = await deleteUser(id!);

        if (!user) {
            return json({ error: 'User not found' }, 404);
        }

        return json({ message: 'User deleted', id: user.id }, 200);
    } catch (err: any) {
        if (err?.code === '22P02') {
            return json({ error: 'Invalid ID' }, 400);
        }
        console.error(err);
        return json({ error: 'Internal server error' }, 500);
    }
};
