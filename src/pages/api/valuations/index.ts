import type { APIRoute } from 'astro';
import { json, emailRegex } from '../../../lib/api';
import { createValuationRequest, getValuationRequests } from '../../../services/valuationRequests';

const TYPES = ['country-house', 'farmhouse', 'property'];

// Admin-only (guarded by middleware): list valuation requests.
export const GET: APIRoute = async () => {
    try {
        const list = await getValuationRequests();
        return json({ valuations: list }, 200);
    } catch (err) {
        console.error(err);
        return json({ error: 'Internal server error' }, 500);
    }
};

// Public: a seller requests a free valuation from the "vender" page.
export const POST: APIRoute = async ({ request }) => {
    const contentType = request.headers.get('content-type') ?? '';

    let address: unknown, type: unknown, surface: unknown, name: unknown, email: unknown;

    if (contentType.includes('application/json')) {
        let body: Record<string, unknown>;
        try {
            body = await request.json();
        } catch {
            return json({ error: 'Invalid body' }, 400);
        }
        ({ address, type, surface, name, email } = body);
    } else {
        const form = await request.formData();
        address = form.get('address');
        type    = form.get('type');
        surface = form.get('surface');
        name    = form.get('name');
        email   = form.get('email');
    }

    const addressStr = String(address ?? '').trim();
    const nameStr    = String(name ?? '').trim();
    const emailStr   = String(email ?? '').trim();

    if (!addressStr || !nameStr || !emailStr) {
        return json({ error: 'address, name and email are required' }, 400);
    }
    if (!emailRegex.test(emailStr)) {
        return json({ error: 'Invalid email format' }, 400);
    }
    if (addressStr.length > 255 || nameStr.length > 100 || emailStr.length > 255) {
        return json({ error: 'One of the fields is too long' }, 400);
    }

    const propertyType = TYPES.includes(String(type)) ? String(type) : null;
    const surfaceNum   = Number(surface);
    const surfaceVal   = Number.isFinite(surfaceNum) && surfaceNum > 0 ? Math.round(surfaceNum) : null;

    try {
        const valuation = await createValuationRequest({
            address:       addressStr,
            property_type: propertyType,
            surface:       surfaceVal,
            name:          nameStr,
            email:         emailStr,
        });
        return json({ valuation }, 201);
    } catch (err) {
        console.error(err);
        return json({ error: 'Internal server error' }, 500);
    }
};
