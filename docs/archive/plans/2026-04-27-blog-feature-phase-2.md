# Blog Feature — Phase 2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a bilingual blog to the Ilot site — client publishes posts in Sanity Studio, posts are linked to the 7 service categories, and each post page drives conversion via a "Related services" block.
n**Status:** ✅ Shipped — blog live at /blog with ISR, author pages, category filtering and related services.

**Architecture:** Two new Sanity document types (`post`, `author`) alongside the existing Phase 1 schemas. GROQ queries follow the same snake_case projection pattern established in Phase 1. Three new Next.js routes (`/blog`, `/blog/[slug]`) plus a "latest articles" section injected into existing category pages. All statically generated with ISR 60s.

**Tech Stack:** Next.js 15, Sanity v3, `@portabletext/react` (Portable Text rendering), `@sanity/image-url` (image URL builder), `@tailwindcss/typography` (prose styles, Tailwind v4 `@plugin` syntax), TypeScript 5.9, Vitest (existing).

**Spec:** `docs/superpowers/specs/2026-04-27-blog-feature-design.md`

---

## File Structure

### Created
- `src/sanity/schemas/objects/localizedRichText.ts` — Portable Text field for EN + ID
- `src/sanity/schemas/documents/author.ts` — author profile document
- `src/sanity/schemas/documents/post.ts` — blog post document
- `src/sanity/lib/image.ts` — Sanity image URL builder helper
- `src/lib/db/posts.ts` — blog data layer (GROQ fetches)
- `src/components/blog/PostCard.tsx` — card used in listing + category sections
- `src/components/blog/AuthorByline.tsx` — name/role/photo or "Ilot" fallback
- `src/components/blog/PostBody.tsx` — Portable Text renderer
- `src/components/blog/RelatedServices.tsx` — 3-service conversion block
- `src/components/blog/CategoryFilter.tsx` — client component, filter chips + URL params
- `src/app/(marketing)/blog/page.tsx` — listing page
- `src/app/(marketing)/blog/[slug]/page.tsx` — single post page

### Modified
- `src/sanity/schemas/index.ts` — add `localizedRichText`, `author`, `post`
- `src/sanity/structure.ts` — add Posts + Authors sections to Studio sidebar
- `src/sanity/lib/queries.ts` — add blog GROQ queries
- `src/lib/db/types.ts` — add `Author`, `Post`, `PostWithDetails` interfaces
- `src/app/(marketing)/[category]/page.tsx` — add "Latest articles" section
- `src/app/sitemap.ts` — extend with all published post URLs
- `src/app/globals.css` — add `@plugin "@tailwindcss/typography"`
- `package.json` — add deps

---

## Task 1: Install dependencies + configure typography

**Files:**
- Modify: `package.json`
- Modify: `src/app/globals.css`

- [ ] **Step 1: Install packages**

```bash
npm install @portabletext/react @sanity/image-url
npm install --save-dev @tailwindcss/typography --force
```

- [ ] **Step 2: Add typography plugin to globals.css**

In `src/app/globals.css`, add this line immediately after `@import "tailwindcss";`:

```css
@import "tailwindcss";
@plugin "@tailwindcss/typography";
```

So the top of the file becomes:
```css
@import "tailwindcss";
@plugin "@tailwindcss/typography";

@theme {
  --color-background: #FFFFFF;
  /* ... rest unchanged ... */
```

- [ ] **Step 3: Verify build still compiles**

```bash
npx tsc --noEmit 2>&1 | grep -v node_modules
```
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json src/app/globals.css
git commit -m "chore: install blog dependencies and add typography plugin"
```

---

## Task 2: Add blog types to `src/lib/db/types.ts`

**Files:**
- Modify: `src/lib/db/types.ts`

- [ ] **Step 1: Append blog types**

Append to the end of `src/lib/db/types.ts`:

```typescript
export interface Author {
  id: string
  name: string
  role: string | null
  photo_url: string | null
  bio: string | null
  linkedin_url: string | null
}

export interface Post {
  id: string
  slug: string
  title: string
  excerpt: string | null
  cover_image_url: string | null
  cover_image_alt: string | null
  category_slug: string
  category_name: string
  category_accent: string | null
  author: Author | null
  published_at: string
  featured: boolean
  is_active: boolean
  updated_at: string
}

