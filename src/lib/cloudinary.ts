import { env } from 'cloudflare:workers';

async function sha1(message: string): Promise<string> {
    const buffer = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(message));
    return [...new Uint8Array(buffer)].map(b => b.toString(16).padStart(2, '0')).join('');
}

async function upload(file: File, folder: string, transformation: string): Promise<string> {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const toSign    = `folder=${folder}&timestamp=${timestamp}&transformation=${transformation}`;
    const signature = await sha1(toSign + env.CLOUDINARY_API_SECRET);

    const form = new FormData();
    form.append('file', file);
    form.append('api_key', env.CLOUDINARY_API_KEY);
    form.append('timestamp', timestamp);
    form.append('folder', folder);
    form.append('transformation', transformation);
    form.append('signature', signature);

    const res = await fetch(
        `https://api.cloudinary.com/v1_1/${env.CLOUDINARY_CLOUD_NAME}/image/upload`,
        { method: 'POST', body: form },
    );

    if (!res.ok) {
        throw new Error(`Cloudinary upload failed: ${await res.text()}`);
    }

    const data = await res.json() as { secure_url: string };
    return data.secure_url;
}

export function uploadAvatar(file: File): Promise<string> {
    return upload(file, 'havre/avatars', 'c_fill,g_auto,h_400,w_400,f_webp');
}

export function uploadZoneImage(file: File): Promise<string> {
    return upload(file, 'havre/zones', 'c_fill,g_auto,h_800,w_1200,f_webp');
}

export function uploadPropertyImage(file: File): Promise<string> {
    return upload(file, 'havre/properties', 'c_fill,g_auto,h_1067,w_1600,f_webp');
}

// Extracts the Cloudinary public_id from a secure_url.
// e.g. https://res.cloudinary.com/x/image/upload/v123/havre/zones/abc.webp -> havre/zones/abc
function publicIdFromUrl(url: string): string | null {
    const match = url.match(/\/upload\/(?:v\d+\/)?(.+)\.[^./]+$/);
    return match ? match[1] : null;
}

// Deletes an asset from Cloudinary given its secure_url (signed destroy call).
export async function deleteImage(secureUrl: string): Promise<void> {
    const publicId = publicIdFromUrl(secureUrl);
    if (!publicId) return;

    const timestamp = Math.floor(Date.now() / 1000).toString();
    const toSign    = `public_id=${publicId}&timestamp=${timestamp}`;
    const signature = await sha1(toSign + env.CLOUDINARY_API_SECRET);

    const form = new FormData();
    form.append('public_id', publicId);
    form.append('timestamp', timestamp);
    form.append('api_key', env.CLOUDINARY_API_KEY);
    form.append('signature', signature);

    const res = await fetch(
        `https://api.cloudinary.com/v1_1/${env.CLOUDINARY_CLOUD_NAME}/image/destroy`,
        { method: 'POST', body: form },
    );

    if (!res.ok) {
        throw new Error(`Cloudinary delete failed: ${await res.text()}`);
    }
}