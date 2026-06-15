import type { APIRoute } from 'astro';
import { json, slugify } from '../../../lib/api';
import { getCountries, createCountry } from '../../../services/countries';

export const GET: APIRoute = async () => {
    try {
        const list = await getCountries();
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
        const country = await createCountry({
            name: String(name),
            slug: slug ? slugify(String(slug)) : slugify(String(name)),
        });

        return json({ country }, 201);
    } catch (err: any) {
        if (err?.code === '23505') {
            return json({ error: 'A country with that slug already exists' }, 409);
        }
        console.error(err);
        return json({ error: 'Internal server error' }, 500);
    }
};
