import { eq, desc } from 'drizzle-orm';
import { db, properties, zones, users } from '../db';

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
