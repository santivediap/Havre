import { defineMiddleware } from 'astro:middleware';
import { getSession } from './lib/auth';

// Endpoints reachable without a session: the login itself, logout, and the
// public "request a visit" form submitted from a property page.
const PUBLIC_API = new Set([
    'POST /api/login',
    'POST /api/logout',
    'POST /api/visit-requests',
]);

const unauthorized = (error: string, status: number) =>
    new Response(JSON.stringify({ error }), {
        status,
        headers: { 'Content-Type': 'application/json' },
    });

export const onRequest = defineMiddleware(async (context, next) => {
    const path = context.url.pathname.replace(/\/$/, '') || '/';

    // Only guard the API; pages keep their own redirect-based auth.
    if (!path.startsWith('/api/')) return next();

    if (PUBLIC_API.has(`${context.request.method} ${path}`)) return next();

    const session = await getSession(context.cookies);
    if (!session) return unauthorized('Unauthorized', 401);

    // User management is admin-only.
    if (path.startsWith('/api/users') && session.role !== 'admin') {
        return unauthorized('Forbidden', 403);
    }

    return next();
});
