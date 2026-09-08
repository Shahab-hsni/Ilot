# Ilot — Full Project Specification

> **Version:** 1.0 · **Date:** 2026-03-18 · **Status:** ✅ Shipped (original Supabase spec — Sanity is now the source of truth)

---

## 1. Project Overview

**Ilot** is a premium digital ecosystem providing elite legal, visa, and corporate structuring solutions for global investors, expatriates, and foreign entities operating in Indonesia. It replaces fragmented agencies with a single, managed, elite experience.

### Brand
- **Name:** Ilot
- **Wordmark:** "Ilot" in Poppins Bold (no icon, pure wordmark)
- **Tagline:** "Clear Legal Support. Confident Decisions."
- **Market:** Indonesia (English-first, Bahasa Indonesia later)

---

## 2. Tech Stack

| Layer | Choice | Reason |
|---|---|---|
| Framework | Next.js 15 (App Router) | SSG + ISR, dynamic routing, generateMetadata |
| Styling | Tailwind CSS v4 | Utility-first, design tokens |
| Animation | Framer Motion | Scroll-linked animations, spring physics |
| Database | Supabase (Postgres) | Auth, Studio UI for client, real-time capable |
| Data layer | Repository pattern (`src/lib/db/`) | Decouples Supabase from components |
| Deployment | Vercel | Native Next.js support, ISR, env vars |
| Language | TypeScript (strict) | End-to-end type safety |
| Icons | Lucide React | Consistent, tree-shakeable |

---

## 3. Design System

### Color Palette
| Token | Value | Usage |
|---|---|---|
| `background` | `#FFFFFF` | Page background |
| `surface` | `#F4F4F0` | Card / section backgrounds |
| `foreground` | `#0B0B1A` | Primary text |
| `accent` | `#F5B21A` | CTAs, hover states, highlights |
| `muted` | `#64748b` | Secondary text |
| `dark` | `#0a0a14` | Dark sections, footer |

### Typography
- **Font:** Inter (Google Fonts) — fallback: system-ui
- **Headings:** `font-bold tracking-tight` — sizes `text-5xl` to `text-7xl`
- **Body:** `text-base` / `text-sm`, `leading-relaxed`

### Component Tokens
- **Border radius (cards):** `rounded-[2rem]`
- **Shadow:** `shadow-2xl`
- **Max content width:** `max-w-[1800px] mx-auto`
- **Section padding:** `py-24 px-6 md:px-12`

---

## 4. Project Structure

```
ilot-legal/
├── src/
│   ├── app/
│   │   ├── (marketing)/
│   │   │   ├── page.tsx                  # Homepage /
│   │   │   ├── [category]/
│   │   │   │   ├── page.tsx              # /visa, /legal, etc.
│   │   │   │   └── [slug]/
│   │   │   │       └── page.tsx          # /visa/investor-kitas-2-years
│   │   │   ├── contact/page.tsx
│   │   │   ├── legal/page.tsx
│   │   │   ├── privacy/page.tsx
│   │   │   └── cookies/page.tsx
│   │   ├── api/
│   │   │   └── services/route.ts         # REST API (future admin)
│   │   ├── layout.tsx                    # Root layout + fonts + metadata
│   │   └── globals.css
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts                 # Browser client
│   │   │   └── server.ts                 # Server component client
│   │   └── db/
│   │       ├── categories.ts             # getCategories(), getCategoryBySlug()
│   │       ├── services.ts               # getServiceBySlug(), getServicesByCategory()
│   │       └── types.ts                  # Shared TypeScript types
│   └── components/
│       ├── layout/
│       │   ├── Navbar.tsx
│       │   └── Footer.tsx
│       ├── home/
│       │   ├── HeroCircle.tsx            # Scroll-linked fan-out animation
│       │   ├── PartnerBar.tsx            # CSS marquee
│       │   ├── AboutSection.tsx
│       │   ├── WhyUsBento.tsx            # Bento grid
│       │   ├── ProcessSteps.tsx
│       │   └── TestimonialsSection.tsx
│       ├── services/
│       │   ├── ServiceCard.tsx           # Used on pillar page
│       │   ├── ServiceDetail.tsx         # Used on service detail page
│       │   └── RelatedServices.tsx
│       └── ui/
│           ├── WhatsAppCTA.tsx           # wa.me link builder
│           ├── WhatsAppFloat.tsx         # Fixed bottom-right button
│           └── AnimatedSection.tsx       # Fade-in on scroll wrapper
├── public/
│   └── images/categories/               # One hero image per category
├── docs/
│   ├── superpowers/specs/ilot-spec.md
│   └── seed-data/services.json          # Raw seed data
├── supabase/
│   ├── migrations/
│   │   └── 001_initial_schema.sql
│   └── seed.sql
├── next.config.ts
├── tailwind.config.ts
└── package.json
```

