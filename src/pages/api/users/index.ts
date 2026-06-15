import type { APIRoute } from 'astro';
import bcrypt from 'bcryptjs';
import { json, emailRegex, passwordRegex } from '../../../lib/api';
import { getUsers, createUser } from '../../../services/users';
import { uploadAvatar } from '../../../lib/cloudinary';

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
    const contentType = request.headers.get('content-type') ?? '';

    let name: unknown, email: unknown, password: unknown, role: unknown, phone: unknown;
    let avatarUrl: string | null = null;
    let avatarFile: File | null = null;

    if (contentType.includes('multipart/form-data')) {
        const form = await request.formData();
        name     = form.get('name');
        email    = form.get('email');
        password = form.get('password');
        role     = form.get('role');
        phone    = form.get('phone');

        const file = form.get('avatar');
        if (file instanceof File && file.size > 0) avatarFile = file;
    } else {
        let body: Record<string, unknown>;
        try {
            body = await request.json();
        } catch {
            return json({ error: 'Invalid body' }, 400);
        }
        ({ name, email, password, role, phone } = body);
        if (body.avatar_url) avatarUrl = String(body.avatar_url);
    }

    if (!name || !email || !password) {
        return json({ error: 'name, email and password are required' }, 400);
    }

    if (!emailRegex.test(String(email))) {
        return json({ error: 'Invalid email format' }, 400);
    }

    if (!passwordRegex.test(String(password))) {
        return json({ error: 'Weak password' }, 400);
    }

    if (avatarFile) {
        if (!avatarFile.type.startsWith('image/')) {
            return json({ error: 'Avatar must be an image' }, 400);
        }
        if (avatarFile.size > 2 * 1024 * 1024) {
            return json({ error: 'Avatar exceeds 2 MB' }, 400);
        }
        try {
            avatarUrl = await uploadAvatar(avatarFile);
        } catch (err) {
            console.error(err);
            return json({ error: 'Could not upload avatar' }, 502);
        }
    }

    try {
        const user = await createUser({
            name:       String(name),
            email:      String(email),
            password:   await bcrypt.hash(String(password), 12),
            role:       role === 'admin' ? 'admin' : 'agent',
            phone:      phone ? String(phone) : null,
            avatar_url: avatarUrl,
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
