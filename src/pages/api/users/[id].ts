import type { APIRoute } from 'astro';
import bcrypt from 'bcryptjs';
import { json, emailRegex, passwordRegex } from '../../../lib/api';
import { getUserById, updateUser, deleteUser } from '../../../services/users';
import { uploadAvatar } from '../../../lib/cloudinary';

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
    const contentType = request.headers.get('content-type') ?? '';
    const values: Record<string, unknown> = { updated_at: new Date() };

    if (contentType.includes('multipart/form-data')) {
        const form = await request.formData();

        const name  = form.get('name');
        const email = form.get('email');
        const phone = form.get('phone');
        const role  = form.get('role');
        const password = form.get('password');
        const avatar   = form.get('avatar');

        if (name)  values.name = String(name);
        if (role)  values.role = role === 'admin' ? 'admin' : 'agent';
        if (phone !== null) values.phone = phone ? String(phone) : null;

        if (email) {
            if (!emailRegex.test(String(email))) {
                return json({ error: 'Invalid email format' }, 400);
            }
            values.email = String(email);
        }

        if (password && String(password).length > 0) {
            if (!passwordRegex.test(String(password))) {
                return json({ error: 'Weak password' }, 400);
            }
            values.password = await bcrypt.hash(String(password), 12);
        }

        if (avatar instanceof File && avatar.size > 0) {
            if (!avatar.type.startsWith('image/')) {
                return json({ error: 'Avatar must be an image' }, 400);
            }
            if (avatar.size > 2 * 1024 * 1024) {
                return json({ error: 'Avatar exceeds 2 MB' }, 400);
            }
            try {
                values.avatar_url = await uploadAvatar(avatar);
            } catch (err) {
                console.error(err);
                return json({ error: 'Could not upload avatar' }, 502);
            }
        }
    } else {
        let body: Record<string, unknown>;
        try {
            body = await request.json();
        } catch {
            return json({ error: 'Invalid body' }, 400);
        }

        const { name, email, password, role, phone, avatar_url, is_active } = body;

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
            if (!passwordRegex.test(String(password))) {
                return json({ error: 'Weak password' }, 400);
            }
            values.password = await bcrypt.hash(String(password), 12);
        }
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
        if (err?.code === '23503') {
            return json({ error: 'User has assigned properties' }, 409);
        }
        console.error(err);
        return json({ error: 'Internal server error' }, 500);
    }
};
