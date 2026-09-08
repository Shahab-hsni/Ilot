# Regulatory Updates — Phase A Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Regulatory Updates content type to Sanity, a `/updates` news feed, individual update detail pages, and a contextual banner on service detail pages showing recent regulatory changes that affect that service.

**Architecture:** A new Sanity `update` document stores regulatory news items with severity level, effective date, and references to affected services. The `/updates` listing page renders a card-per-update feed. Service detail pages gain an `UpdatesBanner` component that uses a GROQ back-reference query (`^._id in affectedServices[]._ref`) to surface at most 3 recent updates inline — no extra fetch needed. The `Service` schema gains a `lastVerifiedAt` timestamp so editors can signal that service info is current.

**Tech Stack:** Sanity v3 (schema + GROQ), Next.js 15.5 App Router (ISR), TypeScript, Tailwind CSS, lucide-react

---

## File Map

| Action | Path | Responsibility |
|--------|------|---------------|
| Create | `src/sanity/schemas/documents/update.ts` | Update document schema |
| Modify | `src/sanity/schemas/index.ts` | Register `update` schema |
| Modify | `src/sanity/structure.ts` | Add "Regulatory Updates" to Studio sidebar |
| Modify | `src/sanity/schemas/documents/service.ts` | Add `lastVerifiedAt` field |
| Modify | `src/lib/db/types.ts` | `Update`, `UpdateRef`, `UpdateWithBody` types; extend `ServiceWithCategory` |
| Modify | `src/sanity/lib/queries.ts` | Update GROQ projection + queries; extend `SERVICE_WITH_CATEGORY_PROJECTION` |
| Create | `src/lib/db/updates.ts` | `getUpdates`, `getUpdateBySlug`, `getAllUpdateSlugs` |
| Create | `src/components/updates/UpdateCard.tsx` | Card for /updates listing |
| Create | `src/app/(marketing)/updates/page.tsx` | /updates listing page |
| Create | `src/app/(marketing)/updates/[slug]/page.tsx` | /updates/[slug] detail page |
| Create | `src/components/updates/UpdatesBanner.tsx` | Compact banner on service detail |
| Modify | `src/app/(marketing)/[category]/[slug]/page.tsx` | Wire in UpdatesBanner |

---

### Task 1: `update` Sanity schema + Studio structure

**Files:**
- Create: `src/sanity/schemas/documents/update.ts`
- Modify: `src/sanity/schemas/index.ts`
- Modify: `src/sanity/structure.ts`

- [ ] **Step 1: Create the schema file**

Create `src/sanity/schemas/documents/update.ts` with this exact content:

```typescript
import { defineType, defineField } from 'sanity'

export const update = defineType({
  name: 'update',
  title: 'Regulatory Update',
  type: 'document',
  fields: [
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: { source: (doc: any) => doc?.title?.en ?? '', maxLength: 96 },
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'title',
      title: 'Title',
      type: 'localizedString',
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'summary',
      title: 'Summary',
      type: 'localizedText',
      description: 'Short description shown on listing cards and the service banner.',
    }),
    defineField({
      name: 'body',
      title: 'Body',
      type: 'localizedRichText',
    }),
    defineField({
      name: 'severity',
      title: 'Severity',
      type: 'string',
      options: {
        list: [
          { title: 'Info', value: 'info' },
          { title: 'Warning', value: 'warning' },
          { title: 'Critical', value: 'critical' },
        ],
        layout: 'radio',
      },
      initialValue: 'info',
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'effectiveDate',
      title: 'Effective Date',
      type: 'date',
      description: 'When the regulation change takes effect (YYYY-MM-DD).',
    }),
    defineField({
      name: 'publishedAt',
      title: 'Published At',
      type: 'datetime',
      initialValue: () => new Date().toISOString(),
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'affectedServices',
      title: 'Affected Services',
      type: 'array',
      of: [{ type: 'reference', to: [{ type: 'service' }] }],
      description: 'Services impacted by this regulatory change. Used to surface this update on service detail pages.',
    }),
    defineField({
      name: 'sourceUrl',
      title: 'Source URL',
      type: 'url',
      description: 'Link to official government regulation or announcement.',
    }),
    defineField({
      name: 'isActive',
      title: 'Active',
      type: 'boolean',
      initialValue: true,
    }),
  ],
  orderings: [
    {
      title: 'Newest first',
      name: 'publishedAtDesc',
      by: [{ field: 'publishedAt', direction: 'desc' }],
    },
  ],
  preview: {
    select: { title: 'title.en', subtitle: 'severity' },
  },
})
```

