import type { APIRoute } from 'astro';
import { eq } from 'drizzle-orm';
import { db, countries } from '../../../db';
import { json, slugify } from './_shared';

export const GET: APIRoute = async ({ params }) => {
    const id = Number(params.id);
    if (!Number.isInteger(id)) {
        return json({ error: 'Invalid ID' }, 400);
    }

    try {
        const [country] = await db
            .select()
            .from(countries)
            .where(eq(countries.id, id));

        if (!country) {
            return json({ error: 'Country not found' }, 404);
        }

        return json({ country }, 200);
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

    const { name, slug } = body;

    const values: Record<string, unknown> = {};
    if (name !== undefined) values.name = String(name);
    if (slug !== undefined) values.slug = slugify(String(slug));

    if (Object.keys(values).length === 0) {
        return json({ error: 'No fields to update' }, 400);
    }

    try {
        const [country] = await db
            .update(countries)
            .set(values)
            .where(eq(countries.id, id))
            .returning();

        if (!country) {
            return json({ error: 'Country not found' }, 404);
        }

        return json({ country }, 200);
    } catch (err: any) {
        if (err?.code === '23505') {
            return json({ error: 'A country with that slug already exists' }, 409);
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
        const [country] = await db
            .delete(countries)
            .where(eq(countries.id, id))
            .returning({ id: countries.id });

        if (!country) {
            return json({ error: 'Country not found' }, 404);
        }

        return json({ message: 'Country deleted', id: country.id }, 200);
    } catch (err) {
        console.error(err);
        return json({ error: 'Internal server error' }, 500);
    }
};
