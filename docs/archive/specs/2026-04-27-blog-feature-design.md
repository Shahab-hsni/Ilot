# Blog Feature — Phase 2 Design Spec

**Date:** 2026-04-27
**Status:** ✅ Shipped — fully implemented and live in production
**Depends on:** Phase 1 (Sanity CMS migration) — complete

---

## Goal

Add a bilingual blog to the Ilot site so the client can publish articles through Sanity Studio, articles are tightly linked to the 7 service categories, and the blog drives SEO → service conversion.

## Decisions Made (from brainstorming)

| Decision | Choice |
|----------|--------|
| Category linking | **Tight** — every post belongs to one of the 7 service categories |
| Localization | **English + Bahasa Indonesia** — both in every post, site falls back to EN if ID empty |
| Author model | **Optional named author** — defaults to "Ilot" firm byline; posts can be assigned to a specific author profile |
| CMS | **Sanity** (already live from Phase 1) |
| Studio location | `/studio` (already mounted) |

## Non-Goals

- Comments
- Newsletter signup
- Search
- Per-language separate URLs (hreflang is enough for v1)
- Pagination beyond 12 posts

---

## Architecture

No new services or hosting needed. Blog content lives in Sanity alongside existing categories/services. Next.js fetches via GROQ with 60-second ISR — same pattern as Phase 1.

**Two new Sanity document types** added to the existing schema barrel:
- `post` — the blog article
- `author` — optional named author profile

**Three new Next.js routes:**
- `/blog` — listing page
- `/blog/[slug]` — single post page
- Category pages get a new "Latest articles" section at the bottom (no new route)

**Sitemap** extended to include all published post URLs.

---

## Content Model

### `post`
- `slug` — kebab-case, auto-generated from EN title, unique
- `title` — `localizedString` (required)
- `excerpt` — `localizedText` — short summary used on cards and as meta description fallback
- `coverImage` — `image` with hotspot + alt text (`localizedString`)
- `body` — `localizedRichText` — Portable Text for EN and ID (headings, lists, inline images, links, callouts)
- `category` — reference to `category` doc (required) — one of the 7 existing categories
- `author` — reference to `author` doc (optional) — falls back to "Ilot" in UI if empty
- `publishedAt` — `datetime` — posts with future dates are hidden from public queries
- `featured` — `boolean` — pins one post to the hero slot on `/blog`
- `seo` — `seoFields` object (already defined in Phase 1) — optional metaTitle + metaDescription per locale
- `isActive` — `boolean`, default true

### `author`
- `name` — `string` (required)
- `role` — `string` (e.g. "Senior Immigration Lawyer")
- `photo` — `image` with hotspot
- `bio` — `localizedText`
- `linkedinUrl` — `string` (optional)

### New object schema: `localizedRichText`
- `en` — `array` of Portable Text blocks
- `id` — `array` of Portable Text blocks

---

## Public Pages

### `/blog` — listing page
- **Hero** — the post with `featured: true` (large cover image, category pill, title, excerpt, author, date). If no featured post, show most recent.
- **Grid** — remaining posts, 12 per page. Each card: cover image, category pill (accent color), title, excerpt, date, author byline, reading-time estimate.
- **Filter chips** — "All" + the 7 category names. Clicking filters the grid client-side (no full page reload). Active filter is reflected in the URL as `?category=visa` for shareability.
- **Language toggle** — EN / ID in the navbar (global, applies site-wide once added)
- Statically generated with ISR revalidate 60s

### `/blog/[slug]` — single post
- **Cover image** full-width with alt text
- **Header** — category pill + title + author byline (name + role + photo, or "Ilot" if no author) + reading time + formatted date
- **Body** — Portable Text rendered with Tailwind Typography (`@tailwindcss/typography`)
- **"Related services" block** — 3 services from the same category pulled from Sanity. Always visible. Drives the conversion funnel.
- **"More articles" block** — 3 more posts from the same category, shown at the bottom
- SEO: `BlogPosting` JSON-LD schema, `og:image`, `og:title`, `og:description`
- `hreflang` links for EN / ID variants (same URL, different lang tag — field-level localization)
- Statically generated with `generateStaticParams` + ISR revalidate 60s

