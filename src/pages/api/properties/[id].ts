import type { APIRoute } from 'astro';
import { json, slugify } from '../../../lib/api';
import { getSession } from '../../../lib/auth';
import { uploadPropertyImage, deleteImage } from '../../../lib/cloudinary';
import {
    getPropertyById,
    getPropertyImages,
    updateProperty,
    syncPropertyImages,
    deleteProperty,
} from '../../../services/properties';

const MAX_PHOTOS = 10;
const TAGS     = ['for_sale', 'new', 'reserved', 'sold'] as const;
const STATUSES = ['draft', 'published', 'archived'] as const;

function parseList(raw: string): string[] | null {
    const items = raw.split(',').map(t => t.trim()).filter(Boolean);
    return items.length ? items : null;
}

function parseDistances(raw: string): { value: number; unit: string; label: string }[] | null {
    const result = raw
        .split('\n')
        .map(line => line.trim())
        .filter(Boolean)
        .map(line => {
            const [value, unit, ...rest] = line.split(/\s+/);
            return { value: Number(value), unit, label: rest.join(' ') };
        })
        .filter(d => !Number.isNaN(d.value) && d.unit && d.label);
    return result.length ? result : null;
}

export const GET: APIRoute = async ({ params, cookies }) => {
    if (!(await getSession(cookies))) return json({ error: 'Unauthorized' }, 401);

    try {
        const property = await getPropertyById(params.id!);
        if (!property) return json({ error: 'Property not found' }, 404);

        const images = await getPropertyImages(params.id!);
        return json({ property, images }, 200);
    } catch (err: any) {
        if (err?.code === '22P02') return json({ error: 'Invalid ID' }, 400);
        console.error(err);
        return json({ error: 'Internal server error' }, 500);
    }
};

export const PATCH: APIRoute = async ({ params, request, cookies }) => {
    const session = await getSession(cookies);
    if (!session) return json({ error: 'Unauthorized' }, 401);

    const propertyId = params.id!;
    const contentType = request.headers.get('content-type') ?? '';
    if (!contentType.includes('multipart/form-data')) {
        return json({ error: 'Expected multipart/form-data' }, 400);
    }

    const form = await request.formData();

    const title  = form.get('title');
    const zoneId = form.get('zone_id');
    const price  = form.get('price');
    const nBeds  = form.get('n_beds');
    const nBaths = form.get('n_baths');
    const mBuilt = form.get('m_built');

    if (!title || !zoneId || !price || !nBeds || !nBaths || !mBuilt) {
        return json({ error: 'title, zone_id, price, n_beds, n_baths and m_built are required' }, 400);
    }

    const tagRaw    = String(form.get('tag') ?? 'for_sale');
    const statusRaw = String(form.get('status') ?? 'draft');
    const terrain     = form.get('terrain_space');
    const description = form.get('description');
    const features    = form.get('features');
    const distances   = form.get('distances');
    const latitude    = form.get('latitude');
    const longitude   = form.get('longitude');

    const values: Record<string, unknown> = {
        zone_id:       Number(zoneId),
        title:         String(title),
        tag:           (TAGS as readonly string[]).includes(tagRaw) ? tagRaw : 'for_sale',
        status:        (STATUSES as readonly string[]).includes(statusRaw) ? statusRaw : 'draft',
        price:         Number(price),
        n_beds:        Number(nBeds),
        n_baths:       Number(nBaths),
        m_built:       Number(mBuilt),
        terrain_space: terrain ? String(terrain) : null,
        description:   description ? String(description) : null,
        features:      features ? parseList(String(features)) : null,
        distances:     distances ? parseDistances(String(distances)) : null,
        latitude:      latitude ? String(latitude) : null,
        longitude:     longitude ? String(longitude) : null,
        is_featured:   form.get('is_featured') === 'true',
    };

    // Only admins may reassign the responsible agent.
    const agentField = form.get('agent_id');
    if (session.role === 'admin' && agentField) values.agent_id = String(agentField);

    // Gallery: an ordered list of existing (by id) and new (by file index) images.
    let order: { existingId?: number; newIndex?: number; caption?: string }[] = [];
    try {
        order = JSON.parse(String(form.get('images_order') ?? '[]'));
    } catch {
        return json({ error: 'Invalid images_order' }, 400);
    }

    const photos = form.getAll('photos').filter((f): f is File => f instanceof File && f.size > 0);
    if (order.length > MAX_PHOTOS) {
        return json({ error: `A property can have at most ${MAX_PHOTOS} photos` }, 400);
    }
    for (const photo of photos) {
        if (!photo.type.startsWith('image/')) return json({ error: 'All photos must be images' }, 400);
        if (photo.size > 5 * 1024 * 1024)    return json({ error: 'Each photo must be under 5 MB' }, 400);
    }

    try {
        const updated = await updateProperty(propertyId, values);
        if (!updated) return json({ error: 'Property not found' }, 404);

        // Upload the new files, then reconcile the gallery to the desired order.
        let newUrls: string[] = [];
        try {
            newUrls = await Promise.all(photos.map(p => uploadPropertyImage(p)));
        } catch (err) {
            console.error(err);
            return json({ error: 'Could not upload photos' }, 502);
        }

        const items = order.map(o => ({
            existingId: o.existingId,
            url:        typeof o.newIndex === 'number' ? newUrls[o.newIndex] : undefined,
            caption:    o.caption?.trim() || null,
        }));
        await syncPropertyImages(propertyId, items);

        return json({ property: updated }, 200);
    } catch (err: any) {
        if (err?.code === '23503') return json({ error: 'Zone not found' }, 404);
        if (err?.code === '22P02') return json({ error: 'Invalid ID' }, 400);
        console.error(err);
        return json({ error: 'Internal server error' }, 500);
    }
};

export const DELETE: APIRoute = async ({ params, cookies }) => {
    if (!(await getSession(cookies))) return json({ error: 'Unauthorized' }, 401);

    try {
        // Grab the image URLs before the cascade removes their rows.
        const images = await getPropertyImages(params.id!);

        const deleted = await deleteProperty(params.id!);
        if (!deleted) return json({ error: 'Property not found' }, 404);

        // Best-effort cleanup of the Cloudinary assets.
        await Promise.allSettled(images.map(img => deleteImage(img.url)));

        return json({ message: 'Property deleted', id: deleted.id }, 200);
    } catch (err: any) {
        if (err?.code === '22P02') return json({ error: 'Invalid ID' }, 400);
        console.error(err);
        return json({ error: 'Internal server error' }, 500);
    }
};
