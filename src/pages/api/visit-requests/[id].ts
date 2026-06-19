import type { APIRoute } from 'astro';
import { json } from '../../../lib/api';
import { getSession } from '../../../lib/auth';
import {
    getVisitRequestById,
    updateVisitRequest,
    deleteVisitRequest,
} from '../../../services/visitRequests';

const STATUSES = ['pending', 'contacted', 'closed'] as const;

export const GET: APIRoute = async ({ params, cookies }) => {
    const session = await getSession(cookies);
    if (!session) return json({ error: 'Unauthorized' }, 401);

    const id = Number(params.id);
    if (!Number.isInteger(id)) {
        return json({ error: 'Invalid ID' }, 400);
    }

    try {
        const visitRequest = await getVisitRequestById(id);
        if (!visitRequest) {
            return json({ error: 'Visit request not found' }, 404);
        }
        return json({ visitRequest }, 200);
    } catch (err) {
        console.error(err);
        return json({ error: 'Internal server error' }, 500);
    }
};

export const PATCH: APIRoute = async ({ params, request, cookies }) => {
    const session = await getSession(cookies);
    if (!session) return json({ error: 'Unauthorized' }, 401);

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

    const values: Record<string, unknown> = {};

    if (body.status !== undefined) {
        if (!STATUSES.includes(body.status as typeof STATUSES[number])) {
            return json({ error: `status must be one of: ${STATUSES.join(', ')}` }, 400);
        }
        values.status = body.status;
    }

    if (Object.keys(values).length === 0) {
        return json({ error: 'No fields to update' }, 400);
    }

    try {
        const visitRequest = await updateVisitRequest(id, values);
        if (!visitRequest) {
            return json({ error: 'Visit request not found' }, 404);
        }
        return json({ visitRequest }, 200);
    } catch (err) {
        console.error(err);
        return json({ error: 'Internal server error' }, 500);
    }
};

export const DELETE: APIRoute = async ({ params, cookies }) => {
    const session = await getSession(cookies);
    if (!session) return json({ error: 'Unauthorized' }, 401);

    const id = Number(params.id);
    if (!Number.isInteger(id)) {
        return json({ error: 'Invalid ID' }, 400);
    }

    try {
        const deleted = await deleteVisitRequest(id);
        if (!deleted) {
            return json({ error: 'Visit request not found' }, 404);
        }
        return json({ message: 'Visit request deleted', id: deleted.id }, 200);
    } catch (err) {
        console.error(err);
        return json({ error: 'Internal server error' }, 500);
    }
};
