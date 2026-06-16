import { eq, and, asc, desc, notInArray } from 'drizzle-orm';
import { db, properties, propertyImages, zones, users } from '../db';
import { deleteImage } from '../lib/cloudinary';

export interface NewProperty {
    zone_id:        number;
    agent_id:       string;
    title:          string;
    slug:           string;
    reference:      string;
    tag:            'for_sale' | 'new' | 'reserved' | 'sold';
    status:         'draft' | 'published' | 'archived';
    price:          number;
    n_beds:         number;
    n_baths:        number;
    m_built:        number;
    terrain_space?: string | null;
    description?:   string | null;
    features?:      string[] | null;
    latitude?:      string | null;
    longitude?:     string | null;
    distances?:     { value: number; unit: string; label: string }[] | null;
    is_featured?:   boolean;
}

export async function createProperty(data: NewProperty) {
    const [property] = await db.insert(properties).values(data).returning();
    return property;
}

export async function getPropertyById(id: string) {
    const [property] = await db.select().from(properties).where(eq(properties.id, id));
    return property ?? null;
}

// Deletes a property. The DB cascades its images and visit requests;
// the caller is responsible for cleaning up the Cloudinary assets.
export async function deleteProperty(id: string) {
    const [deleted] = await db
        .delete(properties)
        .where(eq(properties.id, id))
        .returning({ id: properties.id });
    return deleted ?? null;
}

export async function getPropertyImages(propertyId: string) {
    return db
        .select()
        .from(propertyImages)
        .where(eq(propertyImages.property_id, propertyId))
        .orderBy(asc(propertyImages.display_order));
}

export async function updateProperty(id: string, data: Record<string, unknown>) {
    const [property] = await db
        .update(properties)
        .set({ ...data, updated_at: new Date() })
        .where(eq(properties.id, id))
        .returning();
    return property ?? null;
}

// Reconcile a property's gallery to match the desired ordered list.
// Each item is an existing image (by id) or a freshly uploaded one (url);
// the first item becomes the cover. Removed existing images are deleted.
export async function syncPropertyImages(
    propertyId: string,
    items: { existingId?: number; url?: string; caption: string | null }[],
) {
    const keptIds = items.map(i => i.existingId).filter((id): id is number => typeof id === 'number');

    // Find the images about to be removed so we can also delete them from Cloudinary.
    const removeWhere = keptIds.length
        ? and(eq(propertyImages.property_id, propertyId), notInArray(propertyImages.id, keptIds))
        : eq(propertyImages.property_id, propertyId);

    const removed = await db
        .select({ url: propertyImages.url })
        .from(propertyImages)
        .where(removeWhere);

    await db.delete(propertyImages).where(removeWhere);

    // Best-effort cleanup of the orphaned Cloudinary assets.
    await Promise.allSettled(removed.map(img => deleteImage(img.url)));

    // Apply order/cover/caption: update kept images, insert new ones.
    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.existingId) {
            await db
                .update(propertyImages)
                .set({ display_order: i, is_cover: i === 0, caption: item.caption })
                .where(and(
                    eq(propertyImages.id, item.existingId),
                    eq(propertyImages.property_id, propertyId),
                ));
        } else if (item.url) {
            await db.insert(propertyImages).values({
                property_id:   propertyId,
                url:           item.url,
                caption:       item.caption,
                display_order: i,
                is_cover:      i === 0,
            });
        }
    }
}

// Insert a property's images in order; the first one is the cover.
export async function addPropertyImages(
    propertyId: string,
    images: { url: string; caption: string | null }[],
) {
    if (images.length === 0) return;
    await db.insert(propertyImages).values(
        images.map((img, i) => ({
            property_id:   propertyId,
            url:           img.url,
            caption:       img.caption,
            display_order: i,
            is_cover:      i === 0,
        })),
    );
}

export async function getProperties() {
    return db
        .select({
            id:         properties.id,
            title:      properties.title,
            slug:       properties.slug,
            reference:  properties.reference,
            status:     properties.status,
            tag:        properties.tag,
            price:      properties.price,
            zone:       zones.name,
            agent:      users.name,
            created_at: properties.created_at,
        })
        .from(properties)
        .innerJoin(zones, eq(properties.zone_id, zones.id))
        .innerJoin(users, eq(properties.agent_id, users.id))
        .orderBy(desc(properties.created_at));
}

export async function getPropertiesByAgent(agentId: string) {
    return db
        .select({
            id:         properties.id,
            title:      properties.title,
            slug:       properties.slug,
            reference:  properties.reference,
            status:     properties.status,
            tag:        properties.tag,
            price:      properties.price,
            zone:       zones.name,
            agent:      users.name,
            created_at: properties.created_at,
        })
        .from(properties)
        .innerJoin(zones, eq(properties.zone_id, zones.id))
        .innerJoin(users, eq(properties.agent_id, users.id))
        .where(eq(properties.agent_id, agentId))
        .orderBy(desc(properties.created_at));
}
