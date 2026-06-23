import { db, valuationRequests } from '../db';
import { desc } from 'drizzle-orm';

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
