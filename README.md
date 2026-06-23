# Havre

A full-stack rural real-estate web app — browse country houses, farms and rural retreats, request visits, and get a free property valuation. Built as a portfolio project to showcase a modern, production-grade stack end to end.

🔗 **Live:** [havre.santiagovedia.com](https://havre.santiagovedia.com)

> ⚠️ **Fictitious content.** Havre is not a real company. Every property, team member, price and legal text is invented; any resemblance to real people or properties is coincidental. Built by [Santiago Vedia García](https://www.linkedin.com/in/santivediag/).

---

## Preview

The public site is live at the link above. The screencast below shows the **gated admin dashboard** — where the team manages properties, zones and users, and triages visit & valuation requests:

<p align="center">
  <video src="https://github.com/user-attachments/assets/f8f86c54-c892-4a61-83a2-c18626803532" controls loop width="100%"></video>
</p>

---

## Tech stack

| Layer | Technology |
|---|---|
| **Framework (full-stack)** | [Astro 6](https://astro.build) (SSR, `output: 'server'`) + TypeScript |
| **Runtime / Hosting** | [Cloudflare Workers](https://workers.cloudflare.com) via `@astrojs/cloudflare` |
| **Database** | [PostgreSQL](https://www.postgresql.org) on [Neon](https://neon.tech) (serverless) |
| **ORM** | [Drizzle ORM](https://orm.drizzle.team) + `drizzle-kit` |
| **Image CDN** | [Cloudinary](https://cloudinary.com) (on-the-fly transforms) |
| **Auth** | JWT (`jose`) in an HttpOnly cookie + `bcryptjs` password hashing |
| **Rate limiting / sessions store** | Cloudflare KV |
| **Maps** | [Leaflet](https://leafletjs.com) |
| **CI/CD** | GitHub Actions → Wrangler deploy |

---

## Architecture

Astro is used as a **single full-stack framework** — there is no separate backend service:

- **Frontend** — server-rendered `.astro` pages and components, with sprinkles of vanilla TypeScript for interactivity (forms, the admin panel, the lightbox, maps). Critical CSS is inlined; no client framework ships to the browser.
- **Backend** — REST-style endpoints live under `src/pages/api/**` (Astro [endpoints](https://docs.astro.build/en/guides/endpoints/)), data access is isolated in a `src/services/**` layer, and a single `src/middleware.ts` gates the whole API.

Everything compiles to a **single Cloudflare Worker**. Requests hit the Worker at the edge; SSR pages and API routes run there, talking to Neon over HTTP and to Cloudflare KV for ephemeral state.

```
Browser ──▶ Cloudflare Worker (Astro SSR + API)
                 ├──▶ Neon Postgres   (Drizzle ORM)
                 ├──▶ Cloudflare KV    (login rate-limit)
                 └──▶ Cloudinary       (images, via URL transforms)
```

---

## Project structure

```
src/
├── pages/
│   ├── index.astro                # Home
│   ├── comprar.astro              # Listings (server-side filtered)
│   ├── comprar/[slug].astro       # Property detail (gallery, map, visit form)
│   ├── zonas.astro                # Regions
│   ├── vender.astro               # Sell + free-valuation form
│   ├── about-us.astro
│   ├── login.astro · admin.astro  # Internal panel (noindex)
│   ├── contacto · aviso-legal · privacidad · cookies   # Legal
│   ├── 404.astro
│   ├── sitemap.xml.ts             # Dynamic sitemap endpoint
│   └── api/**                     # REST endpoints (auth, CRUD, forms)
├── components/                    # UI + reusable <SEO>, <Disclaimer>
├── layouts/                       # LegalLayout
├── services/                      # DB access layer (Drizzle queries)
├── lib/                           # auth, api helpers, cloudinary, rateLimit
├── db/                            # schema.ts + drizzle client
├── middleware.ts                  # API auth gate
└── styles/global.css              # Design tokens
```

---

## Key technical features

### Authentication & sessions
- Passwords hashed with **`bcryptjs`** (cost 12).
- On login, a **JWT signed with `jose`** is issued and stored in a cookie that is **`HttpOnly` + `Secure` + `SameSite=Lax`** — unreadable from JS (XSS-safe) and protected against CSRF.
- Role-based access (`admin` / `agent`); a `getSession()` helper verifies the token on every protected request.

### API security
- **`src/middleware.ts`** runs before every request and **locks down all of `/api/*` by default**. Only an explicit allowlist is public (`POST /api/login`, `/api/logout`, `/api/visit-requests`, `/api/valuations`). User management is **admin-only** (403 otherwise). New endpoints are protected automatically — you have to opt *out*.
- **Login rate limiting** — Cloudflare KV counts failed attempts per IP (8 / 15 min sliding window) and returns `429` when exceeded. Designed **fail-open**: any KV error never blocks a legitimate login.
- Astro's built-in **CSRF origin check** rejects cross-origin state-changing requests.
- Every endpoint validates and sanitizes input before touching the DB.

### SEO & discoverability
- Reusable **`<SEO>`** component: unique title/description, canonical URL, **Open Graph** and **Twitter Card** tags per page.
- **JSON-LD Schema markup**, validated in Google's Rich Results Test:
  - `RealEstateAgent` + `WebSite` (home), `ItemList` carousels (listings, regions),
  - `BreadcrumbList` + `Product`/`SingleFamilyResidence` (property pages).
- **`robots.txt`** + a **dynamic `sitemap.xml`** endpoint that enumerates published properties and zone landing pages straight from the DB, with `<lastmod>` and edge caching.
- Semantic heading hierarchy, correct `lang`, descriptive `alt` text, internal links.

### Performance
- **Inlined critical CSS** (`inlineStylesheets: 'always'`) — no render-blocking stylesheet round-trip.
- **Responsive Cloudinary delivery** — raw URLs in the DB, per-context transforms in code (`f_auto,q_auto,w_…`), so each surface gets the right size and modern formats (WebP/AVIF).
- **LCP tuning** — high-priority preloads for the hero/cover image, `preconnect` to the image CDN, async (non-blocking) web-font loading.
- Lighthouse: **87–100** across pages on throttled mobile.

### Images
- Stored on **Cloudinary** as raw URLs; transformations are applied at render time via a small URL helper (resize, format, quality) and Astro's `<Image>` where appropriate.

### Maps
- **Leaflet** renders an approximate property location on detail pages and a results map on the listings page (markers built from server-filtered data).

### Admin panel
- Authenticated dashboard to manage **users, zones, properties** (full CRUD with Cloudinary uploads) and to triage **visit & valuation requests** (status workflow + delete).

### Progressive enhancement
- Public forms (visit request, free valuation) submit via `fetch` with inline validation and accessible (`aria-live`) feedback, and degrade to a real form `POST` without JS.

---

## Data model

PostgreSQL schema managed with Drizzle (`src/db/schema.ts`):

| Table | Purpose |
|---|---|
| `users` | Team accounts (admin / agent), hashed passwords |
| `countries` · `zones` | Geographic taxonomy for properties |
| `properties` | Listings (price, specs, status, geo, features, agent) |
| `property_images` | Gallery images per property (cover flag, order) |
| `visit_requests` | Public "request a visit" submissions |
| `valuation_requests` | Public "free valuation" submissions |

---

## Local development

**Requirements:** Node ≥ 22.12, a Neon Postgres database, and a Cloudinary account.

```bash
# 1. Install
npm install

# 2. Secrets — create .dev.vars in the project root:
#    DATABASE_URL=postgres://...
#    JWT_SECRET=...
#    CLOUDINARY_CLOUD_NAME=...
#    CLOUDINARY_API_KEY=...
#    CLOUDINARY_API_SECRET=...

# 3. Push the schema to your database
npm run db:push

# 4. Develop
npm run dev          # local dev server

# Build & preview the production Worker locally
npm run build
npm run preview
```

Useful scripts: `db:push` (sync schema), `db:studio` (Drizzle Studio), `generate-types` (Wrangler types).

---

## Deployment & CI/CD

Automated with **GitHub Actions** (`.github/workflows/deploy.yml`):

- Push to **`main`** → deploys to **production** (`havre-production`).
- Push to **`develop`** → deploys to **preview** (`havre-preview`).

Each run installs deps, builds the Worker, **injects the environment-specific KV namespace id** into the generated `wrangler.json`, and ships it with `wrangler deploy`.

**Secrets** are split by concern:
- **GitHub Actions secrets** (deploy): `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN`, `KV_PRODUCTION_ID`, `KV_PREVIEW_ID`.
- **Worker runtime secrets** (set once with `wrangler secret put … --env production`): `DATABASE_URL`, `JWT_SECRET`, `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`.

---

## Author

Designed and built by **Santiago Vedia García** — [LinkedIn](https://www.linkedin.com/in/santivediag/).