- [ ] **Step 2: Register in schema index**

Open `src/sanity/schemas/index.ts`. The current file imports `post` and exports `schemaTypes`. Add the `update` import and append it to the array:

```typescript
import { localizedString } from './objects/localizedString'
import { localizedText } from './objects/localizedText'
import { localizedRichText } from './objects/localizedRichText'
import { seoFields } from './objects/seoFields'
import { category } from './documents/category'
import { subCategory } from './documents/subCategory'
import { service } from './documents/service'
import { author } from './documents/author'
import { post } from './documents/post'
import { update } from './documents/update'

export const schemaTypes = [
  // objects
  localizedString,
  localizedText,
  localizedRichText,
  seoFields,
  // documents
  category,
  subCategory,
  service,
  author,
  post,
  update,
]
```

- [ ] **Step 3: Add to Studio structure**

Open `src/sanity/structure.ts`. After the `Blog Posts` `S.listItem()` block (around line 63) and before the final `S.divider()` that precedes `All Sub-Categories`, insert:

```typescript
      S.divider(),
      S.listItem()
        .title('Regulatory Updates')
        .child(
          S.documentTypeList('update')
            .title('Regulatory Updates')
            .defaultOrdering([{ field: 'publishedAt', direction: 'desc' }])
        ),
```

The bottom of `structure.ts` should now read:

```typescript
      S.listItem()
        .title('Blog Posts')
        .child(
          S.documentTypeList('post')
            .title('Blog Posts')
            .defaultOrdering([{ field: 'publishedAt', direction: 'desc' }])
        ),
      S.listItem()
        .title('Authors')
        .child(S.documentTypeList('author').title('Authors')),
      S.divider(),
      S.listItem()
        .title('Regulatory Updates')
        .child(
          S.documentTypeList('update')
            .title('Regulatory Updates')
            .defaultOrdering([{ field: 'publishedAt', direction: 'desc' }])
        ),
      S.divider(),
      S.documentTypeListItem('subCategory').title('All Sub-Categories'),
      S.documentTypeListItem('service').title('All Services'),
    ])
```

- [ ] **Step 4: TypeScript check**

```
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/sanity/schemas/documents/update.ts src/sanity/schemas/index.ts src/sanity/structure.ts
git commit -m "feat: add Regulatory Update Sanity schema and Studio structure"
```

---

### Task 2: Add `lastVerifiedAt` to Service schema

**Files:**
- Modify: `src/sanity/schemas/documents/service.ts`

- [ ] **Step 1: Add the field**

Open `src/sanity/schemas/documents/service.ts`. After the `isActive` field (currently the last field, around line 37), add:

```typescript
    defineField({
      name: 'lastVerifiedAt',
      title: 'Last Verified At',
      type: 'datetime',
      description: 'Date when the information for this service was last confirmed current by the Ilot team.',
    }),
```

The fields array should end:

```typescript
    defineField({ name: 'sortOrder', title: 'Sort Order', type: 'number', initialValue: 0 }),
    defineField({ name: 'isActive', title: 'Active', type: 'boolean', initialValue: true }),
    defineField({
      name: 'lastVerifiedAt',
      title: 'Last Verified At',
      type: 'datetime',
      description: 'Date when the information for this service was last confirmed current by the Ilot team.',
    }),
  ],
```

- [ ] **Step 2: TypeScript check**

```
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/sanity/schemas/documents/service.ts
git commit -m "feat: add lastVerifiedAt field to Service schema"
```

---

### Task 3: TypeScript types + GROQ queries

**Files:**
- Modify: `src/lib/db/types.ts`
- Modify: `src/sanity/lib/queries.ts`

