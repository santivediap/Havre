import { eq, desc } from 'drizzle-orm';
import { db, properties, propertyImages, zones, users } from '../db';

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
