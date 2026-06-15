import type { APIRoute } from 'astro';
import { db, countries } from '../../../db';
import { json, slugify } from '../../../lib/api';

export const GET: APIRoute = async () => {
    try {
        const list = await db
            .select()
            .from(countries)
            .orderBy(countries.name);

        return json({ countries: list }, 200);
    } catch (err) {
        console.error(err);
        return json({ error: 'Internal server error' }, 500);
    }
};

export const POST: APIRoute = async ({ request }) => {
    let body: Record<string, unknown>;
    try {
        body = await request.json();
    } catch {
        return json({ error: 'Invalid body' }, 400);
    }

    const { name, slug } = body;

    if (!name) {
        return json({ error: 'Name is required' }, 400);
    }

    try {
        const [country] = await db
            .insert(countries)
            .values({
                name: String(name),
                slug: slug ? slugify(String(slug)) : slugify(String(name)),
            })
            .returning();

        return json({ country }, 201);
    } catch (err: any) {
        if (err?.code === '23505') {
            return json({ error: 'A country with that slug already exists' }, 409);
        }
        console.error(err);
        return json({ error: 'Internal server error' }, 500);
    }
};