---

## 5. Database Schema

### Table: `categories`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | gen_random_uuid() |
| slug | text UNIQUE | e.g. `visa`, `legal`, `company-setup` |
| name | text | e.g. "Visa & Immigration" |
| tagline | text | Short description for pillar page hero |
| icon_name | text | Lucide icon name |
| image_url | text | Background photo for hero card |
| color_accent | text | Optional hex tint for pillar page header |
| sort_order | int2 | 0–6, controls circle position |
| is_active | boolean | Default true |
| created_at | timestamptz | now() |

**Seed rows (7):**
1. `visa` — Visa & Immigration
2. `legal` — Legal & Contracts
3. `company-setup` — Company Setup
4. `insurance` — Insurance
5. `property` — Property Advisory
6. `hr-payroll` — HR & Payroll
7. `accounting-tax` — Accounting & Tax

### Table: `sub_categories`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | gen_random_uuid() |
| category_id | uuid FK | → categories.id ON DELETE CASCADE |
| slug | text | Unique within category |
| name | text | Display name |
| sort_order | int2 | Within category |
| is_active | boolean | Default true |

### Table: `services`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | gen_random_uuid() |
| category_id | uuid FK | → categories.id (denormalized) |
| sub_category_id | uuid FK | → sub_categories.id ON DELETE SET NULL |
| slug | text UNIQUE | Global unique — URL segment |
| name | text | Display name |
| description | text | Full description |
| target_client | text | e.g. "Foreign Investors" |
| key_deliverables | text | e.g. "2-Year KITAS, MERP" |
| estimated_timeline | text | e.g. "6–10 Weeks" |
| real_time_work | text | Optional internal SLA |
| whatsapp_message | text | Pre-filled WA message (falls back to default) |
| meta_title | text | SEO override |
| meta_description | text | SEO override |
| sort_order | int2 | Within sub_category |
| is_active | boolean | Default true |
| created_at | timestamptz | now() |
| updated_at | timestamptz | Auto-managed by trigger |

**Row Level Security:** Public `SELECT` on `is_active = true`. All mutations require service_role key (Supabase Studio only for now).

---

## 6. Routing & Rendering

| Route | Render | Revalidate | Page Type |
|---|---|---|---|
| `/` | SSG | Static | Homepage |
| `/[category]` | ISR | 1 hour | Category pillar page |
| `/[category]/[slug]` | ISR | 1 hour | Service detail page |
| `/contact` | SSG | Static | Lead form + WA link |
| `/legal`, `/privacy`, `/cookies` | SSG | Static | Legal pages |

### Key Next.js Patterns
- `generateStaticParams()` on `[category]` and `[slug]` pages — pre-renders all active slugs at build
- `generateMetadata()` pulls `meta_title` / `meta_description` from Supabase; falls back to `"[service.name] — Ilot"`
- `/sitemap.xml` auto-generated from all active services
- Schema.org `Service` JSON-LD injected on each service detail page

---

## 7. Homepage Sections (in order)

### 7.1 Hero — Scroll-Linked Circle Animation
**Scroll container:** `position: sticky`, `height: 100vh`, inside a `300vh` wrapper.

**Scene 1 (scroll 0%):** Large headline + subtitle + 2 CTA buttons centered. 7 square service cards sitting in a horizontal strip at the bottom edge of the viewport.

**Scene 2 (scroll 30–90%):** Headline + buttons fade out (opacity 0, translateY -40px). Cards lift and travel along curved paths toward the center, rotating as they fly.

**Scene 3 (scroll 90–100%):** Cards settle into a perfect evenly-spaced circle. Each card rotated to face outward from center (like clock numbers). Secondary headline fades in at center of circle.

**Implementation:** Framer Motion `useScroll` + `useTransform`. Each card's `x`, `y`, `rotate` values are derived from scroll progress via `useTransform`. Spring animations for smooth settling.

**Card design:**
- Perfect square, `rounded-[2rem]`, `shadow-2xl`
- High-quality category photo as background
- Dark gradient overlay: darkest at bottom → transparent at top
- Bold white category name, bottom-left
- Lucide icon top-left, in a semi-transparent gold circle
- Hover: `scale(1.05)` + gold border glow (disabled during scroll animation)
- Click: navigates to `/[category]`

### 7.2 Partner Trust Bar
CSS marquee (infinite scroll, `animation: marquee 30s linear infinite`). Logos: Deloitte, KPMG, PwC, + others. Counter: "110+ happy clients".

### 7.3 About
Two-column: left = large bold statement, right = copy paragraph + stat row (years in operation, clients served, countries covered).