- [ ] **Step 1: Add Update types to `src/lib/db/types.ts`**

After the `PostWithDetails` interface (currently the last interface), append:

```typescript
/** Minimal shape used inside ServiceWithCategory.recent_updates and UpdatesBanner */
export interface UpdateRef {
  id: string
  slug: string
  title: string
  summary: string | null
  severity: 'info' | 'warning' | 'critical'
  effective_date: string | null
  published_at: string
  source_url: string | null
}

export interface Update extends UpdateRef {
  affected_services: Array<{ slug: string; name: string; category_slug: string }>
  is_active: boolean
  updated_at: string
}

export interface UpdateWithBody extends Update {
  body_en: unknown[] | null
  body_id: unknown[] | null
}
```

- [ ] **Step 2: Extend `ServiceWithCategory` in `src/lib/db/types.ts`**

Find the existing `ServiceWithCategory` interface:

```typescript
export interface ServiceWithCategory extends Service {
  category: Pick<Category, 'slug' | 'name' | 'color_accent'>
  sub_category: Pick<SubCategory, 'slug' | 'name'> | null
}
```

Replace it with:

```typescript
export interface ServiceWithCategory extends Service {
  category: Pick<Category, 'slug' | 'name' | 'color_accent'>
  sub_category: Pick<SubCategory, 'slug' | 'name'> | null
  last_verified_at: string | null
  recent_updates: UpdateRef[]
}
```

- [ ] **Step 3: Extend `SERVICE_WITH_CATEGORY_PROJECTION` in `src/sanity/lib/queries.ts`**

Find `SERVICE_WITH_CATEGORY_PROJECTION` (starts at line 51). It currently ends with:

```groq
  "sub_category": select(
    defined(subCategory) => {
      "slug": subCategory->slug.current,
      "name": coalesce(subCategory->name.en, "")
    },
    null
  )
`
```

Replace that closing with:

```groq
  "sub_category": select(
    defined(subCategory) => {
      "slug": subCategory->slug.current,
      "name": coalesce(subCategory->name.en, "")
    },
    null
  ),
  "last_verified_at": lastVerifiedAt,
  "recent_updates": *[
    _type == "update" &&
    isActive == true &&
    ^._id in affectedServices[]._ref
  ] | order(publishedAt desc) [0..2] {
    "id": _id,
    "slug": slug.current,
    "title": coalesce(title.en, ""),
    "summary": coalesce(summary.en, null),
    "severity": coalesce(severity, "info"),
    "effective_date": effectiveDate,
    "published_at": publishedAt,
    "source_url": sourceUrl
  }
`
```

- [ ] **Step 4: Add Update GROQ queries to `src/sanity/lib/queries.ts`**

At the very end of the file (after `latestPostsByCategoryQuery`), append:

```typescript
// ─── Update queries ────────────────────────────────────────────────────────

const UPDATE_PROJECTION = groq`
  "id": _id,
  "slug": slug.current,
  "title": coalesce(title.en, ""),
  "summary": coalesce(summary.en, null),
  "severity": coalesce(severity, "info"),
  "effective_date": effectiveDate,
  "published_at": publishedAt,
  "source_url": sourceUrl,
  "affected_services": affectedServices[]->{
    "slug": slug.current,
    "name": coalesce(name.en, ""),
    "category_slug": category->slug.current
  },
  "is_active": coalesce(isActive, true),
  "updated_at": _updatedAt
`

export const updatesQuery = groq`
  *[_type == "update" && isActive == true] | order(publishedAt desc) {
    ${UPDATE_PROJECTION}
  }
`

export const updateBySlugQuery = groq`
  *[_type == "update" && slug.current == $slug && isActive == true][0] {
    ${UPDATE_PROJECTION},
    "body_en": body.en,
    "body_id": body.id
  }
`

export const allUpdateSlugsQuery = groq`
  *[_type == "update" && isActive == true].slug.current
`
```

- [ ] **Step 5: TypeScript check**

