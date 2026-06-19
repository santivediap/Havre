import type { APIRoute } from 'astro';
import { json } from '../../../lib/api';
import { getSession } from '../../../lib/auth';
import { getVisitRequests, createVisitRequest } from '../../../services/visitRequests';

// Admin-only: list every visit request (optionally for one property).
export const GET: APIRoute = async ({ cookies, url }) => {
    const session = await getSession(cookies);
    if (!session) return json({ error: 'Unauthorized' }, 401);

    try {
        const propertyId = url.searchParams.get('property_id') ?? undefined;
        const list = await getVisitRequests(propertyId);
        return json({ visitRequests: list }, 200);
    } catch (err) {
        console.error(err);
        return json({ error: 'Internal server error' }, 500);
    }
};

// Public: a visitor submits a request from a property page.
export const POST: APIRoute = async ({ request }) => {
    const contentType = request.headers.get('content-type') ?? '';

    let property_id: unknown, name: unknown, contact: unknown, preferred_date: unknown;

    if (contentType.includes('application/json')) {
        let body: Record<string, unknown>;
        try {
            body = await request.json();
        } catch {
            return json({ error: 'Invalid body' }, 400);
        }
        property_id    = body.property_id;
        name           = body.name;
        contact        = body.contact;
        preferred_date = body.preferred_date;
    } else {
        const form = await request.formData();
        property_id    = form.get('property_id');
        name           = form.get('name');
        contact        = form.get('contact');
        preferred_date = form.get('preferred_date');
    }

    const nameStr    = String(name ?? '').trim();
    const contactStr = String(contact ?? '').trim();

    if (!property_id || !nameStr || !contactStr) {
        return json({ error: 'property_id, name and contact are required' }, 400);
    }
    if (nameStr.length > 100) {
        return json({ error: 'name is too long' }, 400);
    }
    if (contactStr.length > 255) {
        return json({ error: 'contact is too long' }, 400);
    }

    try {
        const visitRequest = await createVisitRequest({
            property_id:    String(property_id),
            name:           nameStr,
            contact:        contactStr,
            preferred_date: preferred_date ? String(preferred_date) : null,
        });

        return json({ visitRequest }, 201);
    } catch (err: any) {
        if (err?.code === '23503') {
            return json({ error: 'Property not found' }, 404);
        }
        console.error(err);
        return json({ error: 'Internal server error' }, 500);
    }
};
