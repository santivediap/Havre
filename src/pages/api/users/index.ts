import type { APIRoute } from 'astro';
import { db, users } from '../../../db';
import bcrypt from 'bcryptjs';
import { json, emailRegex, publicUserColumns } from './_shared';

export const GET: APIRoute = async () => {
    try {
        const list = await db
            .select(publicUserColumns)
            .from(users)
            .orderBy(users.created_at);

        return json({ users: list }, 200);
    } catch (err) {
        console.error(err);
        return json({ error: 'Error interno del servidor' }, 500);
    }
};

export const POST: APIRoute = async ({ request }) => {
    let body: Record<string, unknown>;
    try {
        body = await request.json();
    } catch {
        return json({ error: 'Body inválido' }, 400);
    }

    const { name, email, password, role, phone, avatar_url } = body;

    if (!name || !email || !password) {
        return json({ error: 'name, email y password son obligatorios' }, 400);
    }

    if (!emailRegex.test(String(email))) {
        return json({ error: 'El formato del email no es válido' }, 400);
    }

    const hashed = await bcrypt.hash(String(password), 12);

    try {
        const [user] = await db
            .insert(users)
            .values({
                name:     String(name),
                email:    String(email),
                password: hashed,
                role:       role === 'admin' ? 'admin' : 'agent',
                phone:      phone      ? String(phone)      : null,
                avatar_url: avatar_url ? String(avatar_url) : null,
            })
            .returning({
                id:         users.id,
                name:       users.name,
                email:      users.email,
                role:       users.role,
                avatar_url: users.avatar_url,
                created_at: users.created_at,
            });

        return json({ user }, 201);
    } catch (err: any) {
        if (err?.code === '23505') {
            return json({ error: 'Ya existe un usuario con ese email' }, 409);
        }
        console.error(err);
        return json({ error: 'Error interno del servidor' }, 500);
    }
};