```
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/lib/db/types.ts src/sanity/lib/queries.ts
git commit -m "feat: add Update types and GROQ queries; extend ServiceWithCategory with recent_updates"
```

---

### Task 4: DB fetch functions for Update

**Files:**
- Create: `src/lib/db/updates.ts`

- [ ] **Step 1: Create the file**

```typescript
import { sanityClient } from '@/sanity/lib/client'
import {
  updatesQuery,
  updateBySlugQuery,
  allUpdateSlugsQuery,
} from '@/sanity/lib/queries'
import type { Update, UpdateWithBody } from './types'

export async function getUpdates(): Promise<Update[]> {
  try {
    const data = await sanityClient.fetch<Update[]>(
      updatesQuery,
      {},
      { next: { revalidate: 60, tags: ['update'] } }
    )
    return data ?? []
  } catch {
    return []
  }
}

export async function getUpdateBySlug(slug: string): Promise<UpdateWithBody | null> {
  try {
    const data = await sanityClient.fetch<UpdateWithBody | null>(
      updateBySlugQuery,
      { slug },
      { next: { revalidate: 60, tags: ['update', `update:${slug}`] } }
    )
    return data ?? null
  } catch {
    return null
  }
}

export async function getAllUpdateSlugs(): Promise<string[]> {
  try {
    const data = await sanityClient.fetch<string[]>(
      allUpdateSlugsQuery,
      {},
      { next: { revalidate: 60, tags: ['update'] } }
    )
    return data ?? []
  } catch {
    return []
  }
}
```

- [ ] **Step 2: TypeScript check**

```
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/db/updates.ts
git commit -m "feat: add Update DB fetch functions"
```

---

### Task 5: UpdateCard component + `/updates` listing page

**Files:**
- Create: `src/components/updates/UpdateCard.tsx`
- Create: `src/app/(marketing)/updates/page.tsx`

- [ ] **Step 1: Create `src/components/updates/UpdateCard.tsx`**

```tsx
import Link from 'next/link'
import { AlertTriangle, Info, AlertOctagon, ArrowRight } from 'lucide-react'
import type { Update } from '@/lib/db/types'

const SEVERITY_CONFIG = {
  info: {
    label: 'Info',
    icon: Info,
    pill: 'bg-blue-100 text-blue-700',
    border: 'border-blue-200',
  },
  warning: {
    label: 'Warning',
    icon: AlertTriangle,
    pill: 'bg-amber-100 text-amber-700',
    border: 'border-amber-200',
  },
  critical: {
    label: 'Critical',
    icon: AlertOctagon,
    pill: 'bg-red-100 text-red-700',
    border: 'border-red-200',
  },
} as const

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

interface Props {
  update: Update
}

export function UpdateCard({ update }: Props) {
  const cfg = SEVERITY_CONFIG[update.severity]
  const Icon = cfg.icon

  return (
    <Link
      href={`/updates/${update.slug}`}
      className={`group flex flex-col gap-4 p-6 rounded-card bg-surface border ${cfg.border} hover:shadow-md transition-shadow duration-200`}
    >
      {/* Severity pill + date */}
      <div className="flex items-center justify-between gap-3">
        <span
          className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full ${cfg.pill}`}
        >
          <Icon className="w-3 h-3" strokeWidth={2} />
          {cfg.label}
        </span>
        <time className="text-xs text-muted" dateTime={update.published_at}>
          {formatDate(update.published_at)}
        </time>
      </div>

      {/* Title */}
      <h3 className="font-semibold text-foreground text-lg leading-snug group-hover:text-accent transition-colors line-clamp-2">
        {update.title}
      </h3>

      {/* Summary */}
      {update.summary && (
        <p className="text-sm text-muted line-clamp-3 flex-1">{update.summary}</p>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-foreground/5 mt-auto">
        {update.effective_date ? (
          <p className="text-xs text-muted">
            Effective:{' '}
            <span className="font-medium">{formatDate(update.effective_date)}</span>
          </p>
        ) : (
          <span />
        )}
        <ArrowRight
          className="w-4 h-4 text-muted group-hover:text-accent transition-colors"
          strokeWidth={1.75}
        />
      </div>
    </Link>
  )
}
```

- [ ] **Step 2: Create `src/app/(marketing)/updates/page.tsx`**

```tsx
import type { Metadata } from 'next'
import { getUpdates } from '@/lib/db/updates'
import { UpdateCard } from '@/components/updates/UpdateCard'

