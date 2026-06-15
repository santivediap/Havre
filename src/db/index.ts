import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { env } from 'cloudflare:workers';
import * as schema from './schema';

type DrizzleDB = ReturnType<typeof drizzle<typeof schema>>;

let _db: DrizzleDB | undefined;

function getDb(): DrizzleDB {
    if (!_db) {
        _db = drizzle({ client: neon(env.DATABASE_URL), schema });
    }
    return _db;
}

export const db = new Proxy({} as DrizzleDB, {
    get(_target, prop) {
        return Reflect.get(getDb(), prop);
    },
});

export * from './schema';