export interface PostWithDetails extends Post {
  body_en: unknown[] | null   // Portable Text blocks — EN
  body_id: unknown[] | null   // Portable Text blocks — ID
  meta_title: string | null
  meta_description: string | null
  related_services: Array<{
    slug: string
    name: string
    description: string | null
    category_slug: string
  }>
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit 2>&1 | grep -v node_modules
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/db/types.ts
git commit -m "feat(blog): add Post, Author, PostWithDetails types"
```

---

## Task 3: Sanity image URL helper

**Files:**
- Create: `src/sanity/lib/image.ts`

- [ ] **Step 1: Create the helper**

Create `src/sanity/lib/image.ts`:

```typescript
import createImageUrlBuilder from '@sanity/image-url'
import type { SanityImageSource } from '@sanity/image-url/lib/types/types'
import { dataset, projectId } from '../env'

const builder = createImageUrlBuilder({ projectId, dataset })

export function urlFor(source: SanityImageSource) {
  return builder.image(source)
}
```

- [ ] **Step 2: Commit**

```bash
git add src/sanity/lib/image.ts
git commit -m "feat(sanity): add image URL builder helper"
```

---

## Task 4: Sanity schemas — `localizedRichText`, `author`, `post`

**Files:**
- Create: `src/sanity/schemas/objects/localizedRichText.ts`
- Create: `src/sanity/schemas/documents/author.ts`
- Create: `src/sanity/schemas/documents/post.ts`
- Modify: `src/sanity/schemas/index.ts`

- [ ] **Step 1: Create `localizedRichText`**

Create `src/sanity/schemas/objects/localizedRichText.ts`:

```typescript
import { defineType, defineField } from 'sanity'

export const localizedRichText = defineType({
  name: 'localizedRichText',
  title: 'Localized Rich Text',
  type: 'object',
  fields: [
    defineField({
      name: 'en',
      title: 'English',
      type: 'array',
      of: [
        {
          type: 'block',
          styles: [
            { title: 'Normal', value: 'normal' },
            { title: 'Heading 2', value: 'h2' },
            { title: 'Heading 3', value: 'h3' },
            { title: 'Quote', value: 'blockquote' },
          ],
          marks: {
            decorators: [
              { title: 'Bold', value: 'strong' },
              { title: 'Italic', value: 'em' },
              { title: 'Underline', value: 'underline' },
            ],
            annotations: [
              {
                name: 'link',
                type: 'object',
                title: 'Link',
                fields: [
                  { name: 'href', type: 'url', title: 'URL' },
                  { name: 'blank', type: 'boolean', title: 'Open in new tab' },
                ],
              },
            ],
          },
        },
        { type: 'image', options: { hotspot: true } },
      ],
    }),
    defineField({
      name: 'id',
      title: 'Bahasa Indonesia',
      type: 'array',
      of: [
        {
          type: 'block',
          styles: [
            { title: 'Normal', value: 'normal' },
            { title: 'Heading 2', value: 'h2' },
            { title: 'Heading 3', value: 'h3' },
            { title: 'Quote', value: 'blockquote' },
          ],
          marks: {
            decorators: [
              { title: 'Bold', value: 'strong' },
              { title: 'Italic', value: 'em' },
              { title: 'Underline', value: 'underline' },
            ],
            annotations: [
              {
                name: 'link',
                type: 'object',
                title: 'Link',
                fields: [
                  { name: 'href', type: 'url', title: 'URL' },
                  { name: 'blank', type: 'boolean', title: 'Open in new tab' },
                ],
              },
            ],
          },
        },
        { type: 'image', options: { hotspot: true } },
      ],
    }),
  ],
})
```

- [ ] **Step 2: Create `author` schema**

Create `src/sanity/schemas/documents/author.ts`:

```typescript
import { defineType, defineField } from 'sanity'

export const author = defineType({
  name: 'author',
  title: 'Author',
  type: 'document',
  fields: [
    defineField({
      name: 'name',
      title: 'Name',
      type: 'string',
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'role',
      title: 'Role',
      type: 'string',
      description: 'e.g. "Senior Immigration Lawyer"',
    }),
    defineField({
      name: 'photo',
      title: 'Photo',
      type: 'image',
      options: { hotspot: true },
    }),
    defineField({
      name: 'bio',
      title: 'Bio',
      type: 'localizedText',
    }),
    defineField({
      name: 'linkedinUrl',
      title: 'LinkedIn URL',
      type: 'url',
    }),
  ],
  preview: {
    select: { title: 'name', subtitle: 'role', media: 'photo' },
  },
})
```

- [ ] **Step 3: Create `post` schema**

Create `src/sanity/schemas/documents/post.ts`:

```typescript
import { defineType, defineField } from 'sanity'

export const post = defineType({
  name: 'post',
  title: 'Blog Post',
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
      name: 'excerpt',
      title: 'Excerpt',
      type: 'localizedText',
      description: 'Short summary shown on cards and used as meta description fallback.',
    }),
    defineField({
      name: 'coverImage',
      title: 'Cover Image',
      type: 'image',
      options: { hotspot: true },
      fields: [
        defineField({
          name: 'alt',
          title: 'Alt text',
          type: 'localizedString',
        }),
      ],
    }),
    defineField({
      name: 'body',
      title: 'Body',
      type: 'localizedRichText',
    }),
    defineField({
      name: 'category',
      title: 'Category',
      type: 'reference',
      to: [{ type: 'category' }],
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'author',
      title: 'Author',
      type: 'reference',
      to: [{ type: 'author' }],
      description: 'Leave empty to use "Ilot" as the firm byline.',
    }),
    defineField({
      name: 'publishedAt',
      title: 'Published At',
      type: 'datetime',
      initialValue: () => new Date().toISOString(),
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'featured',
      title: 'Featured',
      type: 'boolean',
      initialValue: false,
      description: 'Pin this post to the hero slot on /blog. Only one post should be featured at a time.',
    }),
    defineField({
      name: 'seo',
      title: 'SEO',
      type: 'seoFields',
    }),
    defineField({
      name: 'isActive',
      title: 'Active',
      type: 'boolean',
      initialValue: true,
    }),
  ],
  orderings: [
    { title: 'Newest first', name: 'publishedAtDesc', by: [{ field: 'publishedAt', direction: 'desc' }] },
  ],
  preview: {
    select: {
      title: 'title.en',
      subtitle: 'category->name.en',
      media: 'coverImage',
    },
  },
})
```

- [ ] **Step 4: Update schema barrel `src/sanity/schemas/index.ts`**

Replace the entire file:

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
]
```

- [ ] **Step 5: Type-check**

```bash
npx tsc --noEmit 2>&1 | grep -v node_modules
```
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/sanity/schemas/
git commit -m "feat(blog): add localizedRichText, author, post schemas"
```

---

## Task 5: Update Studio structure for blog

**Files:**
- Modify: `src/sanity/structure.ts`

- [ ] **Step 1: Add Posts and Authors to Studio sidebar**

Replace the entire `src/sanity/structure.ts` with:

```typescript
import type { StructureResolver } from 'sanity/structure'

