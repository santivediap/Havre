// Minimal shape of a Cloudflare KV namespace (avoids depending on global types).
interface KVLike {
    get(key: string): Promise<string | null>;
    put(key: string, value: string, options?: { expirationTtl?: number }): Promise<unknown>;
    delete(key: string): Promise<unknown>;
}

const MAX_FAILED = 8;
const WINDOW_SECONDS = 15 * 60; // 15 minutes

const key = (ip: string) => `rl:login:${ip}`;

// Rate limiting must never break login. Any KV problem → fail open (allow the request).

/** True if this IP has too many recent failed logins and should be blocked. */
export async function isLoginBlocked(kv: KVLike | undefined, ip: string): Promise<boolean> {
    if (!kv) return false;
    try {
        const count = Number(await kv.get(key(ip))) || 0;
        return count >= MAX_FAILED;
    } catch {
        return false;
    }
}

/** Record a failed login attempt for this IP (15-min sliding window). */
export async function recordFailedLogin(kv: KVLike | undefined, ip: string): Promise<void> {
    if (!kv) return;
    try {
        const count = Number(await kv.get(key(ip))) || 0;
        await kv.put(key(ip), String(count + 1), { expirationTtl: WINDOW_SECONDS });
    } catch {
        /* ignore */
    }
}

/** Clear the counter after a successful login. */
export async function clearLoginAttempts(kv: KVLike | undefined, ip: string): Promise<void> {
    if (!kv) return;
    try {
        await kv.delete(key(ip));
    } catch {
        /* ignore */
    }
}
