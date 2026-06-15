import type { APIRoute } from 'astro';
import { eq } from 'drizzle-orm';
import { db, zones } from '../../../db';
import { json, slugify } from '../../../lib/api';

export const GET: APIRoute = async ({ params }) => {
    const id = Number(params.id);
    if (!Number.isInteger(id)) {
        return json({ error: 'Invalid ID' }, 400);
    }

    try {
        const [zone] = await db
            .select()
            .from(zones)
            .where(eq(zones.id, id));

        if (!zone) {
            return json({ error: 'Zone not found' }, 404);
        }

        return json({ zone }, 200);
    } catch (err) {
        console.error(err);
        return json({ error: 'Internal server error' }, 500);
    }
};

export const PATCH: APIRoute = async ({ params, request }) => {
    const id = Number(params.id);
    if (!Number.isInteger(id)) {
        return json({ error: 'Invalid ID' }, 400);
    }

    let body: Record<string, unknown>;
    try {
        body = await request.json();
    } catch {
        return json({ error: 'Invalid body' }, 400);
    }

    const { country_id, name, slug, image_url, description, tags, display_order, is_active } = body;

    if (tags !== undefined && !Array.isArray(tags)) {
        return json({ error: 'tags must be an array' }, 400);
    }

    const values: Record<string, unknown> = {};
    if (country_id    !== undefined) values.country_id    = Number(country_id);
    if (name          !== undefined) values.name          = String(name);
    if (slug          !== undefined) values.slug          = slugify(String(slug));
    if (image_url     !== undefined) values.image_url     = image_url     ? String(image_url)     : null;
    if (description   !== undefined) values.description   = description   ? String(description)   : null;
    if (tags          !== undefined) values.tags          = tags as string[];
    if (display_order !== undefined) values.display_order = Number(display_order);
    if (is_active     !== undefined) values.is_active     = Boolean(is_active);

    if (Object.keys(values).length === 0) {
        return json({ error: 'No fields to update' }, 400);
    }

    try {
        const [zone] = await db
            .update(zones)
            .set(values)
            .where(eq(zones.id, id))
            .returning();

        if (!zone) {
            return json({ error: 'Zone not found' }, 404);
        }

        return json({ zone }, 200);
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

export const DELETE: APIRoute = async ({ params }) => {
    const id = Number(params.id);
    if (!Number.isInteger(id)) {
        return json({ error: 'Invalid ID' }, 400);
    }

    try {
        const [zone] = await db
            .delete(zones)
            .where(eq(zones.id, id))
            .returning({ id: zones.id });

        if (!zone) {
            return json({ error: 'Zone not found' }, 404);
        }

        return json({ message: 'Zone deleted', id: zone.id }, 200);
    } catch (err) {
        console.error(err);
        return json({ error: 'Internal server error' }, 500);
    }
};
