import type { APIRoute } from 'astro';
import bcrypt from 'bcryptjs';
import { json, emailRegex } from '../../../lib/api';
import { getUsers, createUser } from '../../../services/users';

export const GET: APIRoute = async () => {
    try {
        const list = await getUsers();
        return json({ users: list }, 200);
    } catch (err) {
        console.error(err);
        return json({ error: 'Internal server error' }, 500);
    }
};

export const POST: APIRoute = async ({ request }) => {
    let body: Record<string, unknown>;
    try {
        body = await request.json();
    } catch {
        return json({ error: 'Invalid body' }, 400);
    }

    const { name, email, password, role, phone, avatar_url } = body;

    if (!name || !email || !password) {
        return json({ error: 'name, email and password are required' }, 400);
    }

    if (!emailRegex.test(String(email))) {
        return json({ error: 'Invalid email format' }, 400);
    }

    try {
        const user = await createUser({
            name:       String(name),
            email:      String(email),
            password:   await bcrypt.hash(String(password), 12),
            role:       role === 'admin' ? 'admin' : 'agent',
            phone:      phone      ? String(phone)      : null,
            avatar_url: avatar_url ? String(avatar_url) : null,
        });

        return json({ user }, 201);
    } catch (err: any) {
        if (err?.code === '23505') {
            return json({ error: 'Email already in use' }, 409);
        }
        console.error(err);
        return json({ error: 'Internal server error' }, 500);
    }
};
