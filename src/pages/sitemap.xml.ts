import type { APIRoute } from 'astro'
import { getPublishedForSitemap } from '../services/properties'
import { getZones } from '../services/zones'

const escapeXml = (s: string) =>
    s.replace(/[<>&'"]/g, c =>
        ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c] ?? c))

const isoDay = (d: Date | string) => new Date(d).toISOString().slice(0, 10)

export const GET: APIRoute = async ({ site }) => {
    const base = site!.href.replace(/\/$/, '')

    const [propertyList, zoneList] = await Promise.all([
        getPublishedForSitemap(),
        getZones(),
    ])

    type Entry = { loc: string; lastmod?: string }

    // Static + zone pages have no reliable per-URL modified date → no <lastmod>.
    // Property pages use their updated_at so Google knows when a listing changed.
    const entries: Entry[] = [
        ...['/', '/comprar', '/zonas', '/vender', '/about-us'].map(loc => ({ loc })),
        ...zoneList.map(z => ({ loc: `/comprar?zona=${z.slug}` })),
        ...propertyList.map(p => ({ loc: `/comprar/${p.slug}`, lastmod: isoDay(p.updated_at) })),
    ]

    const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries
    .map(e => {
        const lastmod = e.lastmod ? `<lastmod>${e.lastmod}</lastmod>` : ''
        return `  <url><loc>${escapeXml(base + e.loc)}</loc>${lastmod}</url>`
    })
    .join('\n')}
</urlset>
`

    return new Response(body, {
        headers: {
            'Content-Type': 'application/xml; charset=utf-8',
            'Cache-Control': 'public, max-age=3600',
        },
    })
}