### 7.4 Why Us — Bento Grid
Asymmetric CSS Grid (5–6 cells). Each cell: icon + bold title + 1-line description. Values:
1. Frictionless Access (wide cell)
2. Regulatory Authority
3. Absolute Transparency
4. Speed & Precision
5. Full Confidentiality

### 7.5 Process — 4 Steps
Horizontal timeline (vertical on mobile). Steps animate in sequentially on scroll:
1. Selection
2. One-Touch Initiation
3. Expert Handling
4. Fulfillment

### 7.6 Testimonials
Horizontal card carousel (or 2-col masonry on desktop). Each card: star rating, quote, name, nationality.

### 7.7 CTA Banner
Full-width gold (`#F5B21A`) background. Bold dark headline + "Get a Free Quote" (WhatsApp) + "Contact Us" buttons.

### 7.8 Footer
Dark background. Columns: Ilot wordmark + tagline / Service links (all 7 categories) / Legal links / WhatsApp number. Bottom bar: copyright + T&C / Privacy / Cookies.

---

## 8. Category Pillar Page `/[category]`

- **Hero:** Category name, tagline, breadcrumb (`Home > Visa`)
- **Layout:** Two-column — sticky sidebar (sub-category nav links, highlights active on scroll) + main content area
- **Content:** Sub-categories listed in `sort_order`. Under each: heading + grid of `ServiceCard` components
- **ServiceCard:** Name, target client badge, estimated timeline, "Enquire" button → WhatsApp CTA
- **Mobile:** Sidebar becomes a horizontal scroll tab bar at top. Sticky "Contact on WhatsApp" bar at bottom.

---

## 9. Service Detail Page `/[category]/[slug]`

- **Breadcrumb:** `Home > [Category] > [Sub-Category] > [Service Name]`
- **Above fold:** Service name (h1) + large primary WhatsApp CTA button
- **Info grid:** Who it's for / Timeline / Key Deliverables (3-column on desktop)
- **Description:** Full text from `services.description`
- **Related Services:** Other services in the same `sub_category_id` (max 4)
- **SEO:** `generateMetadata` + Schema.org `Service` JSON-LD

---

## 10. WhatsApp Integration

### Frontend (this build)
- `WhatsAppCTA` component builds `https://wa.me/{NEXT_PUBLIC_WA_NUMBER}?text={encoded}`
- Default message: `"Hi Ilot, I'm interested in: *{service.name}*. Could you help me get started?"`
- Custom override per service via `services.whatsapp_message` field
- Floating `WhatsAppFloat` button fixed bottom-right on all pages (generic enquiry message)

### AI Backend (separate project, future)
- WhatsApp Business API (Meta) receives incoming messages
- Webhook fires to n8n workflow or Vercel serverless function
- Claude API processes message with service context
- Responds, qualifies lead, escalates to human agent
- The `whatsapp_message` field is the bridge — it gives the AI agent context on which service was enquired about

---

## 11. Environment Variables

```env
NEXT_PUBLIC_WA_NUMBER=62812XXXXXXX
NEXT_PUBLIC_SITE_URL=https://ilot.id
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

---

## 12. i18n Strategy

- **Phase 1 (this build):** English only. All content in main tables.
- **Phase 2 (future):** Add `service_translations` table (`service_id`, `locale`, `name`, `description`, `target_client`, `key_deliverables`). No schema migration needed on main tables. Use `next-intl` for routing (`/id/visa/...`).

---

## 13. SEO Checklist

- [ ] `generateStaticParams` for all active category + service slugs
- [ ] `generateMetadata` per page (title, description, OG tags)
- [ ] `/sitemap.xml` — auto-generated from Supabase query
- [ ] `/robots.txt` — allow all
- [ ] Schema.org `Service` JSON-LD on service detail pages
- [ ] Canonical URLs via `NEXT_PUBLIC_SITE_URL`
- [ ] Alt text on all images
- [ ] Semantic HTML (h1 → h2 → h3 hierarchy respected)

---

## 14. Seed Data

Full raw seed data in `docs/seed-data/services.json` (provided by client). Covers:
- **Visa category:** 80+ services across 20+ sub-categories (Investor KITAS, Working KITAS, Golden Visa, Digital Nomad, Retirement, Visit Visas, MREP, KITAP, etc.)
- **Legal category:** 25+ services (Company Set-Up PT/PMA/CV, Compliance, Agreements, Employment, Notary, Property Checks, etc.)
- Remaining 5 categories: to be provided by client

Seed script: `supabase/seed.sql` — generated from JSON, inserts in dependency order (categories → sub_categories → services).

---

## 15. Out of Scope (this build)

- Custom admin panel (use Supabase Studio)
- WhatsApp AI backend
- Bahasa Indonesia translations
- User authentication / client portal
- Payment processing
- Blog / content section
