import { db, valuationRequests } from '../db';
import { desc, eq } from 'drizzle-orm';

export interface NewValuationRequest {
    address:       string;
    property_type: string | null;
    surface:       number | null;
    name:          string;
    email:         string;
}

export async function createValuationRequest(data: NewValuationRequest) {
    const [row] = await db.insert(valuationRequests).values(data).returning();
    return row;
}

export async function getValuationRequests() {
    return db.select().from(valuationRequests).orderBy(desc(valuationRequests.created_at));
}

export async function updateValuationRequest(id: number, data: Record<string, unknown>) {
    const [row] = await db.update(valuationRequests).set(data).where(eq(valuationRequests.id, id)).returning();
    return row;
}

export async function deleteValuationRequest(id: number) {
    const [row] = await db.delete(valuationRequests).where(eq(valuationRequests.id, id)).returning();
    return row;
}