export const revalidate = 60

export const metadata: Metadata = {
  title: 'Regulatory Updates — Indonesia Business & Visa Law',
  description:
    'Stay current with the latest regulatory changes affecting visas, company setup, and business compliance in Indonesia.',
}

export default async function UpdatesPage() {
  const updates = await getUpdates()

  return (
    <main className="min-h-screen bg-background">
      <div className="container-site section-padding">

        {/* Page header */}
        <div className="mb-12">
          <div className="inline-flex items-center space-x-2 text-[10px] font-bold tracking-[0.2em] text-gray-500 uppercase mb-6">
            <span>Regulatory Updates</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            What&apos;s changing in Indonesia
          </h1>
          <p className="text-muted text-lg max-w-2xl">
            The latest regulatory changes affecting visas, company setup, and business
            compliance — tracked and explained by the Ilot team.
          </p>
        </div>

        {/* Updates grid */}
        {updates.length > 0 ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {updates.map((update) => (
              <UpdateCard key={update.slug} update={update} />
            ))}
          </div>
        ) : (
          <div className="py-24 text-center text-muted">
            No regulatory updates yet. Check back soon.
          </div>
        )}
      </div>
    </main>
  )
}
```

- [ ] **Step 3: TypeScript check**

```
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/updates/UpdateCard.tsx src/app/(marketing)/updates/page.tsx
git commit -m "feat: add UpdateCard component and /updates listing page"
```

---

### Task 6: `/updates/[slug]` detail page

**Files:**
- Create: `src/app/(marketing)/updates/[slug]/page.tsx`

- [ ] **Step 1: Create the file**

```tsx
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import { AlertTriangle, Info, AlertOctagon, ExternalLink, ArrowRight } from 'lucide-react'
import { getUpdateBySlug, getAllUpdateSlugs } from '@/lib/db/updates'
import { PostBody } from '@/components/blog/PostBody'

export const revalidate = 60

interface Props {
  params: Promise<{ slug: string }>
}

const SEVERITY_CONFIG = {
  info: { label: 'Info', icon: Info, pill: 'bg-blue-100 text-blue-700' },
  warning: { label: 'Warning', icon: AlertTriangle, pill: 'bg-amber-100 text-amber-700' },
  critical: { label: 'Critical', icon: AlertOctagon, pill: 'bg-red-100 text-red-700' },
} as const

