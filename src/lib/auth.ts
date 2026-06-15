import { SignJWT, jwtVerify } from 'jose';
import { env } from 'cloudflare:workers';

const ALG = 'HS256';

export const SESSION_COOKIE = 'havre_session';
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7;

export interface SessionPayload {
    sub:   string;
    email: string;
    role:  'admin' | 'agent';
}

function getSecret() {
    return new TextEncoder().encode(env.JWT_SECRET);
}

export async function signSession(payload: SessionPayload): Promise<string> {
    return new SignJWT({ email: payload.email, role: payload.role })
        .setProtectedHeader({ alg: ALG })
        .setSubject(payload.sub)
        .setIssuedAt()
        .setExpirationTime(`${SESSION_MAX_AGE}s`)
        .sign(getSecret());
}

export async function verifySession(token: string): Promise<SessionPayload | null> {
    try {
        const { payload } = await jwtVerify(token, getSecret());
        return {
            sub:   payload.sub as string,
            email: payload.email as string,
            role:  payload.role as 'admin' | 'agent',
        };
    } catch {
        return null;
    }
}
