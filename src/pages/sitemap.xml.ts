import type { APIRoute } from 'astro'
import { searchProperties } from '../services/properties'
import { getZones } from '../services/zones'

const escapeXml = (s: string) =>
    s.replace(/[<>&'"]/g, c =>
        ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c] ?? c))

export const GET: APIRoute = async ({ site }) => {
    const base = site!.href.replace(/\/$/, '')

    const [propertyList, zoneList] = await Promise.all([
        searchProperties({}, 10_000), // all published properties
        getZones(),
    ])

    // Indexable surface only — /login and /admin are noindex and excluded on purpose.
    const paths = [
        '/', '/comprar', '/zonas', '/vender', '/about-us',
        ...zoneList.map(z => `/comprar?zona=${z.slug}`),
        ...new Set(propertyList.map(p => `/comprar/${p.slug}`)),
    ]

    const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${paths.map(p => `  <url><loc>${escapeXml(base + p)}</loc></url>`).join('\n')}
</urlset>
`

    return new Response(body, {
        headers: {
            'Content-Type': 'application/xml; charset=utf-8',
            'Cache-Control': 'public, max-age=3600',
        },
    })
}
