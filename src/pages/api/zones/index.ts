import type { APIRoute } from 'astro';
import { eq } from 'drizzle-orm';
import { db, zones } from '../../../db';
import { json, slugify } from '../../../lib/api';

export const GET: APIRoute = async () => {
    try {
        const list = await db
            .select()
            .from(zones)
            .orderBy(zones.display_order, zones.name);

        return json({ zones: list }, 200);
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

    const { country_id, name, slug, image_url, description, tags, display_order } = body;

    if (!country_id || !name) {
        return json({ error: 'country_id and name are required' }, 400);
    }

    if (tags !== undefined && !Array.isArray(tags)) {
        return json({ error: 'tags must be an array' }, 400);
    }

    try {
        const [zone] = await db
            .insert(zones)
            .values({
                country_id:    Number(country_id),
                name:          String(name),
                slug:          slug ? slugify(String(slug)) : slugify(String(name)),
                image_url:     image_url     ? String(image_url)     : null,
                description:   description   ? String(description)   : null,
                tags:          tags          ? (tags as string[])    : null,
                display_order: display_order ? Number(display_order) : 0,
            })
            .returning();

        return json({ zone }, 201);
    } catch (err: any) {
        if (err?.code === '23505') {
            return json({ error: 'A zone with that slug already exists' }, 409);
        }
        if (err?.code === '23503') {
            return json({ error: 'Country not found' }, 404);
        }
        console.error(err);
        return json({ error: 'Internal server error' }, 500);
    }
};
