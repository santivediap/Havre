import type { APIRoute } from 'astro';
import bcrypt from 'bcryptjs';
import { json, emailRegex } from '../../lib/api';
import { getUserForAuth, touchLastLogin } from '../../services/users';
import { signSession, SESSION_COOKIE, SESSION_MAX_AGE } from '../../lib/auth';
import { isLoginBlocked, recordFailedLogin, clearLoginAttempts } from '../../lib/rateLimit';
import { env } from 'cloudflare:workers';

export const POST: APIRoute = async ({ request, cookies }) => {
    const kv = (env as Record<string, any>).SESSION;
    const ip = request.headers.get('cf-connecting-ip') ?? 'unknown';

    if (await isLoginBlocked(kv, ip)) {
        return json({ error: 'Demasiados intentos fallidos. Inténtalo de nuevo en unos minutos.' }, 429);
    }

    let body: Record<string, unknown>;
    try {
        body = await request.json();
    } catch {
        return json({ error: 'Invalid body' }, 400);
    }

    const { email, password } = body;

    if (!email || !password) {
        return json({ error: 'email and password are required' }, 400);
    }

    if (!emailRegex.test(String(email))) {
        return json({ error: 'Invalid email format' }, 400);
    }

    try {
        const user = await getUserForAuth(String(email));

        if (!user || !(await bcrypt.compare(String(password), user.password))) {
            await recordFailedLogin(kv, ip);
            return json({ error: 'Invalid credentials' }, 401);
        }

        if (!user.is_active) {
            return json({ error: 'Account is disabled' }, 403);
        }

        const token = await signSession({ sub: user.id, email: user.email, role: user.role });

        cookies.set(SESSION_COOKIE, token, {
            httpOnly: true,
            secure:   true,
            sameSite: 'lax',
            path:     '/',
            maxAge:   SESSION_MAX_AGE,
        });

        await touchLastLogin(user.id);
        await clearLoginAttempts(kv, ip);

        return json({
            user: { id: user.id, name: user.name, email: user.email, role: user.role },
        }, 200);
    } catch (err) {
        console.error(err);
        return json({ error: 'Internal server error' }, 500);
    }
};
