import { users } from '../db';

export function json(data: unknown, status: number) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { 'Content-Type': 'application/json' },
    });
}

export function slugify(text: string): string {
    return text
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

export const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const publicUserColumns = {
    id:            users.id,
    name:          users.name,
    email:         users.email,
    role:          users.role,
    phone:         users.phone,
    avatar_url:    users.avatar_url,
    is_active:     users.is_active,
    created_at:    users.created_at,
    updated_at:    users.updated_at,
    last_login_at: users.last_login_at,
};