export async function generateStaticParams() {
  const slugs = await getAllUpdateSlugs()
  return slugs.map((slug) => ({ slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const update = await getUpdateBySlug(slug)
  if (!update) return {}

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://ilot.id'

  return {
    title: update.title,
    description: update.summary ?? undefined,
    openGraph: {
      title: update.title,
      description: update.summary ?? undefined,
      url: `${siteUrl}/updates/${update.slug}`,
      type: 'article',
      publishedTime: update.published_at,
    },
  }
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export default async function UpdatePage({ params }: Props) {
  const { slug } = await params
  const update = await getUpdateBySlug(slug)
  if (!update) notFound()

  const cfg = SEVERITY_CONFIG[update.severity]
  const Icon = cfg.icon

  return (
    <main className="min-h-screen bg-background">
      <div className="container-site section-padding">
        <div className="max-w-3xl mx-auto">

          {/* Back link */}
          <div className="mb-8">
            <Link
              href="/updates"
              className="text-sm text-muted hover:text-foreground transition-colors"
            >
              ← All regulatory updates
            </Link>
          </div>

          {/* Severity pill */}
          <div className="mb-4">
            <span
              className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full ${cfg.pill}`}
            >
              <Icon className="w-3 h-3" strokeWidth={2} />
              {cfg.label}
            </span>
          </div>

          {/* Title */}
          <h1 className="text-3xl md:text-4xl font-bold text-foreground leading-tight mb-4">
            {update.title}
          </h1>

          {/* Meta row */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted mb-8 pb-8 border-b border-foreground/10">
            <time dateTime={update.published_at}>{formatDate(update.published_at)}</time>
            {update.effective_date && (
              <>
                <span>·</span>
                <span>Effective {formatDate(update.effective_date)}</span>
              </>
            )}
            {update.source_url && (
              <>
                <span>·</span>
                <a
                  href={update.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
                >
                  Official source <ExternalLink className="w-3 h-3" />
                </a>
              </>
            )}
          </div>

          {/* Body or summary fallback */}
          {update.body_en && update.body_en.length > 0 ? (
            <PostBody blocks={update.body_en} />
          ) : update.summary ? (
            <p className="text-muted text-lg leading-relaxed">{update.summary}</p>
          ) : null}

          {/* Affected services */}
          {update.affected_services.length > 0 && (
            <div className="mt-12 pt-8 border-t border-foreground/10">
              <h2 className="text-lg font-semibold text-foreground mb-4">
                Affected Services
              </h2>
              <ul className="flex flex-col gap-3">
                {update.affected_services.map((svc) => (
                  <li key={svc.slug}>
                    <Link
                      href={`/${svc.category_slug}/${svc.slug}`}
                      className="group flex items-center justify-between gap-4 p-4 rounded-xl bg-surface hover:bg-accent/5 transition-colors"
                    >
                      <span className="font-medium text-foreground text-sm group-hover:text-accent transition-colors">
                        {svc.name}
                      </span>
                      <ArrowRight
                        className="w-4 h-4 text-muted shrink-0 group-hover:text-accent transition-colors"
                        strokeWidth={1.75}
                      />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Back link — bottom */}
          <div className="mt-16 pt-8 border-t border-foreground/10">
            <Link
              href="/updates"
              className="text-sm text-muted hover:text-foreground transition-colors"
            >
              ← Back to all regulatory updates
            </Link>
          </div>
        </div>
      </div>
    </main>
  )
}
```

- [ ] **Step 2: TypeScript check**

```
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/(marketing)/updates/[slug]/page.tsx
git commit -m "feat: add /updates/[slug] detail page"
```

---

### Task 7: `UpdatesBanner` on service detail

**Files:**
- Create: `src/components/updates/UpdatesBanner.tsx`
- Modify: `src/app/(marketing)/[category]/[slug]/page.tsx`

- [ ] **Step 1: Create `src/components/updates/UpdatesBanner.tsx`**

```tsx
import Link from 'next/link'
import { AlertTriangle, Info, AlertOctagon, ArrowRight } from 'lucide-react'
import type { UpdateRef } from '@/lib/db/types'

const SEVERITY_CONFIG = {
  info: {
    icon: Info,
    pill: 'bg-blue-50 border-blue-200 text-blue-700',
    label: 'Info',
  },
  warning: {
    icon: AlertTriangle,
    pill: 'bg-amber-50 border-amber-200 text-amber-700',
    label: 'Warning',
  },
  critical: {
    icon: AlertOctagon,
    pill: 'bg-red-50 border-red-200 text-red-700',
    label: 'Critical',
  },
} as const

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

interface Props {
  updates: UpdateRef[]
}

export function UpdatesBanner({ updates }: Props) {
  if (updates.length === 0) return null

  return (
    <section className="container-site py-8">
      <div className="max-w-4xl mx-auto">
        <div className="rounded-2xl border border-foreground/10 bg-surface overflow-hidden">
          {/* Header */}
          <div className="px-6 py-4 border-b border-foreground/10 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" strokeWidth={2} />
            <h2 className="text-sm font-semibold text-foreground">Regulatory Updates</h2>
          </div>

          {/* Update rows */}
          <ul className="divide-y divide-foreground/5">
            {updates.map((u) => {
              const cfg = SEVERITY_CONFIG[u.severity]
              const Icon = cfg.icon
              return (
                <li key={u.slug}>
                  <Link
                    href={`/updates/${u.slug}`}
                    className="group flex items-start justify-between gap-4 px-6 py-4 hover:bg-foreground/[0.02] transition-colors"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <span
                        className={`shrink-0 mt-0.5 inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border ${cfg.pill}`}
                      >
                        <Icon className="w-3 h-3" strokeWidth={2} />
                        {cfg.label}
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground group-hover:text-accent transition-colors line-clamp-1">
                          {u.title}
                        </p>
                        {u.summary && (
                          <p className="text-xs text-muted mt-0.5 line-clamp-1">{u.summary}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <time className="text-xs text-muted">{formatDate(u.published_at)}</time>
                      <ArrowRight
                        className="w-4 h-4 text-muted group-hover:text-accent transition-colors"
                        strokeWidth={1.75}
                      />
                    </div>
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Replace `src/app/(marketing)/[category]/[slug]/page.tsx`**

Replace the entire file with:

```tsx
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getServiceBySlug, getRelatedServices, getAllServiceSlugs } from '@/lib/db/services'
import { ServiceDetail } from '@/components/services/ServiceDetail'
import { RelatedServices } from '@/components/services/RelatedServices'
import { UpdatesBanner } from '@/components/updates/UpdatesBanner'
import { CTABanner } from '@/components/home/CTABanner'

export const revalidate = 3600

interface Props {
  params: Promise<{ category: string; slug: string }>
}

export async function generateStaticParams() {
  const slugs = await getAllServiceSlugs()
  return slugs.map(({ category, slug }) => ({ category, slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const service = await getServiceBySlug(slug)
  if (!service) return {}

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://ilot.id'

  return {
    title: service.meta_title ?? service.name,
    description:
      service.meta_description ??
      service.description ??
      `${service.name} — professional service by Ilot in Indonesia.`,
    alternates: {
      canonical: `${siteUrl}/${service.category.slug}/${service.slug}`,
    },
  }
}

export default async function ServicePage({ params }: Props) {
  const { slug } = await params
  const service = await getServiceBySlug(slug)
  if (!service) notFound()

  const related = service.sub_category_id
    ? await getRelatedServices(service.sub_category_id, service.slug)
    : []

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: service.name,
    description: service.description ?? '',
    provider: {
      '@type': 'Organization',
      name: 'Ilot',
      url: process.env.NEXT_PUBLIC_SITE_URL ?? 'https://ilot.id',
    },
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ServiceDetail service={service} />
      <UpdatesBanner updates={service.recent_updates} />
      <RelatedServices services={related} categorySlug={service.category.slug} />
      <CTABanner />
    </>
  )
}
```

- [ ] **Step 3: TypeScript check**

```
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/updates/UpdatesBanner.tsx src/app/(marketing)/[category]/[slug]/page.tsx
git commit -m "feat: add UpdatesBanner to service detail page"
```

---

## Self-Review

**Spec coverage:**
- ✅ New `update` Sanity document type → Task 1
- ✅ `lastVerifiedAt` on Service schema → Task 2
- ✅ TypeScript types + GROQ queries → Task 3
- ✅ DB fetch functions → Task 4
- ✅ `/updates` listing page → Task 5
- ✅ `/updates/[slug]` detail page → Task 6
- ✅ `UpdatesBanner` on service detail → Task 7

**Placeholder scan:** No TBDs, "implement later", or placeholder patterns found. All code blocks are complete.

**Type consistency:**
- `UpdateRef` defined in Task 3 types, used in `UpdatesBanner` Props (Task 7) ✅
- `Update extends UpdateRef` — all fields consistent ✅
- `UpdateWithBody extends Update` — body fields consistent with `updateBySlugQuery` projection ✅
- `ServiceWithCategory.recent_updates: UpdateRef[]` matches `UpdatesBanner` prop type ✅
- `getAllUpdateSlugs()` returns `string[]`, `generateStaticParams` maps `slug => ({ slug })` ✅
- `SEVERITY_CONFIG` keyed by `'info' | 'warning' | 'critical'` in both `UpdateCard` and `UpdatesBanner` ✅
- GROQ `[0..2]` in `recent_updates` returns up to 3 items (GROQ slice is inclusive) ✅
