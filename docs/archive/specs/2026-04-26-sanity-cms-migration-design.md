# Sanity CMS Migration — Phase 1: Categories, Sub-Categories, Services

**Date:** 2026-04-26
**Status:** ✅ Shipped — fully implemented and live in production
**Phase 2 (Blog):** Separate spec, to be written after Phase 1 ships

---

## Goal

Move the canonical source of categories, sub-categories, and services from a hand-written Supabase `seed.sql` into Sanity CMS, so the non-technical client can edit all service content (descriptions, deliverables, timelines, taglines, etc.) through a friendly Studio UI without involving the developer or touching SQL.

This phase lays the Sanity foundation that Phase 2 (blog) will build on.

## Non-Goals

- Building the blog feature (Phase 2)
- Removing Supabase from the project (tables stay inert as a rollback safety net)
- Translating existing English content into Bahasa Indonesia (client does this in Studio later)
- Replacing `src/lib/category-colors.ts` (out of scope; phased out later)
- Real-time content updates (60-second ISR is acceptable; webhooks deferred)

## Context

The site currently has 7 service categories, ~48 sub-categories, and ~150+ services, all defined in `supabase/seed.sql`. The client is mid-way through delivering a full content refresh:

- **Complete:** Visa & Immigration, Accounting & Tax, Legal & Contract Advisory
- **Partial / pending:** Company Setup, Insurance, Property Advisory, HR & Payroll

The client's data arrives as a flat JSON array with quirks: non-kebab slugs (`"Company Set Up"`), an empty-key column acting as a sub-category grouper, missing `sub_category_name`. The current seed is therefore not a useful baseline for the 3 complete categories — it remains useful only for the 4 partial ones (icon names, colors, sub-category slugs).

## Architecture

**Sanity Studio embedded in the Next.js app** at `/studio`. Single repo, single deployment, single login, branded admin URL. Sanity hosts the content database (free tier; ~250 docs is far below limits). Next.js fetches via Sanity's CDN-cached GROQ API with 60-second ISR.

**Auth:** Sanity manages Studio login (Google or email magic link). Client is added as `Editor` in Sanity project dashboard. No auth code in the Next.js app.

**Data flow:**

```
Client → /studio (Sanity Studio) → Sanity Content Lake
                                         ↓ (GROQ + ISR 60s)
                                   Next.js pages
```

Supabase tables (`categories`, `sub_categories`, `services`) stay in the database but become inert after cutover. Kept ~2 weeks as a rollback option, then can be dropped in a follow-up.

## Content Model

All localized fields use Sanity's `internationalization` plugin with locales `en` and `id`. English-only on initial import; ID values empty until the client/translator fills them. Public site falls back to EN if ID is missing.

### `category`
- `slug` — unique, kebab-case, auto-generated from EN name, editable
- `name` (localized)
- `tagline` (localized, optional)
- `iconName` — string matching a Lucide icon (e.g. `"Plane"`, `"Scale"`)
- `coverImage` — category page banner
- `accentColor` — color picker (dark accent hex)
- `tintColor`, `midColor` — optional, override the auto-derived values from accent
- `sortOrder` — number, controls navbar order
- `isActive` — boolean

### `subCategory`
- `slug` — kebab-case, unique within parent category
- `name` (localized)
- `category` — reference to parent `category` (required)
- `sortOrder`
- `isActive`

### `service`
- `slug` — unique, kebab-case
- `name` (localized)
- `category` — reference (required)
- `subCategory` — reference (optional, must belong to chosen category; validated in Studio)
- `description` (localized, rich text)
- `targetClient` (localized)
- `keyDeliverables` (localized, supports bullet list)
- `estimatedTimeline` (localized)
- `realTimeWork` (localized)
- `whatsappMessage` (localized)
- `seo` — object with `metaTitle`, `metaDescription` (localized, both optional)
- `sortOrder`
- `isActive`

### Studio Organization

Sidebar groups: **Categories → Sub-Categories → Services** (Phase 2 adds Posts and Authors). Categories show a tree-style preview: each category lists its sub-categories nested, each sub-category lists its services. Client navigates the hierarchy naturally rather than flat lists.

## Migration & Data Flow

A one-time Node script `scripts/import-to-sanity.ts`:

1. **Reads from two sources:**
   - **Client's flat-array JSON** — primary source for the 3 complete categories. Path/format documented in script header
   - **Current `seed.sql`** — fallback only for rows the client hasn't replaced (icon names, color accents, sub-category slugs for the 4 partial categories)
