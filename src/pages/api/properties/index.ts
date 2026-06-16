import type { APIRoute } from 'astro';
import { json, slugify } from '../../../lib/api';
import { getSession } from '../../../lib/auth';
import { getProperties, createProperty, addPropertyImages } from '../../../services/properties';
import { uploadPropertyImage } from '../../../lib/cloudinary';

const MAX_PHOTOS = 10;
const TAGS    = ['for_sale', 'new', 'reserved', 'sold'] as const;
const STATUSES = ['draft', 'published', 'archived'] as const;

function parseList(raw: string): string[] | null {
    const items = raw.split(',').map(t => t.trim()).filter(Boolean);
    return items.length ? items : null;
}

// One distance per line in the format "value unit label": "4 km al pueblo".
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

export const GET: APIRoute = async () => {
    try {
        const list = await getProperties();
        return json({ properties: list }, 200);
    } catch (err) {
        console.error(err);
        return json({ error: 'Internal server error' }, 500);
    }
};

export const POST: APIRoute = async ({ request, cookies }) => {
    const session = await getSession(cookies);
    if (!session) return json({ error: 'Unauthorized' }, 401);

    const contentType = request.headers.get('content-type') ?? '';
    if (!contentType.includes('multipart/form-data')) {
        return json({ error: 'Expected multipart/form-data' }, 400);
    }

    const form = await request.formData();

    const title   = form.get('title');
    const zoneId  = form.get('zone_id');
    const price   = form.get('price');
    const nBeds   = form.get('n_beds');
    const nBaths  = form.get('n_baths');
    const mBuilt  = form.get('m_built');

    if (!title || !zoneId || !price || !nBeds || !nBaths || !mBuilt) {
        return json({ error: 'title, zone_id, price, n_beds, n_baths and m_built are required' }, 400);
    }

    const tagRaw    = String(form.get('tag') ?? 'for_sale');
    const statusRaw = String(form.get('status') ?? 'draft');
    const tag    = (TAGS as readonly string[]).includes(tagRaw) ? tagRaw : 'for_sale';
    const status = (STATUSES as readonly string[]).includes(statusRaw) ? statusRaw : 'draft';

    // Only admins can assign the agent; everyone else creates under their own name.
    const agentField = form.get('agent_id');
    const agentId = session.role === 'admin' && agentField ? String(agentField) : session.sub;

    const terrain     = form.get('terrain_space');
    const description = form.get('description');
    const features    = form.get('features');
    const distances   = form.get('distances');
    const latitude    = form.get('latitude');
    const longitude   = form.get('longitude');
    const isFeatured  = form.get('is_featured') === 'true';

    // Photos and their captions arrive as parallel arrays, in display order.
    const photos   = form.getAll('photos').filter((f): f is File => f instanceof File && f.size > 0);
    const captions = form.getAll('captions').map(String);
    if (photos.length > MAX_PHOTOS) {
        return json({ error: `A property can have at most ${MAX_PHOTOS} photos` }, 400);
    }
    for (const photo of photos) {
        if (!photo.type.startsWith('image/')) {
            return json({ error: 'All photos must be images' }, 400);
        }
        if (photo.size > 5 * 1024 * 1024) {
            return json({ error: 'Each photo must be under 5 MB' }, 400);
        }
    }

    let images: { url: string; caption: string | null }[] = [];
    if (photos.length > 0) {
        try {
            const urls = await Promise.all(photos.map(p => uploadPropertyImage(p)));
            images = urls.map((url, i) => ({ url, caption: captions[i]?.trim() || null }));
        } catch (err) {
            console.error(err);
            return json({ error: 'Could not upload photos' }, 502);
        }
    }

    // Human-readable, unique reference (HAV-XXXXXX).
    const reference = `HAV-${Date.now().toString(36).toUpperCase()}`;
    const slug = `${slugify(String(title))}-${reference.slice(4).toLowerCase()}`;

    try {
        const property = await createProperty({
            zone_id:       Number(zoneId),
            agent_id:      agentId,
            title:         String(title),
            slug,
            reference,
            tag:           tag as 'for_sale' | 'new' | 'reserved' | 'sold',
            status:        status as 'draft' | 'published' | 'archived',
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
            is_featured:   isFeatured,
        });

        await addPropertyImages(property.id, images);

        return json({ property }, 201);
    } catch (err: any) {
        if (err?.code === '23503') {
            return json({ error: 'Zone not found' }, 404);
        }
        if (err?.code === '23505') {
            return json({ error: 'A property with that reference already exists' }, 409);
        }
        console.error(err);
        return json({ error: 'Internal server error' }, 500);
    }
};