### Category page integration (`/[category]`)
- New section near the bottom: **"Latest articles about [Category Name]"**
- Shows 3 most recent published posts for that category (cover image, title, date, excerpt)
- Section is **hidden entirely** if the category has zero published posts
- No new route — modifies the existing `src/app/(marketing)/[category]/page.tsx`

---

## New Files

### Sanity schemas
- `src/sanity/schemas/objects/localizedRichText.ts`
- `src/sanity/schemas/documents/post.ts`
- `src/sanity/schemas/documents/author.ts`
- `src/sanity/schemas/index.ts` — modified to include new types

### GROQ queries (added to existing `src/sanity/lib/queries.ts`)
- `postsQuery` — all published posts ordered by publishedAt desc, with category + author refs resolved
- `postBySlugQuery` — single post with full body, category, author, related services
- `postsByCategoryQuery($categorySlug, $limit)` — for category page section + "more articles"
- `allPostSlugsQuery` — for `generateStaticParams`
- `featuredPostQuery` — single featured post for hero

### New routes
- `src/app/(marketing)/blog/page.tsx` — listing page
- `src/app/(marketing)/blog/[slug]/page.tsx` — single post page
- `src/app/(marketing)/blog/[slug]/opengraph-image.tsx` — OG image (optional, uses Next.js ImageResponse)

### Modified files
- `src/sanity/schemas/index.ts` — add post + author + localizedRichText
- `src/sanity/lib/queries.ts` — add blog queries
- `src/app/(marketing)/[category]/page.tsx` — add "latest articles" section at bottom
- `src/app/sitemap.ts` — add all published post URLs
- `src/lib/db/types.ts` — add `Post`, `Author`, `PostWithCategory` types

### New components
- `src/components/blog/PostCard.tsx` — reusable card used in listing + category page section
- `src/components/blog/PostBody.tsx` — Portable Text renderer using `@tailwindcss/typography`
- `src/components/blog/CategoryFilter.tsx` — client component for filter chips + URL param
- `src/components/blog/AuthorByline.tsx` — author name/role/photo or "Ilot" fallback
- `src/components/blog/RelatedServices.tsx` — 3-service conversion block on post page

---

## SEO & Performance

- `BlogPosting` JSON-LD on every `/blog/[slug]` page
- `hreflang` `x-default` + `id` tags in `<head>` (same URL, locale declared via field-level content)
- `og:image` sourced from `coverImage` via Sanity image CDN
- Reading time calculated from body word count at render time
- All images use `next/image` with Sanity CDN URLs (already whitelisted in `next.config.ts`)
- Sitemap extended: every post emits `{ url: /blog/[slug], lastModified: updatedAt }`

---

## Studio Experience

- Studio sidebar (in `src/sanity/structure.ts`) gets a new top-level section: **Posts** and **Authors**
- Posts list shows title, category pill, published date, featured badge
- Ordered by `publishedAt` descending by default

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Portable Text rendering differs between EN and ID | `PostBody` component accepts a `blocks` prop; caller passes the right locale's array |
| `featured: true` on multiple posts | GROQ query uses `[0]` to always pick one; Studio validation warns if more than one is featured |
| Category page breaks if posts query fails | Wrap in try/catch, return empty array — section hidden when empty |
| `@tailwindcss/typography` styles clash with existing design | Scope under `.prose` class, customise via Tailwind config to match brand typography |

---

## Success Criteria

1. Client can create a post in Studio, publish it, and see it appear on `/blog` within 60 seconds
2. A post filed under "Visa & Immigration" appears in the "Latest articles" section on `/visa`
3. `/blog` renders correctly with the featured hero and grid
4. Each post page shows the correct "Related services" block pulling from the same category
5. All post URLs appear in `/sitemap.xml`
6. `npx tsc --noEmit` passes with zero errors