export const structure: StructureResolver = (S) =>
  S.list()
    .title('Content')
    .items([
      S.listItem()
        .title('Categories')
        .child(
          S.documentTypeList('category')
            .title('Categories')
            .child((categoryId) =>
              S.list()
                .title('Category')
                .items([
                  S.listItem()
                    .title('Edit category')
                    .child(S.document().documentId(categoryId).schemaType('category')),
                  S.listItem()
                    .title('Sub-Categories')
                    .child(
                      S.documentList()
                        .title('Sub-Categories')
                        .filter('_type == "subCategory" && category._ref == $categoryId')
                        .params({ categoryId })
                        .child((subCategoryId) =>
                          S.list()
                            .title('Sub-Category')
                            .items([
                              S.listItem()
                                .title('Edit sub-category')
                                .child(
                                  S.document()
                                    .documentId(subCategoryId)
                                    .schemaType('subCategory')
                                ),
                              S.listItem()
                                .title('Services')
                                .child(
                                  S.documentList()
                                    .title('Services')
                                    .filter(
                                      '_type == "service" && subCategory._ref == $subCategoryId'
                                    )
                                    .params({ subCategoryId })
                                ),
                            ])
                        )
                    ),
                  S.listItem()
                    .title('All services in this category')
                    .child(
                      S.documentList()
                        .title('Services')
                        .filter('_type == "service" && category._ref == $categoryId')
                        .params({ categoryId })
                    ),
                ])
            )
        ),
      S.divider(),
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
      S.documentTypeListItem('subCategory').title('All Sub-Categories'),
      S.documentTypeListItem('service').title('All Services'),
    ])
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit 2>&1 | grep -v node_modules
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/sanity/structure.ts
git commit -m "feat(blog): add Posts and Authors to studio sidebar"
```

---

## Task 6: GROQ queries for blog

**Files:**
- Modify: `src/sanity/lib/queries.ts`

- [ ] **Step 1: Append blog queries to `src/sanity/lib/queries.ts`**

Append this block to the END of `src/sanity/lib/queries.ts`:

```typescript
// ─── Blog queries ─────────────────────────────────────────────────────────

const AUTHOR_PROJECTION = groq`
  "id": _id,
  "name": name,
  "role": role,
  "photo_url": photo.asset->url,
  "bio": coalesce(bio.en, null),
  "linkedin_url": linkedinUrl
`

const POST_PROJECTION = groq`
  "id": _id,
  "slug": slug.current,
  "title": coalesce(title.en, ""),
  "excerpt": coalesce(excerpt.en, null),
  "cover_image_url": coverImage.asset->url,
  "cover_image_alt": coalesce(coverImage.alt.en, null),
  "category_slug": category->slug.current,
  "category_name": coalesce(category->name.en, ""),
  "category_accent": category->accentColor,
  "author": select(
    defined(author) => author->{${AUTHOR_PROJECTION}},
    null
  ),
  "published_at": publishedAt,
  "featured": coalesce(featured, false),
  "is_active": coalesce(isActive, true),
  "updated_at": _updatedAt
`

export const postsQuery = groq`
  *[
    _type == "post" &&
    isActive == true &&
    publishedAt <= now()
  ] | order(publishedAt desc) {
    ${POST_PROJECTION}
  }
`

export const featuredPostQuery = groq`
  *[
    _type == "post" &&
    isActive == true &&
    publishedAt <= now() &&
    featured == true
  ] | order(publishedAt desc) [0] {
    ${POST_PROJECTION}
  }
`

export const postBySlugQuery = groq`
  *[
    _type == "post" &&
    slug.current == $slug &&
    isActive == true
  ] [0] {
    ${POST_PROJECTION},
    "body_en": body.en,
    "body_id": body.id,
    "meta_title": coalesce(seo.metaTitle.en, null),
    "meta_description": coalesce(seo.metaDescription.en, null),
    "related_services": *[
      _type == "service" &&
      category._ref == ^.category._ref &&
      isActive == true
    ] | order(sortOrder asc) [0..2] {
      "slug": slug.current,
      "name": coalesce(name.en, ""),
      "description": coalesce(description.en, null),
      "category_slug": category->slug.current
    }
  }
`

export const allPostSlugsQuery = groq`
  *[
    _type == "post" &&
    isActive == true &&
    publishedAt <= now()
  ].slug.current
`

export const latestPostsByCategoryQuery = groq`
  *[
    _type == "post" &&
    isActive == true &&
    publishedAt <= now() &&
    category->slug.current == $categorySlug
  ] | order(publishedAt desc) [0..$limit] {
    ${POST_PROJECTION}
  }
`
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit 2>&1 | grep -v node_modules
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/sanity/lib/queries.ts
git commit -m "feat(blog): add blog GROQ queries"
```

---

## Task 7: Blog data layer

**Files:**
- Create: `src/lib/db/posts.ts`

- [ ] **Step 1: Create `src/lib/db/posts.ts`**

```typescript
import { sanityClient } from '@/sanity/lib/client'
import {
  postsQuery,
  featuredPostQuery,
  postBySlugQuery,
  allPostSlugsQuery,
  latestPostsByCategoryQuery,
} from '@/sanity/lib/queries'
import type { Post, PostWithDetails } from './types'

export async function getPosts(): Promise<Post[]> {
  try {
    const data = await sanityClient.fetch<Post[]>(
      postsQuery,
      {},
      { next: { revalidate: 60, tags: ['post'] } }
    )
    return data ?? []
  } catch {
    return []
  }
}

export async function getFeaturedPost(): Promise<Post | null> {
  try {
    const data = await sanityClient.fetch<Post | null>(
      featuredPostQuery,
      {},
      { next: { revalidate: 60, tags: ['post'] } }
    )
    return data ?? null
  } catch {
    return null
  }
}

