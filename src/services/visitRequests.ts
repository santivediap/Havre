import { eq, desc } from 'drizzle-orm';
import { db, visitRequests, properties } from '../db';

export interface NewVisitRequest {
    property_id:     string;
    name:            string;
    contact:         string;
    preferred_date?: string | null;
}

export async function createVisitRequest(data: NewVisitRequest) {
    const [request] = await db.insert(visitRequests).values(data).returning();
    return request;
}

// All visit requests (optionally for a single property), newest first, with
// the property title/slug for display in the admin panel.
export async function getVisitRequests(propertyId?: string) {
    return db
        .select({
            id:             visitRequests.id,
            property_id:    visitRequests.property_id,
            name:           visitRequests.name,
            contact:        visitRequests.contact,
            preferred_date: visitRequests.preferred_date,
            status:         visitRequests.status,
            created_at:     visitRequests.created_at,
            property_title: properties.title,
            property_slug:  properties.slug,
        })
        .from(visitRequests)
        .innerJoin(properties, eq(visitRequests.property_id, properties.id))
        .where(propertyId ? eq(visitRequests.property_id, propertyId) : undefined)
        .orderBy(desc(visitRequests.created_at));
}

export async function getVisitRequestById(id: number) {
    const [request] = await db
        .select()
        .from(visitRequests)
        .where(eq(visitRequests.id, id));
    return request ?? null;
}

export async function updateVisitRequest(id: number, data: Record<string, unknown>) {
    const [request] = await db
        .update(visitRequests)
        .set(data)
        .where(eq(visitRequests.id, id))
        .returning();
    return request ?? null;
}

export async function deleteVisitRequest(id: number) {
    const [deleted] = await db
        .delete(visitRequests)
        .where(eq(visitRequests.id, id))
        .returning({ id: visitRequests.id });
    return deleted ?? null;
}
