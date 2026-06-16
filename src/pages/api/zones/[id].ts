import type { APIRoute } from 'astro';
import { json, slugify } from '../../../lib/api';
import { getZoneById, updateZone, deleteZone } from '../../../services/zones';
import { uploadZoneImage } from '../../../lib/cloudinary';

function parseTags(raw: string): string[] | null {
    const tags = raw.split(',').map(t => t.trim()).filter(Boolean);
    return tags.length ? tags : null;
}

export const GET: APIRoute = async ({ params }) => {
    const id = Number(params.id);
    if (!Number.isInteger(id)) {
        return json({ error: 'Invalid ID' }, 400);
    }

    try {
        const zone = await getZoneById(id);

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

    const contentType = request.headers.get('content-type') ?? '';
    const values: Record<string, unknown> = {};

    if (contentType.includes('multipart/form-data')) {
        const form = await request.formData();

        const country_id   = form.get('country_id');
        const name         = form.get('name');
        const slug         = form.get('slug');
        const description  = form.get('description');
        const tags         = form.get('tags');
        const displayOrder = form.get('display_order');
        const isActive     = form.get('is_active');
        const image        = form.get('image');

        if (country_id)         values.country_id = Number(country_id);
        if (name)               values.name = String(name);
        if (slug !== null)      values.slug = slug ? slugify(String(slug)) : (name ? slugify(String(name)) : undefined);
        if (description !== null) values.description = description ? String(description) : null;
        if (tags !== null)      values.tags = tags ? parseTags(String(tags)) : null;
        if (displayOrder !== null && displayOrder !== '') values.display_order = Number(displayOrder);
        if (isActive !== null)  values.is_active = isActive === 'true';

        if (image instanceof File && image.size > 0) {
            if (!image.type.startsWith('image/')) {
                return json({ error: 'Image must be an image file' }, 400);
            }
            if (image.size > 5 * 1024 * 1024) {
                return json({ error: 'Image exceeds 5 MB' }, 400);
            }
            try {
                values.image_url = await uploadZoneImage(image);
            } catch (err) {
                console.error(err);
                return json({ error: 'Could not upload image' }, 502);
            }
        }
    } else {
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

        if (country_id    !== undefined) values.country_id    = Number(country_id);
        if (name          !== undefined) values.name          = String(name);
        if (slug          !== undefined) values.slug          = slugify(String(slug));
        if (image_url     !== undefined) values.image_url     = image_url     ? String(image_url)     : null;
        if (description   !== undefined) values.description   = description   ? String(description)   : null;
        if (tags          !== undefined) values.tags          = tags as string[];
        if (display_order !== undefined) values.display_order = Number(display_order);
        if (is_active     !== undefined) values.is_active     = Boolean(is_active);
    }

    if (Object.keys(values).length === 0) {
        return json({ error: 'No fields to update' }, 400);
    }

    try {
        const zone = await updateZone(id, values);

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
        const zone = await deleteZone(id);

        if (!zone) {
            return json({ error: 'Zone not found' }, 404);
        }

        return json({ message: 'Zone deleted', id: zone.id }, 200);
    } catch (err: any) {
        if (err?.code === '23503') {
            return json({ error: 'Zone has properties' }, 409);
        }
        console.error(err);
        return json({ error: 'Internal server error' }, 500);
    }
};
