import type { APIRoute } from 'astro';
import { json } from '../../../lib/api';
import { updateValuationRequest, deleteValuationRequest } from '../../../services/valuationRequests';

// Auth is enforced by src/middleware.ts (everything under /api/ except the allowlist).
const STATUSES = ['pending', 'contacted', 'closed'] as const;

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

    if (!STATUSES.includes(body.status as typeof STATUSES[number])) {
        return json({ error: `status must be one of: ${STATUSES.join(', ')}` }, 400);
    }

    try {
        const valuation = await updateValuationRequest(id, { status: body.status });
        if (!valuation) {
            return json({ error: 'Valuation request not found' }, 404);
        }
        return json({ valuation }, 200);
    } catch (err) {
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
        const deleted = await deleteValuationRequest(id);
        if (!deleted) {
            return json({ error: 'Valuation request not found' }, 404);
        }
        return json({ message: 'Valuation request deleted', id: deleted.id }, 200);
    } catch (err) {
        console.error(err);
        return json({ error: 'Internal server error' }, 500);
    }
};