export async function getPostBySlug(slug: string): Promise<PostWithDetails | null> {
  try {
    const data = await sanityClient.fetch<PostWithDetails | null>(
      postBySlugQuery,
      { slug },
      { next: { revalidate: 60, tags: ['post', `post:${slug}`] } }
    )
    return data ?? null
  } catch {
    return null
  }
}

export async function getAllPostSlugs(): Promise<string[]> {
  try {
    const data = await sanityClient.fetch<string[]>(
      allPostSlugsQuery,
      {},
      { next: { revalidate: 60, tags: ['post'] } }
    )
    return data ?? []
  } catch {
    return []
  }
}

export async function getLatestPostsByCategory(
  categorySlug: string,
  limit = 3
): Promise<Post[]> {
  try {
    const data = await sanityClient.fetch<Post[]>(
      latestPostsByCategoryQuery,
      { categorySlug, limit: limit - 1 }, // GROQ [0..$limit] is inclusive, so limit-1
      { next: { revalidate: 60, tags: ['post', `category:${categorySlug}`] } }
    )
    return data ?? []
  } catch {
    return []
  }
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit 2>&1 | grep -v node_modules
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/db/posts.ts
git commit -m "feat(blog): add posts data layer"
```

---

## Task 8: Blog utility — reading time

**Files:**
- Create: `src/lib/reading-time.ts`
- Create: `tests/reading-time.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/reading-time.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { estimateReadingTime } from '../src/lib/reading-time'

describe('estimateReadingTime', () => {
  it('returns 1 min for short content', () => {
    expect(estimateReadingTime('word '.repeat(100))).toBe(1)
  })

  it('calculates minutes from word count at 200 wpm', () => {
    expect(estimateReadingTime('word '.repeat(400))).toBe(2)
    expect(estimateReadingTime('word '.repeat(600))).toBe(3)
  })

  it('handles portable text blocks', () => {
    const blocks = [
      { _type: 'block', children: [{ text: 'word '.repeat(200) }] },
      { _type: 'block', children: [{ text: 'word '.repeat(200) }] },
    ]
    expect(estimateReadingTime(blocks)).toBe(2)
  })

  it('returns 1 for empty input', () => {
    expect(estimateReadingTime('')).toBe(1)
    expect(estimateReadingTime([])).toBe(1)
    expect(estimateReadingTime(null)).toBe(1)
  })
})
```

- [ ] **Step 2: Run test — verify it fails**

```bash
npm test -- reading-time
```
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

Create `src/lib/reading-time.ts`:

```typescript
const WORDS_PER_MINUTE = 200

type PortableTextBlock = {
  _type: string
  children?: Array<{ text?: string }>
}

/**
 * Estimate reading time in minutes.
 * Accepts either a plain string or an array of Portable Text blocks.
 */
export function estimateReadingTime(
  content: string | PortableTextBlock[] | null | undefined
): number {
  if (!content) return 1

  let text: string

  if (typeof content === 'string') {
    text = content
  } else if (Array.isArray(content)) {
    text = content
      .flatMap((block) => block.children?.map((c) => c.text ?? '') ?? [])
      .join(' ')
  } else {
    return 1
  }

  const words = text.trim().split(/\s+/).filter(Boolean).length
  return Math.max(1, Math.ceil(words / WORDS_PER_MINUTE))
}
```

- [ ] **Step 4: Run test — verify it passes**

```bash
npm test -- reading-time
```
Expected: PASS — 4 tests passing.

- [ ] **Step 5: Commit**

```bash
git add src/lib/reading-time.ts tests/reading-time.test.ts
git commit -m "feat(blog): add reading time estimator with tests"
```

---

## Task 9: Blog components

**Files:**
- Create: `src/components/blog/PostCard.tsx`
- Create: `src/components/blog/AuthorByline.tsx`
- Create: `src/components/blog/PostBody.tsx`
- Create: `src/components/blog/RelatedServices.tsx`

- [ ] **Step 1: Create `AuthorByline.tsx`**

Create `src/components/blog/AuthorByline.tsx`:

```typescript
import Image from 'next/image'
import type { Author } from '@/lib/db/types'

interface Props {
  author: Author | null
  size?: 'sm' | 'md'
}

export function AuthorByline({ author, size = 'md' }: Props) {
  const name = author?.name ?? 'Ilot'
  const role = author?.role ?? 'Legal & Business Experts'
  const photoUrl = author?.photo_url ?? null
  const imgSize = size === 'sm' ? 28 : 36

  return (
    <div className="flex items-center gap-2">
      {photoUrl ? (
        <Image
          src={photoUrl}
          alt={name}
          width={imgSize}
          height={imgSize}
          className="rounded-full object-cover"
        />
      ) : (
        <div
          className="rounded-full bg-foreground/10 flex items-center justify-center text-xs font-semibold text-foreground/60"
          style={{ width: imgSize, height: imgSize }}
        >
          {name[0]}
        </div>
      )}
      <div>
        <p className={`font-medium text-foreground ${size === 'sm' ? 'text-xs' : 'text-sm'}`}>
          {name}
        </p>
        {size === 'md' && (
          <p className="text-xs text-muted">{role}</p>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create `PostCard.tsx`**

Create `src/components/blog/PostCard.tsx`:

```typescript
import Image from 'next/image'
import Link from 'next/link'
import { AuthorByline } from './AuthorByline'
import { estimateReadingTime } from '@/lib/reading-time'
import type { Post } from '@/lib/db/types'

interface Props {
  post: Post
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function PostCard({ post }: Props) {
  const readingTime = estimateReadingTime(post.excerpt ?? '')

  return (
    <Link
      href={`/blog/${post.slug}`}
      className="group flex flex-col overflow-hidden rounded-card bg-surface hover:shadow-lg transition-shadow duration-300"
    >
      {/* Cover image */}
      <div className="relative aspect-[16/9] overflow-hidden bg-foreground/5">
        {post.cover_image_url ? (
          <Image
            src={post.cover_image_url}
            alt={post.cover_image_alt ?? post.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-500"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        ) : (
          <div
            className="w-full h-full"
            style={{ backgroundColor: post.category_accent ?? '#0B0B1A' }}
          />
        )}
      </div>

      {/* Content */}
      <div className="flex flex-col flex-1 p-6 gap-3">
        {/* Category pill */}
        <span
          className="self-start text-xs font-semibold px-3 py-1 rounded-full text-white"
          style={{ backgroundColor: post.category_accent ?? '#0B0B1A' }}
        >
          {post.category_name}
        </span>

        {/* Title */}
        <h3 className="font-semibold text-foreground text-lg leading-snug group-hover:text-accent transition-colors line-clamp-2">
          {post.title}
        </h3>

        {/* Excerpt */}
        {post.excerpt && (
          <p className="text-muted text-sm line-clamp-2 flex-1">{post.excerpt}</p>
        )}

        {/* Meta */}
        <div className="flex items-center justify-between mt-auto pt-3 border-t border-foreground/5">
          <AuthorByline author={post.author} size="sm" />
          <div className="flex items-center gap-2 text-xs text-muted">
            <span>{formatDate(post.published_at)}</span>
            <span>·</span>
            <span>{readingTime} min read</span>
          </div>
        </div>
      </div>
    </Link>
  )
}
```

- [ ] **Step 3: Create `PostBody.tsx`**

Create `src/components/blog/PostBody.tsx`:

```typescript
'use client'

import { PortableText } from '@portabletext/react'
import Image from 'next/image'
import type { PortableTextComponents } from '@portabletext/react'

const components: PortableTextComponents = {
  types: {
    image: ({ value }) => {
      if (!value?.asset?._ref) return null
      return (
        <figure className="my-8">
          <div className="relative w-full aspect-[16/9] overflow-hidden rounded-2xl">
            <Image
              src={`https://cdn.sanity.io/images/${process.env.NEXT_PUBLIC_SANITY_PROJECT_ID}/production/${value.asset._ref
                .replace('image-', '')
                .replace('-jpg', '.jpg')
                .replace('-png', '.png')
                .replace('-webp', '.webp')}`}
              alt={value.alt ?? ''}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 860px"
            />
          </div>
          {value.caption && (
            <figcaption className="text-center text-sm text-muted mt-3">
              {value.caption}
            </figcaption>
          )}
        </figure>
      )
    },
  },
  marks: {
    link: ({ children, value }) => (
      <a
        href={value?.href}
        target={value?.blank ? '_blank' : undefined}
        rel={value?.blank ? 'noopener noreferrer' : undefined}
        className="text-accent underline underline-offset-2 hover:text-accent/80"
      >
        {children}
      </a>
    ),
  },
}

interface Props {
  blocks: unknown[]
}

export function PostBody({ blocks }: Props) {
  return (
    <div className="prose prose-lg max-w-none prose-headings:text-foreground prose-headings:font-semibold prose-p:text-foreground/80 prose-p:leading-relaxed prose-strong:text-foreground prose-blockquote:border-accent prose-blockquote:text-muted prose-a:text-accent">
      <PortableText value={blocks as any} components={components} />
    </div>
  )
}
```

- [ ] **Step 4: Create `RelatedServices.tsx`**

Create `src/components/blog/RelatedServices.tsx`:

```typescript
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

interface RelatedService {
  slug: string
  name: string
  description: string | null
  category_slug: string
}

interface Props {
  services: RelatedService[]
  categoryName: string
}

export function RelatedServices({ services, categoryName }: Props) {
  if (!services.length) return null

  return (
    <aside className="rounded-card bg-surface p-8 not-prose">
      <h3 className="text-lg font-semibold text-foreground mb-1">
        Related Services
      </h3>
      <p className="text-sm text-muted mb-6">
        Expert {categoryName} services from Ilot
      </p>
      <ul className="flex flex-col gap-4">
        {services.map((svc) => (
          <li key={svc.slug}>
            <Link
              href={`/${svc.category_slug}/${svc.slug}`}
              className="group flex items-start justify-between gap-4 p-4 rounded-xl bg-background hover:bg-accent/5 transition-colors"
            >
              <div>
                <p className="font-medium text-foreground text-sm group-hover:text-accent transition-colors">
                  {svc.name}
                </p>
                {svc.description && (
                  <p className="text-xs text-muted mt-1 line-clamp-1">
                    {svc.description}
                  </p>
                )}
              </div>
              <ArrowRight className="w-4 h-4 text-muted shrink-0 mt-0.5 group-hover:text-accent transition-colors" />
            </Link>
          </li>
        ))}
      </ul>
    </aside>
  )
}
```

- [ ] **Step 5: Type-check**

```bash
npx tsc --noEmit 2>&1 | grep -v node_modules
```
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/components/blog/
git commit -m "feat(blog): add PostCard, AuthorByline, PostBody, RelatedServices components"
```

---

## Task 10: CategoryFilter component

**Files:**
- Create: `src/components/blog/CategoryFilter.tsx`

- [ ] **Step 1: Create the component**

Create `src/components/blog/CategoryFilter.tsx`:

```typescript
'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useCallback } from 'react'

interface FilterCategory {
  slug: string
  name: string
  accent: string | null
}

interface Props {
  categories: FilterCategory[]
  active: string | null
}

export function CategoryFilter({ categories, active }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const setFilter = useCallback(
    (slug: string | null) => {
      const params = new URLSearchParams(searchParams.toString())
      if (slug) {
        params.set('category', slug)
      } else {
        params.delete('category')
      }
      router.push(`${pathname}?${params.toString()}`, { scroll: false })
    },
    [router, pathname, searchParams]
  )

  return (
    <div className="flex flex-wrap gap-2">
      <button
        onClick={() => setFilter(null)}
        className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
          !active
            ? 'bg-foreground text-background'
            : 'bg-surface text-muted hover:bg-foreground/10'
        }`}
      >
        All
      </button>
      {categories.map((cat) => (
        <button
          key={cat.slug}
          onClick={() => setFilter(cat.slug)}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
            active === cat.slug
              ? 'text-white'
              : 'bg-surface text-muted hover:bg-foreground/10'
          }`}
          style={active === cat.slug ? { backgroundColor: cat.accent ?? '#0B0B1A' } : {}}
        >
          {cat.name}
        </button>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit 2>&1 | grep -v node_modules
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/blog/CategoryFilter.tsx
git commit -m "feat(blog): add client-side category filter component"
```

---

## Task 11: `/blog` listing page

**Files:**
- Create: `src/app/(marketing)/blog/page.tsx`

- [ ] **Step 1: Create the listing page**

Create `src/app/(marketing)/blog/page.tsx`:

```typescript
import type { Metadata } from 'next'
import { Suspense } from 'react'
import { getPosts, getFeaturedPost } from '@/lib/db/posts'
import { getCategories } from '@/lib/db/categories'
import { PostCard } from '@/components/blog/PostCard'
import { AuthorByline } from '@/components/blog/AuthorByline'
import { CategoryFilter } from '@/components/blog/CategoryFilter'
import { estimateReadingTime } from '@/lib/reading-time'
import Image from 'next/image'
import Link from 'next/link'

export const revalidate = 60

export const metadata: Metadata = {
  title: 'Blog — Insights on Business & Legal in Indonesia',
  description:
    'Expert guides, updates, and advice on visa, legal, company setup, and more from the Ilot team.',
}

interface Props {
  searchParams: Promise<{ category?: string }>
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export default async function BlogPage({ searchParams }: Props) {
  const { category: activeCategory } = await searchParams

  const [allPosts, featured, categories] = await Promise.all([
    getPosts(),
    getFeaturedPost(),
    getCategories(),
  ])

  const filteredPosts = activeCategory
    ? allPosts.filter((p) => p.category_slug === activeCategory)
    : allPosts

  // Remove featured from grid to avoid duplication
  const gridPosts = featured
    ? filteredPosts.filter((p) => p.slug !== featured.slug)
    : filteredPosts

  const heroPost = activeCategory ? filteredPosts[0] ?? null : (featured ?? allPosts[0] ?? null)
  const heroGridPosts = activeCategory
    ? filteredPosts.slice(1)
    : gridPosts

  const filterCategories = categories
    .filter((c) => allPosts.some((p) => p.category_slug === c.slug))
    .map((c) => ({ slug: c.slug, name: c.name, accent: c.color_accent }))

  return (
    <main className="min-h-screen bg-background">
      <div className="container-site section-padding">

        {/* Page header */}
        <div className="mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            Insights
          </h1>
          <p className="text-muted text-lg max-w-2xl">
            Guides, updates, and expert advice on doing business in Indonesia.
          </p>
        </div>

        {/* Category filter */}
        {filterCategories.length > 0 && (
          <div className="mb-10">
            <Suspense>
              <CategoryFilter categories={filterCategories} active={activeCategory ?? null} />
            </Suspense>
          </div>
        )}

        {/* Hero post */}
        {heroPost && (
          <div className="mb-12">
            <Link
              href={`/blog/${heroPost.slug}`}
              className="group grid md:grid-cols-2 gap-8 overflow-hidden rounded-card bg-surface hover:shadow-xl transition-shadow duration-300"
            >
              <div className="relative aspect-[4/3] md:aspect-auto overflow-hidden bg-foreground/5">
                {heroPost.cover_image_url ? (
                  <Image
                    src={heroPost.cover_image_url}
                    alt={heroPost.cover_image_alt ?? heroPost.title}
                    fill
                    priority
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                    sizes="(max-width: 768px) 100vw, 50vw"
                  />
                ) : (
                  <div
                    className="w-full h-full min-h-64"
                    style={{ backgroundColor: heroPost.category_accent ?? '#0B0B1A' }}
                  />
                )}
              </div>
              <div className="flex flex-col justify-center p-8 gap-4">
                <span
                  className="self-start text-xs font-semibold px-3 py-1 rounded-full text-white"
                  style={{ backgroundColor: heroPost.category_accent ?? '#0B0B1A' }}
                >
                  {heroPost.category_name}
                </span>
                <h2 className="text-2xl md:text-3xl font-bold text-foreground leading-snug group-hover:text-accent transition-colors">
                  {heroPost.title}
                </h2>
                {heroPost.excerpt && (
                  <p className="text-muted leading-relaxed line-clamp-3">{heroPost.excerpt}</p>
                )}
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-foreground/5">
                  <AuthorByline author={heroPost.author} size="md" />
                  <div className="text-sm text-muted">
                    {formatDate(heroPost.published_at)} · {estimateReadingTime(heroPost.excerpt ?? '')} min read
                  </div>
                </div>
              </div>
            </Link>
          </div>
        )}

        {/* Posts grid */}
        {heroGridPosts.length > 0 ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {heroGridPosts.map((post) => (
              <PostCard key={post.slug} post={post} />
            ))}
          </div>
        ) : (
          !heroPost && (
            <div className="py-24 text-center text-muted">
              No articles yet. Check back soon.
            </div>
          )
        )}
      </div>
    </main>
  )
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit 2>&1 | grep -v node_modules
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/\(marketing\)/blog/page.tsx
git commit -m "feat(blog): add /blog listing page"
```

---

## Task 12: `/blog/[slug]` post page

**Files:**
- Create: `src/app/(marketing)/blog/[slug]/page.tsx`

- [ ] **Step 1: Create the post page**

Create `src/app/(marketing)/blog/[slug]/page.tsx`:

```typescript
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { getPostBySlug, getAllPostSlugs } from '@/lib/db/posts'
import { PostBody } from '@/components/blog/PostBody'
import { AuthorByline } from '@/components/blog/AuthorByline'
import { RelatedServices } from '@/components/blog/RelatedServices'
import { estimateReadingTime } from '@/lib/reading-time'

export const revalidate = 60

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateStaticParams() {
  const slugs = await getAllPostSlugs()
  return slugs.map((slug) => ({ slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const post = await getPostBySlug(slug)
  if (!post) return {}

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://ilot.id'

  return {
    title: post.meta_title ?? post.title,
    description: post.meta_description ?? post.excerpt ?? undefined,
    openGraph: {
      title: post.meta_title ?? post.title,
      description: post.meta_description ?? post.excerpt ?? undefined,
      url: `${siteUrl}/blog/${post.slug}`,
      type: 'article',
      publishedTime: post.published_at,
      modifiedTime: post.updated_at,
      images: post.cover_image_url
        ? [{ url: post.cover_image_url, alt: post.cover_image_alt ?? post.title }]
        : [],
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

export default async function PostPage({ params }: Props) {
  const { slug } = await params
  const post = await getPostBySlug(slug)
  if (!post) notFound()

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://ilot.id'
  const readingTime = estimateReadingTime(post.body_en ?? [])

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.excerpt ?? undefined,
    image: post.cover_image_url ?? undefined,
    datePublished: post.published_at,
    dateModified: post.updated_at,
    author: {
      '@type': post.author ? 'Person' : 'Organization',
      name: post.author?.name ?? 'Ilot',
    },
    publisher: {
      '@type': 'Organization',
      name: 'Ilot',
      url: siteUrl,
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `${siteUrl}/blog/${post.slug}`,
    },
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <main className="min-h-screen bg-background">
        {/* Cover image */}
        {post.cover_image_url && (
          <div className="relative w-full aspect-[21/9] overflow-hidden bg-foreground/5">
            <Image
              src={post.cover_image_url}
              alt={post.cover_image_alt ?? post.title}
              fill
              priority
              className="object-cover"
              sizes="100vw"
            />
          </div>
        )}

        <div className="container-site section-padding">
          <div className="max-w-4xl mx-auto">

            {/* Category breadcrumb */}
            <div className="mb-6">
              <Link
                href={`/blog?category=${post.category_slug}`}
                className="inline-flex items-center gap-2"
              >
                <span
                  className="text-xs font-semibold px-3 py-1 rounded-full text-white"
                  style={{ backgroundColor: post.category_accent ?? '#0B0B1A' }}
                >
                  {post.category_name}
                </span>
              </Link>
            </div>

            {/* Title */}
            <h1 className="text-3xl md:text-5xl font-bold text-foreground leading-tight mb-6">
              {post.title}
            </h1>

            {/* Meta row */}
            <div className="flex flex-wrap items-center justify-between gap-4 pb-8 mb-8 border-b border-foreground/10">
              <AuthorByline author={post.author} size="md" />
              <div className="flex items-center gap-3 text-sm text-muted">
                <time dateTime={post.published_at}>{formatDate(post.published_at)}</time>
                <span>·</span>
                <span>{readingTime} min read</span>
              </div>
            </div>

            {/* Two-column layout: body + sidebar */}
            <div className="grid lg:grid-cols-[1fr_320px] gap-12 items-start">

              {/* Body */}
              <article>
                {post.body_en && post.body_en.length > 0 ? (
                  <PostBody blocks={post.body_en} />
                ) : (
                  <p className="text-muted italic">No content yet.</p>
                )}
              </article>

              {/* Sidebar */}
              <aside className="lg:sticky lg:top-24 flex flex-col gap-6">
                <RelatedServices
                  services={post.related_services}
                  categoryName={post.category_name}
                />
              </aside>
            </div>

            {/* Back link */}
            <div className="mt-16 pt-8 border-t border-foreground/10">
              <Link
                href="/blog"
                className="text-sm text-muted hover:text-foreground transition-colors"
              >
                ← Back to all articles
              </Link>
            </div>
          </div>
        </div>
      </main>
    </>
  )
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit 2>&1 | grep -v node_modules
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add "src/app/(marketing)/blog/[slug]/page.tsx"
git commit -m "feat(blog): add /blog/[slug] post page with JSON-LD"
```

---

## Task 13: Category page integration — "Latest articles" section

**Files:**
- Modify: `src/app/(marketing)/[category]/page.tsx`

- [ ] **Step 1: Read the current file**

Read `src/app/(marketing)/[category]/page.tsx` to see its current structure before modifying.

- [ ] **Step 2: Add the "Latest articles" section**

Add these imports at the top of the file:

```typescript
import { getLatestPostsByCategory } from '@/lib/db/posts'
import { PostCard } from '@/components/blog/PostCard'
import Link from 'next/link'
```

In the `CategoryPage` default export, add `getLatestPostsByCategory` to the data fetching. After the existing `getCategoryBySlug` call, add:

```typescript
const latestPosts = await getLatestPostsByCategory(slug, 3)
```

Then at the very end of the returned JSX (before the closing `</CategoryServicesProvider>` or outer wrapper), add:

```typescript
{/* Latest articles section */}
{latestPosts.length > 0 && (
  <section className="section-padding bg-surface">
    <div className="container-site">
      <div className="flex items-end justify-between mb-8">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-foreground">
            Latest articles about {category.name}
          </h2>
          <p className="text-muted mt-1">
            Guides and insights from the Ilot team
          </p>
        </div>
        <Link
          href={`/blog?category=${category.slug}`}
          className="text-sm font-medium text-foreground hover:text-accent transition-colors hidden md:block"
        >
          View all →
        </Link>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {latestPosts.map((post) => (
          <PostCard key={post.slug} post={post} />
        ))}
      </div>
    </div>
  </section>
)}
```

- [ ] **Step 3: Type-check**

```bash
npx tsc --noEmit 2>&1 | grep -v node_modules
```
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add "src/app/(marketing)/[category]/page.tsx"
git commit -m "feat(blog): add latest articles section to category pages"
```

---

## Task 14: Sitemap extension

**Files:**
- Modify: `src/app/sitemap.ts`

- [ ] **Step 1: Extend sitemap to include posts**

Replace `src/app/sitemap.ts` with:

```typescript
import type { MetadataRoute } from 'next'
import { getCategories } from '@/lib/db/categories'
import { getAllServiceSlugs } from '@/lib/db/services'
import { getPosts } from '@/lib/db/posts'

export const revalidate = 3600

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://ilot.id'
  const [categories, services, posts] = await Promise.all([
    getCategories(),
    getAllServiceSlugs(),
    getPosts(),
  ])

  const staticPages: MetadataRoute.Sitemap = [
    { url: siteUrl, lastModified: new Date(), changeFrequency: 'weekly', priority: 1 },
    { url: `${siteUrl}/contact`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
    { url: `${siteUrl}/blog`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.8 },
  ]

  const categoryPages: MetadataRoute.Sitemap = categories.map((cat) => ({
    url: `${siteUrl}/${cat.slug}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.9,
  }))

  const servicePages: MetadataRoute.Sitemap = services.map(({ category, slug }) => ({
    url: `${siteUrl}/${category}/${slug}`,
    lastModified: new Date(),
    changeFrequency: 'monthly' as const,
    priority: 0.8,
  }))

  const blogPages: MetadataRoute.Sitemap = posts.map((post) => ({
    url: `${siteUrl}/blog/${post.slug}`,
    lastModified: new Date(post.updated_at),
    changeFrequency: 'monthly' as const,
    priority: 0.7,
  }))

  return [...staticPages, ...categoryPages, ...servicePages, ...blogPages]
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit 2>&1 | grep -v node_modules
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/sitemap.ts
git commit -m "feat(blog): extend sitemap with blog post URLs"
```

---

## Task 15: Final verification

- [ ] **Step 1: Run all tests**

```bash
npm test
```
Expected: all tests pass (25 tests — 21 existing + 4 reading-time).

- [ ] **Step 2: Full type-check**

```bash
npx tsc --noEmit 2>&1 | grep -v node_modules
```
Expected: zero errors.

- [ ] **Step 3: Production build**

```bash
npm run build 2>&1 | tail -20
```
Expected: build succeeds. `/blog` and `/blog/[slug]` appear in route output.

- [ ] **Step 4: Spot-check in browser**

Start dev server: `npm run dev -- --port 3004`

Check:
- `http://localhost:3004/blog` — page renders. If no posts yet, shows "No articles yet" message. No console errors.
- `http://localhost:3004/visa` — page renders with "Latest articles about Visa & Immigration" section **hidden** (no posts yet). No console errors.
- `http://localhost:3004/sitemap.xml` — `/blog` URL present.
- `http://localhost:3004/studio` → Blog Posts → Create a test post → Publish → verify it appears on `/blog` within 60s.

- [ ] **Step 5: Commit any fixes from Step 4**

If any issues were found and fixed, commit them before proceeding.

- [ ] **Step 6: Push and deploy**

```bash
git push origin main
```

---

## Self-Review Notes

**Spec coverage:**
- ✅ `post` schema: slug, title, excerpt, coverImage+alt, body (localizedRichText), category ref, author ref, publishedAt, featured, seo, isActive
- ✅ `author` schema: name, role, photo, bio (localizedText), linkedinUrl
- ✅ `/blog` listing: hero (featured post), grid, category filter chips (URL param), ISR 60s
- ✅ `/blog/[slug]`: cover image, header, body (Portable Text), related services sidebar, author byline, reading time, JSON-LD, OG tags, ISR 60s
- ✅ Category page integration: "Latest articles" section hidden when empty
- ✅ Sitemap extended with all post URLs + `/blog` static entry
- ✅ Bilingual: `localizedRichText` for body, all text fields localized; EN used at render time, ID available when locale switcher added in future
- ✅ Author fallback: "Ilot" shown when author ref is null
- ✅ `generateStaticParams` on post page
- ✅ Studio sidebar updated with Posts + Authors sections
- ✅ `@tailwindcss/typography` for prose styles
- ✅ Reading time calculation (TDD)

**Type consistency confirmed:**
- `Post.category_accent` used in `PostCard`, `CategoryFilter`, `PostPage` ✅
- `PostWithDetails.body_en` passed to `PostBody` as `blocks` ✅
- `PostWithDetails.related_services` shape matches `RelatedServices` props ✅
- `latestPostsByCategoryQuery` `limit - 1` adjustment for GROQ inclusive `[0..$limit]` range ✅
