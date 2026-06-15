import { eq } from 'drizzle-orm';
import { db, countries } from '../db';

export async function getCountries() {
    return db
        .select()
        .from(countries)
        .orderBy(countries.name);
}

export async function getCountryById(id: number) {
    const [country] = await db
        .select()
        .from(countries)
        .where(eq(countries.id, id));

    return country ?? null;
}

export async function createCountry(data: {
    name: string;
    slug: string;
}) {
    const [country] = await db.insert(countries).values(data).returning();
    return country;
}

export async function updateCountry(id: number, data: Record<string, unknown>) {
    const [country] = await db
        .update(countries)
        .set(data)
        .where(eq(countries.id, id))
        .returning();

    return country ?? null;
}

export async function deleteCountry(id: number) {
    const [country] = await db
        .delete(countries)
        .where(eq(countries.id, id))
        .returning({ id: countries.id });

    return country ?? null;
}
