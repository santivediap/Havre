import type { APIRoute } from 'astro';
import { json } from '../../lib/api';
import { SESSION_COOKIE } from '../../lib/auth';

export const POST: APIRoute = async ({ cookies }) => {
    cookies.delete(SESSION_COOKIE, { path: '/' });
    return json({ message: 'Logged out' }, 200);
};
