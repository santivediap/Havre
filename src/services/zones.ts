import { eq, min, count, and } from 'drizzle-orm';
import { db, zones, countries, properties } from '../db';

export async function getZones() {
    return db
        .select({
            id:          zones.id,
            name:        zones.name,
            slug:        zones.slug,
            image_url:   zones.image_url,
            description: zones.description,
            tags:        zones.tags,
            country:     countries.name,
            count:       count(properties.id),
            price_from:  min(properties.price),
        })
        .from(zones)
        .innerJoin(countries, eq(zones.country_id, countries.id))
        .leftJoin(properties, and(
            eq(properties.zone_id, zones.id),
            eq(properties.status, 'published'),
        ))
        .where(eq(zones.is_active, true))
        .groupBy(zones.id, countries.name)
        .orderBy(zones.display_order, zones.name);
}

export async function getZoneById(id: number) {
    const [zone] = await db
        .select({
            id:            zones.id,
            name:          zones.name,
            slug:          zones.slug,
            image_url:     zones.image_url,
            description:   zones.description,
            tags:          zones.tags,
            display_order: zones.display_order,
            is_active:     zones.is_active,
            country:       countries.name,
        })
        .from(zones)
        .innerJoin(countries, eq(zones.country_id, countries.id))
        .where(eq(zones.id, id));

    return zone ?? null;
}

export async function createZone(data: {
    country_id:    number;
    name:          string;
    slug:          string;
    image_url?:    string | null;
    description?:  string | null;
    tags?:         string[] | null;
    display_order?: number;
}) {
    const [zone] = await db.insert(zones).values(data).returning();
    return zone;
}

export async function updateZone(id: number, data: Record<string, unknown>) {
    const [zone] = await db
        .update(zones)
        .set(data)
        .where(eq(zones.id, id))
        .returning();

    return zone ?? null;
}

export async function deleteZone(id: number) {
    const [zone] = await db
        .delete(zones)
        .where(eq(zones.id, id))
        .returning({ id: zones.id });

    return zone ?? null;
}
