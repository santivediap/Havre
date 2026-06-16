import type { APIRoute } from 'astro';
import { json, slugify } from '../../../lib/api';
import { getZones, createZone } from '../../../services/zones';
import { uploadZoneImage } from '../../../lib/cloudinary';

export const GET: APIRoute = async () => {
    try {
        const list = await getZones();
        return json({ zones: list }, 200);
    } catch (err) {
        console.error(err);
        return json({ error: 'Internal server error' }, 500);
    }
};

function parseTags(raw: string): string[] | null {
    const tags = raw.split(',').map(t => t.trim()).filter(Boolean);
    return tags.length ? tags : null;
}

export const POST: APIRoute = async ({ request }) => {
    const contentType = request.headers.get('content-type') ?? '';

    let country_id: unknown, name: unknown, slug: unknown, description: unknown, displayOrder: unknown;
    let tags: string[] | null = null;
    let imageUrl: string | null = null;
    let imageFile: File | null = null;

    if (contentType.includes('multipart/form-data')) {
        const form = await request.formData();
        country_id   = form.get('country_id');
        name         = form.get('name');
        slug         = form.get('slug');
        description  = form.get('description');
        displayOrder = form.get('display_order');

        const rawTags = form.get('tags');
        if (rawTags) tags = parseTags(String(rawTags));

        const file = form.get('image');
        if (file instanceof File && file.size > 0) imageFile = file;
    } else {
        let body: Record<string, unknown>;
        try {
            body = await request.json();
        } catch {
            return json({ error: 'Invalid body' }, 400);
        }
        country_id   = body.country_id;
        name         = body.name;
        slug         = body.slug;
        description  = body.description;
        displayOrder = body.display_order;
        if (Array.isArray(body.tags)) tags = body.tags as string[];
        if (body.image_url) imageUrl = String(body.image_url);
    }

    if (!country_id || !name) {
        return json({ error: 'country_id and name are required' }, 400);
    }

    if (imageFile) {
        if (!imageFile.type.startsWith('image/')) {
            return json({ error: 'Image must be an image file' }, 400);
        }
        if (imageFile.size > 5 * 1024 * 1024) {
            return json({ error: 'Image exceeds 5 MB' }, 400);
        }
        try {
            imageUrl = await uploadZoneImage(imageFile);
        } catch (err) {
            console.error(err);
            return json({ error: 'Could not upload image' }, 502);
        }
    }

    try {
        const zone = await createZone({
            country_id:    Number(country_id),
            name:          String(name),
            slug:          slug ? slugify(String(slug)) : slugify(String(name)),
            image_url:     imageUrl,
            description:   description ? String(description) : null,
            tags,
            display_order: displayOrder ? Number(displayOrder) : 0,
        });

        return json({ zone }, 201);
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