2. **Normalizes:**
   - Slugs → kebab-case (`"Company Set Up"` → `"company-set-up"`)
   - Empty-key column → resolves to sub-category grouper, carries forward when blank
   - Whitespace and casing
3. **Writes to Sanity** via the Sanity client SDK in dependency order: categories → sub-categories → services
4. **Idempotent:** re-running with the same data updates existing docs rather than duplicating, using `slug` as the stable lookup key

### Cutover

1. Set up Sanity project, define schemas, embed Studio at `/studio`
2. Run importer (3 complete categories from client data + 4 partial categories from seed.sql)
3. On a feature branch: rewrite `src/lib/db/categories.ts` and `services.ts` to query Sanity. Same function signatures, same return shapes — drop-in replacement
4. Side-by-side local diff: render a few category pages and service pages from both Supabase-backed and Sanity-backed builds; confirm visual + functional parity
5. Merge & deploy
6. Supabase tables stay inert; revisited in ~2 weeks for cleanup

## Code Changes

### Modified
- `src/lib/db/categories.ts` — Supabase queries replaced by GROQ queries. Function signatures unchanged: `getCategories`, `getCategoryBySlug`, `getCategoriesWithNav`, `getAllCategorySlugs`
- `src/lib/db/services.ts` — same drop-in approach
- `src/lib/db/types.ts` — field rename to camelCase (`icon_name` → `iconName`, `color_accent` → `accentColor`, etc.) to match Sanity output
- `package.json` — add Sanity dependencies

### Added
- `sanity.config.ts` — Studio config at project root
- `src/app/studio/[[...tool]]/page.tsx` — mounts Studio at `/studio`
- `src/sanity/schemas/category.ts`
- `src/sanity/schemas/subCategory.ts`
- `src/sanity/schemas/service.ts`
- `src/sanity/schemas/index.ts` — barrel
- `src/sanity/lib/client.ts` — read client (CDN-cached, public)
- `src/sanity/lib/queries.ts` — GROQ query strings as named exports
- `scripts/import-to-sanity.ts` — one-time importer
- `.env.local` additions: `NEXT_PUBLIC_SANITY_PROJECT_ID`, `NEXT_PUBLIC_SANITY_DATASET`, `SANITY_API_READ_TOKEN`, `SANITY_API_WRITE_TOKEN`

### Unchanged
- All page components (`src/app/(marketing)/[category]/page.tsx`, `Navbar.tsx`, `ServicesDropdown.tsx`, `sitemap.ts`, home page) — they call the same data-layer functions and receive the same shapes
- `src/lib/category-colors.ts` — stays as a lookup fallback for this phase

## Caching & Freshness

- Sanity CDN caches reads at edge
- Next.js `fetch` calls use `next: { revalidate: 60 }` — Studio Publish appears on live site within ~60 seconds
- Webhook-based instant invalidation deferred to a later phase

## Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Importer mishandles client's quirky format (empty-key grouper, inconsistent casing) | Idempotent script + dry-run mode that prints intended writes; manual spot-check before commit |
| Sanity GROQ queries return shapes that diverge from current TS types | Keep function signatures stable; map at query-layer boundary; type tests on a sample of fixtures |
| Visual regression on category/service pages after cutover | Side-by-side local diff before merge; staged deploy |
| Client accidentally breaks data via Studio | Sanity has built-in document history & revert; Editor (not Admin) role limits damage |
| Supabase tables drift from Sanity if anyone edits them | Document that Supabase is read-only post-cutover; remove RLS write policies |

## Success Criteria

1. `/studio` is reachable, client can log in, see the three doc types, and edit a service description with changes appearing on the live site within 60 seconds
2. All existing public pages (home, category pages, navbar dropdown, sitemap) render identically pre- and post-cutover for the categories with unchanged data
3. The 3 fully-updated categories (Visa, Accounting & Tax, Legal & Contract Advisory) reflect the client's latest content
4. Importer is re-runnable: a second run with the same input produces zero changes in Sanity

## Future Work (Phase 2 and beyond)

- **Phase 2: Blog feature** — `post` and `author` schemas in Sanity, `/blog` listing + `/blog/[slug]` detail pages, integration with category pages ("Latest articles about X"), localization, JSON-LD, sitemap extension. Separate spec
- Bahasa Indonesia translations of existing service content
- Webhook-based instant cache invalidation (replacing 60s ISR)
- Phase out `src/lib/category-colors.ts` once accent colors live in Sanity reliably
- Drop unused Supabase tables after stable period
