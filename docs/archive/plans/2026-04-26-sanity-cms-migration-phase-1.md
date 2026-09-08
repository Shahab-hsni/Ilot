# Sanity CMS Migration — Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate categories, sub-categories, and services from Supabase `seed.sql` into Sanity CMS, with a Studio embedded at `/studio` so the non-technical client can edit all service content and see changes live within 60 seconds.

**Architecture:** Sanity Studio mounted in the existing Next.js app via a catch-all route (`/studio/[[...tool]]`). Sanity hosts the content database (free tier). Field-level localization (EN+ID) using `{en, id}` object fields — simpler than document-level for our scale. The data layer (`src/lib/db/categories.ts`, `services.ts`) is rewritten to query Sanity via GROQ, but **GROQ projections rename camelCase → snake_case** so existing TS types and all consumer components stay unchanged (minimal blast radius). A one-time TypeScript importer reads `docs/seed-data-raw.json` (client's complete data for 3 categories) plus `supabase/seed.sql` (fallback for the 4 partial categories) and writes to Sanity, idempotent by slug. Supabase tables stay inert as a rollback safety net.

**Tech Stack:** Next.js 15.5.14, React 19, TypeScript 5.9, Sanity v3 (`next-sanity`, `sanity`, `@sanity/client`, `@sanity/vision`), Vitest (new — for testing importer logic), GROQ.

**Spec:** `docs/superpowers/specs/2026-04-26-sanity-cms-migration-design.md`

---

## File Structure

### Created
- `vitest.config.ts` — Vitest config
- `tests/setup.ts` — empty test bootstrap (placeholder for future fixtures)
- `tests/normalize.test.ts`
- `tests/parseClientData.test.ts`
- `tests/parseSeedSql.test.ts`
- `scripts/lib/normalize.ts` — pure functions: slug normalization, sub-category grouper carry-forward
- `scripts/lib/parseClientData.ts` — parses `docs/seed-data-raw.json`
- `scripts/lib/parseSeedSql.ts` — parses `supabase/seed.sql` for fallback rows
- `scripts/lib/types.ts` — shared types for the importer pipeline
- `scripts/lib/sanityWriter.ts` — idempotent upsert by slug
- `scripts/import-to-sanity.ts` — entrypoint with dry-run mode
- `sanity.config.ts` — Studio config
- `sanity.cli.ts` — Sanity CLI config (for `sanity deploy`, `sanity migrate`, etc.)
- `src/sanity/env.ts` — env var helper with assertions
- `src/sanity/lib/client.ts` — read client (CDN-cached)
- `src/sanity/lib/writeClient.ts` — write client (server-only, used by importer)
- `src/sanity/lib/queries.ts` — GROQ query strings as named exports
- `src/sanity/structure.ts` — Studio desk structure (tree-style nesting)
- `src/sanity/schemas/index.ts` — schema barrel
- `src/sanity/schemas/objects/localizedString.ts`
- `src/sanity/schemas/objects/localizedText.ts`
- `src/sanity/schemas/objects/seoFields.ts`
- `src/sanity/schemas/documents/category.ts`
- `src/sanity/schemas/documents/subCategory.ts`
- `src/sanity/schemas/documents/service.ts`
- `src/app/studio/[[...tool]]/page.tsx` — mounts Studio
- `.env.example` — documents required env vars

### Modified
- `package.json` — add deps and scripts
- `next.config.ts` — pass-through for Sanity image CDN domain
- `src/lib/db/categories.ts` — Sanity GROQ replaces Supabase
- `src/lib/db/services.ts` — Sanity GROQ replaces Supabase
- `src/lib/db/types.ts` — small additions (`subCategoryRef` projection helper); existing snake_case fields remain
- `tsconfig.json` — include `scripts/**/*` and `tests/**/*`

### Unchanged (deliberately)
- All page components, `Navbar.tsx`, `ServicesDropdown.tsx`, `sitemap.ts`, `home page`, `category-colors.ts`
- Supabase client files in `src/lib/supabase/` (left in place; unused after cutover)

---

## Task 1: Set up Vitest

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`
- Create: `tests/setup.ts`
- Modify: `tsconfig.json`

- [ ] **Step 1: Install Vitest**

```bash
npm install --save-dev vitest @types/node
```

- [ ] **Step 2: Create `vitest.config.ts`**

```typescript
import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    environment: 'node',
    globals: false,
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@scripts': path.resolve(__dirname, './scripts'),
    },
  },
})
```

- [ ] **Step 3: Create `tests/setup.ts`**

```typescript
// Placeholder for shared test fixtures and global setup.
// Currently empty.
export {}
```

- [ ] **Step 4: Add `test` script to `package.json`**

In `package.json` `scripts`:

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 5: Update `tsconfig.json` includes**

Add `"scripts/**/*"` and `"tests/**/*"` to the `include` array if not already present.

- [ ] **Step 6: Verify Vitest runs (no tests yet)**

Run: `npm test`
Expected: exits successfully with "No test files found".

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json vitest.config.ts tests/setup.ts tsconfig.json
git commit -m "chore: add vitest for importer logic tests"
```

---

## Task 2: Slug normalization (TDD)

**Files:**
- Create: `tests/normalize.test.ts`
- Create: `scripts/lib/normalize.ts`

- [ ] **Step 1: Write the failing tests**

Create `tests/normalize.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { toSlug } from '@scripts/lib/normalize'

describe('toSlug', () => {
  it('lowercases and hyphenates spaces', () => {
    expect(toSlug('Company Set Up')).toBe('company-set-up')
  })

  it('strips ampersands and joins with single hyphen', () => {
    expect(toSlug('Visa & Immigration')).toBe('visa-immigration')
  })

  it('removes special characters', () => {
    expect(toSlug('PT Local - Set Up')).toBe('pt-local-set-up')
  })

  it('collapses repeated whitespace', () => {
    expect(toSlug('  Hello   World  ')).toBe('hello-world')
  })

  it('handles parentheses', () => {
    expect(toSlug('CV (Commanditaire Vennootschap)')).toBe('cv-commanditaire-vennootschap')
  })

  it('handles slashes', () => {
    expect(toSlug('NIB & OSS Process')).toBe('nib-oss-process')
  })

  it('returns empty string for empty input', () => {
    expect(toSlug('')).toBe('')
    expect(toSlug('   ')).toBe('')
  })

  it('strips leading and trailing hyphens', () => {
    expect(toSlug('-foo-bar-')).toBe('foo-bar')
  })

  it('preserves hyphens in already-slugged input', () => {
    expect(toSlug('investor-kitas')).toBe('investor-kitas')
  })
})
```

- [ ] **Step 2: Run tests — verify they fail**

Run: `npm test -- normalize`
Expected: FAIL — module `@scripts/lib/normalize` not found.

- [ ] **Step 3: Implement `toSlug`**

Create `scripts/lib/normalize.ts`:

```typescript
/**
 * Convert any string to a URL-safe kebab-case slug.
 * - Lowercase
 * - Replace any run of non-alphanumeric chars with a single hyphen
 * - Strip leading/trailing hyphens
 */
export function toSlug(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}
```

- [ ] **Step 4: Run tests — verify they pass**

Run: `npm test -- normalize`
Expected: PASS — 9 tests passing.

- [ ] **Step 5: Commit**

```bash
git add scripts/lib/normalize.ts tests/normalize.test.ts
git commit -m "feat(import): add slug normalization with tests"
```

---

## Task 3: Client data parser (TDD)

The client's `docs/seed-data-raw.json` is a flat array. Each row has `Category`, `Sub-Category`, `Service Name`, `Description`, `Target Client`, `Key Deliverables / Outcome`, `Estimated Timeline`, and optionally `Real time work`. We need to group it into categories → sub-categories → services.

**Files:**
- Create: `scripts/lib/types.ts`
- Create: `tests/parseClientData.test.ts`
- Create: `scripts/lib/parseClientData.ts`

- [ ] **Step 1: Define shared types**

Create `scripts/lib/types.ts`:

```typescript
export interface ParsedService {
  slug: string
  name: { en: string }
  description: { en: string } | null
  targetClient: { en: string } | null
  keyDeliverables: { en: string } | null
  estimatedTimeline: { en: string } | null
  realTimeWork: { en: string } | null
  sortOrder: number
}

export interface ParsedSubCategory {
  slug: string
  name: { en: string }
  sortOrder: number
  services: ParsedService[]
}

export interface ParsedCategory {
  slug: string
  name: { en: string }
  tagline: { en: string } | null
  iconName: string | null
  accentColor: string | null
  sortOrder: number
  subCategories: ParsedSubCategory[]
}

export interface ClientDataRow {
  Category: string
  'Sub-Category': string
  'Service Name': string
  Description: string
  'Target Client': string
  'Key Deliverables / Outcome': string
  'Estimated Timeline': string
  'Real time work'?: string
}
```

- [ ] **Step 2: Write the failing parser tests**

Create `tests/parseClientData.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { parseClientData } from '@scripts/lib/parseClientData'
import type { ClientDataRow } from '@scripts/lib/types'

const sample: ClientDataRow[] = [
  {
    Category: 'Visa',
    'Sub-Category': 'Investor KITAS',
    'Service Name': 'Investor KITAS 2 Years',
    Description: 'Full processing for a 2-year Investor Stay Permit.',
    'Target Client': 'Foreign Investors',
    'Key Deliverables / Outcome': '2-Year Investor KITAS, MERP',
    'Estimated Timeline': '6-10 Weeks',
  },
  {
    Category: 'Visa',
    'Sub-Category': 'Investor KITAS',
    'Service Name': 'Investor KITAS 1 Year',
    Description: '1-year version.',
    'Target Client': 'Foreign Investors',
    'Key Deliverables / Outcome': '1-Year Investor KITAS',
    'Estimated Timeline': '4-6 Weeks',
  },
  {
    Category: 'Visa',
    'Sub-Category': 'Working Remote KITAS',
    'Service Name': 'E33G Remote Worker',
    Description: 'Remote worker visa.',
    'Target Client': 'Remote Workers',
    'Key Deliverables / Outcome': 'E33G',
    'Estimated Timeline': '3-5 Weeks',
  },
  {
    Category: 'Accounting & Tax',
    'Sub-Category': 'Bookkeeping',
    'Service Name': 'Monthly Bookkeeping',
    Description: 'Monthly book closing.',
    'Target Client': 'SMEs',
    'Key Deliverables / Outcome': 'Monthly Reports',
    'Estimated Timeline': 'Ongoing',
    'Real time work': '2 days/month',
  },
]

describe('parseClientData', () => {
  it('groups rows into category → sub-category → service', () => {
    const result = parseClientData(sample)
    expect(result).toHaveLength(2)
    expect(result[0].slug).toBe('visa')
    expect(result[1].slug).toBe('accounting-tax')
  })

  it('groups sub-categories within a category', () => {
    const visa = parseClientData(sample).find((c) => c.slug === 'visa')!
    expect(visa.subCategories).toHaveLength(2)
    expect(visa.subCategories.map((s) => s.slug)).toEqual([
      'investor-kitas',
      'working-remote-kitas',
    ])
  })

  it('groups services within a sub-category', () => {
    const visa = parseClientData(sample).find((c) => c.slug === 'visa')!
    const investorKitas = visa.subCategories.find((s) => s.slug === 'investor-kitas')!
    expect(investorKitas.services).toHaveLength(2)
    expect(investorKitas.services[0].slug).toBe('investor-kitas-2-years')
    expect(investorKitas.services[1].slug).toBe('investor-kitas-1-year')
  })

  it('maps service fields including optional realTimeWork', () => {
    const accounting = parseClientData(sample).find((c) => c.slug === 'accounting-tax')!
    const svc = accounting.subCategories[0].services[0]
    expect(svc.name.en).toBe('Monthly Bookkeeping')
    expect(svc.description?.en).toBe('Monthly book closing.')
    expect(svc.targetClient?.en).toBe('SMEs')
    expect(svc.keyDeliverables?.en).toBe('Monthly Reports')
    expect(svc.estimatedTimeline?.en).toBe('Ongoing')
    expect(svc.realTimeWork?.en).toBe('2 days/month')
  })

  it('omits realTimeWork when absent on the row', () => {
    const visa = parseClientData(sample).find((c) => c.slug === 'visa')!
    const svc = visa.subCategories[0].services[0]
    expect(svc.realTimeWork).toBeNull()
  })

  it('assigns deterministic sortOrder by appearance', () => {
    const visa = parseClientData(sample).find((c) => c.slug === 'visa')!
    expect(visa.sortOrder).toBe(0)
    expect(visa.subCategories[0].sortOrder).toBe(0)
    expect(visa.subCategories[1].sortOrder).toBe(1)
    expect(visa.subCategories[0].services[0].sortOrder).toBe(0)
    expect(visa.subCategories[0].services[1].sortOrder).toBe(1)
  })

  it('returns empty array for empty input', () => {
    expect(parseClientData([])).toEqual([])
  })
})
```

- [ ] **Step 3: Run tests — verify they fail**

Run: `npm test -- parseClientData`
Expected: FAIL — module `@scripts/lib/parseClientData` not found.

- [ ] **Step 4: Implement the parser**

Create `scripts/lib/parseClientData.ts`:

```typescript
import { toSlug } from './normalize'
import type {
  ClientDataRow,
  ParsedCategory,
  ParsedSubCategory,
  ParsedService,
} from './types'

function maybeLocalized(value: string | undefined): { en: string } | null {
  const trimmed = value?.trim()
  if (!trimmed) return null
  return { en: trimmed }
}

export function parseClientData(rows: ClientDataRow[]): ParsedCategory[] {
  const categories = new Map<string, ParsedCategory>()

  for (const row of rows) {
    const categoryName = row.Category?.trim()
    const subCategoryName = row['Sub-Category']?.trim()
    const serviceName = row['Service Name']?.trim()
    if (!categoryName || !subCategoryName || !serviceName) continue

    const categorySlug = toSlug(categoryName)
    let category = categories.get(categorySlug)
    if (!category) {
      category = {
        slug: categorySlug,
        name: { en: categoryName },
        tagline: null,
        iconName: null,
        accentColor: null,
        sortOrder: categories.size,
        subCategories: [],
      }
      categories.set(categorySlug, category)
    }

    const subCategorySlug = toSlug(subCategoryName)
    let subCategory: ParsedSubCategory | undefined = category.subCategories.find(
      (sc) => sc.slug === subCategorySlug
    )
    if (!subCategory) {
      subCategory = {
        slug: subCategorySlug,
        name: { en: subCategoryName },
        sortOrder: category.subCategories.length,
        services: [],
      }
      category.subCategories.push(subCategory)
    }

    const service: ParsedService = {
      slug: toSlug(serviceName),
      name: { en: serviceName },
      description: maybeLocalized(row.Description),
      targetClient: maybeLocalized(row['Target Client']),
      keyDeliverables: maybeLocalized(row['Key Deliverables / Outcome']),
      estimatedTimeline: maybeLocalized(row['Estimated Timeline']),
      realTimeWork: maybeLocalized(row['Real time work']),
      sortOrder: subCategory.services.length,
    }
    subCategory.services.push(service)
  }

  return Array.from(categories.values())
}
```

- [ ] **Step 5: Run tests — verify they pass**

Run: `npm test -- parseClientData`
Expected: PASS — 7 tests passing.

- [ ] **Step 6: Commit**

```bash
git add scripts/lib/types.ts scripts/lib/parseClientData.ts tests/parseClientData.test.ts
git commit -m "feat(import): parse client JSON into category tree"
```

---

## Task 4: seed.sql fallback parser (TDD)

For the 4 categories the client hasn't fully delivered (Insurance, Property, HR & Payroll, Company Setup partially), we still want to populate Sanity with their existing icon names, accent colors, taglines, sub-category slugs, and any services already seeded. The parser pulls only those structural/metadata fields from `supabase/seed.sql`.

**Files:**
- Create: `tests/parseSeedSql.test.ts`
- Create: `scripts/lib/parseSeedSql.ts`

- [ ] **Step 1: Write failing tests**

Create `tests/parseSeedSql.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { parseSeedSqlCategories } from '@scripts/lib/parseSeedSql'

const seedSql = `
-- Comment
INSERT INTO public.categories (slug, name, tagline, icon_name, sort_order) VALUES
  ('visa', 'Visa & Immigration', 'Your gateway to legal residency in Indonesia.', 'Plane', 0),
  ('legal', 'Legal & Contracts', 'Expert legal frameworks for confident business.', 'Scale', 1),
  ('insurance', 'Insurance', 'Protect what you''ve built.', 'Shield', 3);

INSERT INTO public.sub_categories (category_id, slug, name, sort_order) VALUES
  ((SELECT id FROM public.categories WHERE slug='visa'), 'investor-kitas', 'Investor KITAS', 0),
  ((SELECT id FROM public.categories WHERE slug='visa'), 'visit-visas', 'Visit Visas', 3);
`

describe('parseSeedSqlCategories', () => {
  it('extracts categories with metadata', () => {
    const result = parseSeedSqlCategories(seedSql)
    expect(result).toHaveLength(3)
    const visa = result.find((c) => c.slug === 'visa')!
    expect(visa.name).toBe('Visa & Immigration')
    expect(visa.tagline).toBe('Your gateway to legal residency in Indonesia.')
    expect(visa.iconName).toBe('Plane')
    expect(visa.sortOrder).toBe(0)
  })

  it('handles SQL-escaped single quotes', () => {
    const insurance = parseSeedSqlCategories(seedSql).find((c) => c.slug === 'insurance')!
    expect(insurance.tagline).toBe("Protect what you've built.")
  })

  it('groups sub-categories under their parent', () => {
    const visa = parseSeedSqlCategories(seedSql).find((c) => c.slug === 'visa')!
    expect(visa.subCategorySlugs).toEqual([
      { slug: 'investor-kitas', name: 'Investor KITAS', sortOrder: 0 },
      { slug: 'visit-visas', name: 'Visit Visas', sortOrder: 3 },
    ])
  })

  it('returns empty array when no INSERT found', () => {
    expect(parseSeedSqlCategories('-- empty')).toEqual([])
  })
})
```

- [ ] **Step 2: Add types**

Append to `scripts/lib/types.ts`:

```typescript
export interface SeedSqlSubCategory {
  slug: string
  name: string
  sortOrder: number
}

export interface SeedSqlCategory {
  slug: string
  name: string
  tagline: string | null
  iconName: string | null
  sortOrder: number
  subCategorySlugs: SeedSqlSubCategory[]
}
```

- [ ] **Step 3: Run tests — verify they fail**

Run: `npm test -- parseSeedSql`
Expected: FAIL — module not found.

- [ ] **Step 4: Implement the parser**

Create `scripts/lib/parseSeedSql.ts`:

```typescript
import type { SeedSqlCategory, SeedSqlSubCategory } from './types'

/**
 * Minimal SQL VALUES-tuple extractor for the specific format used in seed.sql.
 * Only handles single-quoted string literals (with '' as escaped quote) and
 * unquoted numeric literals. Sufficient for our hand-written seed file —
 * not a general SQL parser.
 */
function extractValuesTuples(insertBlock: string): string[][] {
  const tuples: string[][] = []
  // Match each parenthesised tuple in the VALUES list.
  const tupleRegex = /\(((?:'(?:[^']|'')*'|[^()'])*)\)/g
  let match: RegExpExecArray | null
  while ((match = tupleRegex.exec(insertBlock)) !== null) {
    const inner = match[1]
    const fields: string[] = []
    let i = 0
    while (i < inner.length) {
      // skip whitespace and commas
      while (i < inner.length && /[\s,]/.test(inner[i])) i++
      if (i >= inner.length) break
      if (inner[i] === "'") {
        // string literal
        let s = ''
        i++ // opening quote
        while (i < inner.length) {
          if (inner[i] === "'" && inner[i + 1] === "'") {
            s += "'"
            i += 2
          } else if (inner[i] === "'") {
            i++
            break
          } else {
            s += inner[i]
            i++
          }
        }
        fields.push(s)
      } else {
        // unquoted token (number)
        let s = ''
        while (i < inner.length && !/[\s,]/.test(inner[i])) {
          s += inner[i]
          i++
        }
        fields.push(s)
      }
    }
    tuples.push(fields)
  }
  return tuples
}

function findInsertBlock(sql: string, tableName: string): string | null {
  const re = new RegExp(
    `INSERT\\s+INTO\\s+(?:public\\.)?${tableName}\\s*\\([^)]*\\)\\s*VALUES\\s*([\\s\\S]*?);`,
    'i'
  )
  const m = sql.match(re)
  return m ? m[1] : null
}

export function parseSeedSqlCategories(sql: string): SeedSqlCategory[] {
  const catBlock = findInsertBlock(sql, 'categories')
  if (!catBlock) return []
  const catTuples = extractValuesTuples(catBlock)

  const categories: SeedSqlCategory[] = catTuples.map((t) => ({
    slug: t[0],
    name: t[1],
    tagline: t[2] ?? null,
    iconName: t[3] ?? null,
    sortOrder: Number(t[4] ?? 0),
    subCategorySlugs: [],
  }))

  const subBlock = findInsertBlock(sql, 'sub_categories')
  if (subBlock) {
    // Sub-category rows have the shape:
    //   ((SELECT id FROM categories WHERE slug='X'), 'sub-slug', 'Name', N)
    // The nested SELECT confuses the generic tuple extractor, so we use a
    // targeted regex that captures the parent slug + the four trailing fields.
    const rowRe =
      /WHERE\s+slug\s*=\s*'([^']+)'\s*\)\s*,\s*'([^']+)'\s*,\s*'((?:[^']|'')*)'\s*,\s*(\d+)/g
    let m: RegExpExecArray | null
    while ((m = rowRe.exec(subBlock)) !== null) {
      const parentSlug = m[1]
      const sub: SeedSqlSubCategory = {
        slug: m[2],
        name: m[3].replace(/''/g, "'"),
        sortOrder: Number(m[4]),
      }
      const parent = categories.find((c) => c.slug === parentSlug)
      if (parent) parent.subCategorySlugs.push(sub)
    }
  }

  return categories
}
```

- [ ] **Step 5: Run tests — verify they pass**

Run: `npm test -- parseSeedSql`
Expected: PASS — 4 tests passing.

- [ ] **Step 6: Commit**

```bash
git add scripts/lib/parseSeedSql.ts tests/parseSeedSql.test.ts scripts/lib/types.ts
git commit -m "feat(import): parse seed.sql fallback rows"
```

---

## Task 5: Initialize Sanity project

This is a manual one-time wizard. The engineer (or you) needs a Sanity account.

**Files:**
- Modify: `package.json` (Sanity adds these automatically)
- Create: `sanity.config.ts` (initial — overwritten in Task 6)
- Create: `sanity.cli.ts`
- Create: `.env.example`
- Modify: `.env.local` (add new keys, do **not** commit)

- [ ] **Step 1: Install Sanity packages**

```bash
npm install sanity @sanity/vision @sanity/client next-sanity styled-components
```

- [ ] **Step 2: Run the Sanity init wizard**

```bash
npx sanity@latest init --env --create-project "Ilot Legal" --dataset production --typescript --output-path .
```

When prompted:
- Login → Google or GitHub
- Use TypeScript: yes
- Use the default schema template? **No** (we'll define our own)

This generates `sanity.config.ts`, `sanity.cli.ts`, populates `.env.local` with `NEXT_PUBLIC_SANITY_PROJECT_ID` and `NEXT_PUBLIC_SANITY_DATASET`.

- [ ] **Step 3: Generate a write token**

In the Sanity project dashboard (sanity.io/manage):
- API → Tokens → "Add API token"
- Name: `importer` — Permissions: `Editor`
- Copy the token value.

Add to `.env.local`:

```
SANITY_API_WRITE_TOKEN=<paste-token-here>
```

- [ ] **Step 4: Add CORS origin for the Studio**

In sanity.io/manage → API → CORS origins, add:
- `http://localhost:3000` — Allow credentials: yes
- `http://localhost:3003` — Allow credentials: yes
- (production URL when deployed)

- [ ] **Step 5: Create `.env.example` documenting required vars**

Create `.env.example`:

```
# Supabase (legacy; still used for client setup but unused at runtime after Phase 1 cutover)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Sanity
NEXT_PUBLIC_SANITY_PROJECT_ID=
NEXT_PUBLIC_SANITY_DATASET=production
SANITY_API_WRITE_TOKEN=
```

- [ ] **Step 6: Verify `.env.local` is git-ignored**

Confirm `.env.local` matches an entry in `.gitignore`. If not, add `.env.local` to `.gitignore` and commit.

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json sanity.config.ts sanity.cli.ts .env.example .gitignore
git commit -m "chore: initialize sanity project and env scaffolding"
```

---

## Task 6: Sanity schemas (object helpers)

**Files:**
- Create: `src/sanity/env.ts`
- Create: `src/sanity/schemas/objects/localizedString.ts`
- Create: `src/sanity/schemas/objects/localizedText.ts`
- Create: `src/sanity/schemas/objects/seoFields.ts`

- [ ] **Step 1: Create env helper**

Create `src/sanity/env.ts`:

```typescript
export const apiVersion = '2024-10-01'

export const dataset = assertValue(
  process.env.NEXT_PUBLIC_SANITY_DATASET,
  'Missing environment variable: NEXT_PUBLIC_SANITY_DATASET'
)

export const projectId = assertValue(
  process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  'Missing environment variable: NEXT_PUBLIC_SANITY_PROJECT_ID'
)

export const useCdn = false

function assertValue<T>(v: T | undefined, errorMessage: string): T {
  if (v === undefined) throw new Error(errorMessage)
  return v
}
```

- [ ] **Step 2: Create `localizedString` object schema**

Create `src/sanity/schemas/objects/localizedString.ts`:

```typescript
import { defineType, defineField } from 'sanity'

export const localizedString = defineType({
  name: 'localizedString',
  title: 'Localized String',
  type: 'object',
  fields: [
    defineField({
      name: 'en',
      title: 'English',
      type: 'string',
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'id',
      title: 'Bahasa Indonesia',
      type: 'string',
    }),
  ],
})
```

- [ ] **Step 3: Create `localizedText` object schema**

Create `src/sanity/schemas/objects/localizedText.ts`:

```typescript
import { defineType, defineField } from 'sanity'

export const localizedText = defineType({
  name: 'localizedText',
  title: 'Localized Text',
  type: 'object',
  fields: [
    defineField({
      name: 'en',
      title: 'English',
      type: 'text',
      rows: 4,
    }),
    defineField({
      name: 'id',
      title: 'Bahasa Indonesia',
      type: 'text',
      rows: 4,
    }),
  ],
})
```

- [ ] **Step 4: Create `seoFields` object schema**

Create `src/sanity/schemas/objects/seoFields.ts`:

```typescript
import { defineType, defineField } from 'sanity'

export const seoFields = defineType({
  name: 'seoFields',
  title: 'SEO',
  type: 'object',
  options: { collapsible: true, collapsed: true },
  fields: [
    defineField({
      name: 'metaTitle',
      title: 'Meta Title (overrides default)',
      type: 'localizedString',
    }),
    defineField({
      name: 'metaDescription',
      title: 'Meta Description (overrides default)',
      type: 'localizedText',
    }),
  ],
})
```

- [ ] **Step 5: Commit**

```bash
git add src/sanity/env.ts src/sanity/schemas/objects/
git commit -m "feat(sanity): add localized object schemas"
```

---

## Task 7: Sanity schemas (documents)

**Files:**
- Create: `src/sanity/schemas/documents/category.ts`
- Create: `src/sanity/schemas/documents/subCategory.ts`
- Create: `src/sanity/schemas/documents/service.ts`
- Create: `src/sanity/schemas/index.ts`

- [ ] **Step 1: Create `category` schema**

Create `src/sanity/schemas/documents/category.ts`:

```typescript
import { defineType, defineField } from 'sanity'

export const category = defineType({
  name: 'category',
  title: 'Category',
  type: 'document',
  fields: [
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: {
        source: (doc: any) => doc?.name?.en ?? '',
        maxLength: 96,
      },
      validation: (r) => r.required(),
    }),
    defineField({ name: 'name', title: 'Name', type: 'localizedString', validation: (r) => r.required() }),
    defineField({ name: 'tagline', title: 'Tagline', type: 'localizedString' }),
    defineField({
      name: 'iconName',
      title: 'Icon (Lucide name)',
      type: 'string',
      description: 'Exact name from lucide.dev — e.g. "Plane", "Scale", "Building2".',
    }),
    defineField({ name: 'coverImage', title: 'Cover Image', type: 'image', options: { hotspot: true } }),
    defineField({
      name: 'accentColor',
      title: 'Accent Color (hex)',
      type: 'string',
      description: 'Dark accent hex, e.g. #1e3a8a',
      validation: (r) =>
        r.regex(/^#[0-9a-fA-F]{6}$/, { name: 'hex color' }).warning('Should be a 6-digit hex like #1e3a8a'),
    }),
    defineField({ name: 'tintColor', title: 'Tint Color (hex, optional)', type: 'string' }),
    defineField({ name: 'midColor', title: 'Mid Color (hex, optional)', type: 'string' }),
    defineField({ name: 'sortOrder', title: 'Sort Order', type: 'number', initialValue: 0 }),
    defineField({ name: 'isActive', title: 'Active', type: 'boolean', initialValue: true }),
  ],
  preview: {
    select: { title: 'name.en', subtitle: 'slug.current' },
  },
  orderings: [
    { title: 'Sort order', name: 'sortOrderAsc', by: [{ field: 'sortOrder', direction: 'asc' }] },
  ],
})
```

- [ ] **Step 2: Create `subCategory` schema**

Create `src/sanity/schemas/documents/subCategory.ts`:

```typescript
import { defineType, defineField } from 'sanity'

export const subCategory = defineType({
  name: 'subCategory',
  title: 'Sub-Category',
  type: 'document',
  fields: [
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: { source: (doc: any) => doc?.name?.en ?? '', maxLength: 96 },
      validation: (r) => r.required(),
    }),
    defineField({ name: 'name', title: 'Name', type: 'localizedString', validation: (r) => r.required() }),
    defineField({
      name: 'category',
      title: 'Parent Category',
      type: 'reference',
      to: [{ type: 'category' }],
      validation: (r) => r.required(),
    }),
    defineField({ name: 'sortOrder', title: 'Sort Order', type: 'number', initialValue: 0 }),
    defineField({ name: 'isActive', title: 'Active', type: 'boolean', initialValue: true }),
  ],
  preview: {
    select: { title: 'name.en', subtitle: 'category.name.en' },
  },
})
```

- [ ] **Step 3: Create `service` schema**

Create `src/sanity/schemas/documents/service.ts`:

```typescript
import { defineType, defineField } from 'sanity'

export const service = defineType({
  name: 'service',
  title: 'Service',
  type: 'document',
  fields: [
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: { source: (doc: any) => doc?.name?.en ?? '', maxLength: 96 },
      validation: (r) => r.required(),
    }),
    defineField({ name: 'name', title: 'Name', type: 'localizedString', validation: (r) => r.required() }),
    defineField({
      name: 'category',
      title: 'Category',
      type: 'reference',
      to: [{ type: 'category' }],
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'subCategory',
      title: 'Sub-Category',
      type: 'reference',
      to: [{ type: 'subCategory' }],
    }),
    defineField({ name: 'description', title: 'Description', type: 'localizedText' }),
    defineField({ name: 'targetClient', title: 'Target Client', type: 'localizedString' }),
    defineField({ name: 'keyDeliverables', title: 'Key Deliverables / Outcome', type: 'localizedText' }),
    defineField({ name: 'estimatedTimeline', title: 'Estimated Timeline', type: 'localizedString' }),
    defineField({ name: 'realTimeWork', title: 'Real-Time Work', type: 'localizedString' }),
    defineField({ name: 'whatsappMessage', title: 'WhatsApp Pre-filled Message', type: 'localizedText' }),
    defineField({ name: 'seo', title: 'SEO', type: 'seoFields' }),
    defineField({ name: 'sortOrder', title: 'Sort Order', type: 'number', initialValue: 0 }),
    defineField({ name: 'isActive', title: 'Active', type: 'boolean', initialValue: true }),
  ],
  preview: {
    select: { title: 'name.en', subtitle: 'category.name.en' },
  },
})
```

- [ ] **Step 4: Create schema barrel**

Create `src/sanity/schemas/index.ts`:

```typescript
import { localizedString } from './objects/localizedString'
import { localizedText } from './objects/localizedText'
import { seoFields } from './objects/seoFields'
import { category } from './documents/category'
import { subCategory } from './documents/subCategory'
import { service } from './documents/service'

export const schemaTypes = [
  // objects
  localizedString,
  localizedText,
  seoFields,
  // documents
  category,
  subCategory,
  service,
]
```

- [ ] **Step 5: Commit**

```bash
git add src/sanity/schemas/
git commit -m "feat(sanity): add category, subCategory, service document schemas"
```

---

## Task 8: Studio structure (tree-style nesting) and config

**Files:**
- Create: `src/sanity/structure.ts`
- Modify: `sanity.config.ts`

- [ ] **Step 1: Create the structure builder**

Create `src/sanity/structure.ts`:

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
      S.documentTypeListItem('subCategory').title('All Sub-Categories'),
      S.documentTypeListItem('service').title('All Services'),
    ])
```

- [ ] **Step 2: Replace `sanity.config.ts`**

Overwrite `sanity.config.ts` with:

```typescript
import { defineConfig } from 'sanity'
import { structureTool } from 'sanity/structure'
import { visionTool } from '@sanity/vision'
import { schemaTypes } from './src/sanity/schemas'
import { structure } from './src/sanity/structure'
import { apiVersion, dataset, projectId } from './src/sanity/env'

export default defineConfig({
  name: 'default',
  title: 'Ilot CMS',
  basePath: '/studio',
  projectId,
  dataset,
  plugins: [structureTool({ structure }), visionTool({ defaultApiVersion: apiVersion })],
  schema: { types: schemaTypes },
})
```

- [ ] **Step 3: Commit**

```bash
git add src/sanity/structure.ts sanity.config.ts
git commit -m "feat(sanity): add tree-style studio structure"
```

---

## Task 9: Mount Studio at `/studio`

**Files:**
- Create: `src/app/studio/[[...tool]]/page.tsx`
- Modify: `next.config.ts`

- [ ] **Step 1: Create Studio route**

Create `src/app/studio/[[...tool]]/page.tsx`:

```typescript
'use client'

import { NextStudio } from 'next-sanity/studio'
import config from '../../../../sanity.config'

export const dynamic = 'force-static'
export { metadata, viewport } from 'next-sanity/studio'

export default function StudioPage() {
  return <NextStudio config={config} />
}
```

- [ ] **Step 2: Allow Sanity image CDN in `next.config.ts`**

Read current `next.config.ts`. If it does not have `images.remotePatterns`, add it. The final file should look like:

```typescript
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'cdn.sanity.io' },
    ],
  },
}

export default nextConfig
```

(If `next.config.ts` has other config, merge `images.remotePatterns` into it, preserving existing settings.)

- [ ] **Step 3: Run dev server**

```bash
npm run dev -- --port 3003
```

Open `http://localhost:3003/studio` in a browser. Expected:
- Sanity Studio UI loads
- Login screen → log in with the same account used in Task 5
- Sidebar shows "Categories", "All Sub-Categories", "All Services"
- Clicking "Categories" shows an empty list (no docs yet) with a "Create" button at the top

- [ ] **Step 4: Stop the dev server**

- [ ] **Step 5: Commit**

```bash
git add src/app/studio next.config.ts
git commit -m "feat(sanity): mount studio at /studio"
```

---

## Task 10: Sanity write client and idempotent upserter

**Files:**
- Create: `src/sanity/lib/writeClient.ts`
- Create: `scripts/lib/sanityWriter.ts`

- [ ] **Step 1: Create write client**

Create `src/sanity/lib/writeClient.ts`:

```typescript
import 'server-only'
import { createClient } from '@sanity/client'
import { apiVersion, dataset, projectId } from '../env'

export const writeClient = createClient({
  projectId,
  dataset,
  apiVersion,
  token: process.env.SANITY_API_WRITE_TOKEN,
  useCdn: false,
})
```

- [ ] **Step 2: Create the upserter**

The importer needs to:
- Upsert categories first (by slug → stable `_id` like `category-${slug}`)
- Upsert sub-categories with reference to parent category
- Upsert services with references to category and sub-category

We use deterministic `_id`s so re-runs are idempotent.

Create `scripts/lib/sanityWriter.ts`:

```typescript
import type { SanityClient } from '@sanity/client'
import type { ParsedCategory, SeedSqlCategory } from './types'

export interface WriteOptions {
  client: SanityClient
  dryRun: boolean
  log: (msg: string) => void
}

const categoryId = (slug: string) => `category-${slug}`
const subCategoryId = (categorySlug: string, subSlug: string) =>
  `subCategory-${categorySlug}-${subSlug}`
const serviceId = (slug: string) => `service-${slug}`

export async function upsertCategories(
  parsed: ParsedCategory[],
  fallback: SeedSqlCategory[],
  opts: WriteOptions
): Promise<void> {
  const { client, dryRun, log } = opts

  // Pass 1: categories
  for (const cat of parsed) {
    const fb = fallback.find((f) => f.slug === cat.slug)
    const doc = {
      _id: categoryId(cat.slug),
      _type: 'category',
      slug: { _type: 'slug', current: cat.slug },
      name: cat.name,
      tagline: fb?.tagline ? { en: fb.tagline } : null,
      iconName: fb?.iconName ?? null,
      sortOrder: cat.sortOrder,
      isActive: true,
    }
    log(`category: ${cat.slug}`)
    if (!dryRun) await client.createOrReplace(doc)
  }

  // Also upsert fallback-only categories (those not in parsed input)
  for (const fb of fallback) {
    if (parsed.find((p) => p.slug === fb.slug)) continue
    const doc = {
      _id: categoryId(fb.slug),
      _type: 'category',
      slug: { _type: 'slug', current: fb.slug },
      name: { en: fb.name },
      tagline: fb.tagline ? { en: fb.tagline } : null,
      iconName: fb.iconName ?? null,
      sortOrder: fb.sortOrder,
      isActive: true,
    }
    log(`category (fallback only): ${fb.slug}`)
    if (!dryRun) await client.createOrReplace(doc)
  }

  // Pass 2: sub-categories from parsed input
  for (const cat of parsed) {
    for (const sub of cat.subCategories) {
      const doc = {
        _id: subCategoryId(cat.slug, sub.slug),
        _type: 'subCategory',
        slug: { _type: 'slug', current: sub.slug },
        name: sub.name,
        category: { _type: 'reference', _ref: categoryId(cat.slug) },
        sortOrder: sub.sortOrder,
        isActive: true,
      }
      log(`  subCategory: ${cat.slug}/${sub.slug}`)
      if (!dryRun) await client.createOrReplace(doc)
    }
  }

  // Pass 2b: sub-categories from fallback (only for categories NOT in parsed)
  for (const fb of fallback) {
    if (parsed.find((p) => p.slug === fb.slug)) continue
    for (const sub of fb.subCategorySlugs) {
      const doc = {
        _id: subCategoryId(fb.slug, sub.slug),
        _type: 'subCategory',
        slug: { _type: 'slug', current: sub.slug },
        name: { en: sub.name },
        category: { _type: 'reference', _ref: categoryId(fb.slug) },
        sortOrder: sub.sortOrder,
        isActive: true,
      }
      log(`  subCategory (fallback): ${fb.slug}/${sub.slug}`)
      if (!dryRun) await client.createOrReplace(doc)
    }
  }

  // Pass 3: services
  for (const cat of parsed) {
    for (const sub of cat.subCategories) {
      for (const svc of sub.services) {
        const doc = {
          _id: serviceId(svc.slug),
          _type: 'service',
          slug: { _type: 'slug', current: svc.slug },
          name: svc.name,
          category: { _type: 'reference', _ref: categoryId(cat.slug) },
          subCategory: {
            _type: 'reference',
            _ref: subCategoryId(cat.slug, sub.slug),
          },
          description: svc.description,
          targetClient: svc.targetClient,
          keyDeliverables: svc.keyDeliverables,
          estimatedTimeline: svc.estimatedTimeline,
          realTimeWork: svc.realTimeWork,
          sortOrder: svc.sortOrder,
          isActive: true,
        }
        log(`    service: ${svc.slug}`)
        if (!dryRun) await client.createOrReplace(doc)
      }
    }
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/sanity/lib/writeClient.ts scripts/lib/sanityWriter.ts
git commit -m "feat(import): idempotent upsert by deterministic _id"
```

---

## Task 11: Importer entrypoint with dry-run

**Files:**
- Create: `scripts/import-to-sanity.ts`
- Modify: `package.json` (add script)

- [ ] **Step 1: Create the entrypoint**

Create `scripts/import-to-sanity.ts`:

```typescript
/**
 * One-time import script: client JSON + seed.sql → Sanity.
 * Run with: `npm run import:sanity` (real) or `npm run import:sanity -- --dry-run` (preview).
 */
import 'dotenv/config'
import fs from 'node:fs'
import path from 'node:path'
import { createClient } from '@sanity/client'
import { parseClientData } from './lib/parseClientData'
import { parseSeedSqlCategories } from './lib/parseSeedSql'
import { upsertCategories } from './lib/sanityWriter'
import type { ClientDataRow } from './lib/types'

const DRY_RUN = process.argv.includes('--dry-run')
const ROOT = path.resolve(__dirname, '..')
const CLIENT_DATA_PATH = path.join(ROOT, 'docs/seed-data-raw.json')
const SEED_SQL_PATH = path.join(ROOT, 'supabase/seed.sql')

function requireEnv(name: string): string {
  const v = process.env[name]
  if (!v) throw new Error(`Missing env var ${name}`)
  return v
}

async function main() {
  const projectId = requireEnv('NEXT_PUBLIC_SANITY_PROJECT_ID')
  const dataset = requireEnv('NEXT_PUBLIC_SANITY_DATASET')
  const token = requireEnv('SANITY_API_WRITE_TOKEN')

  const client = createClient({
    projectId,
    dataset,
    apiVersion: '2024-10-01',
    token,
    useCdn: false,
  })

  const clientRows: ClientDataRow[] = JSON.parse(
    fs.readFileSync(CLIENT_DATA_PATH, 'utf8')
  )
  const seedSql = fs.readFileSync(SEED_SQL_PATH, 'utf8')

  const parsed = parseClientData(clientRows)
  const fallback = parseSeedSqlCategories(seedSql)

  console.log(
    `Parsed ${parsed.length} client categories, ${fallback.length} seed categories.`
  )
  console.log(DRY_RUN ? '— DRY RUN —' : '— WRITING TO SANITY —')

  await upsertCategories(parsed, fallback, {
    client,
    dryRun: DRY_RUN,
    log: (m) => console.log(m),
  })

  console.log('Done.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
```

- [ ] **Step 2: Install dotenv and ts execution support**

```bash
npm install --save-dev dotenv tsx
```

- [ ] **Step 3: Add npm scripts**

In `package.json` `scripts`:

```json
"import:sanity": "tsx scripts/import-to-sanity.ts",
"import:sanity:dry": "tsx scripts/import-to-sanity.ts --dry-run"
```

- [ ] **Step 4: Run dry-run**

```bash
npm run import:sanity:dry
```

Expected output:
- `Parsed N client categories, M seed categories.`
- `— DRY RUN —`
- A list of `category:`, `  subCategory:`, `    service:` lines
- `Done.`
- No documents created in Sanity

Verify by visiting `http://localhost:3003/studio` (start dev server in another terminal): the Categories list should still be empty.

- [ ] **Step 5: Commit**

```bash
git add scripts/import-to-sanity.ts package.json package-lock.json
git commit -m "feat(import): add importer entrypoint with dry-run mode"
```

---

## Task 12: Run the import

- [ ] **Step 1: Run the real import**

```bash
npm run import:sanity
```

Expected:
- Same logs as dry-run, but with documents written
- No errors
- `Done.` at the end

- [ ] **Step 2: Verify in Studio**

Start dev server: `npm run dev -- --port 3003`

Open `http://localhost:3003/studio`:
- Click "Categories" — see all 7 categories listed in sort order
- Click into a category (e.g. "Visa & Immigration") → "Sub-Categories" → see expected sub-categories
- Click a sub-category → "Services" → see expected services
- Open a service → its `description`, `targetClient`, `keyDeliverables`, `estimatedTimeline`, and (where present) `realTimeWork` are populated in the EN field

- [ ] **Step 3: Re-run import to confirm idempotency**

```bash
npm run import:sanity
```

Expected: same output, no errors, documents in Studio remain identical (no duplicates created).

- [ ] **Step 4: No commit needed (data lives in Sanity, not the repo)**

---

## Task 13: Sanity read client and GROQ queries

This task creates the read client and the GROQ query strings that will replace Supabase queries. The GROQ projections rename Sanity's camelCase fields back to snake_case so existing TS types (`Category`, `SubCategory`, `Service` in `src/lib/db/types.ts`) and all consumers stay unchanged.

**Files:**
- Create: `src/sanity/lib/client.ts`
- Create: `src/sanity/lib/queries.ts`

- [ ] **Step 1: Create the read client**

Create `src/sanity/lib/client.ts`:

```typescript
import { createClient } from '@sanity/client'
import { apiVersion, dataset, projectId, useCdn } from '../env'

export const sanityClient = createClient({
  projectId,
  dataset,
  apiVersion,
  useCdn,
  perspective: 'published',
})
```

- [ ] **Step 2: Create the GROQ queries**

Create `src/sanity/lib/queries.ts`:

```typescript
import groq from 'groq'

/**
 * GROQ projections rename camelCase fields → snake_case to preserve
 * the existing TS types in src/lib/db/types.ts and avoid touching consumers.
 * Localized fields fall back to EN when the requested locale is empty.
 */

const CATEGORY_PROJECTION = groq`
  "id": _id,
  "slug": slug.current,
  "name": coalesce(name.en, ""),
  "tagline": coalesce(tagline.en, null),
  "icon_name": iconName,
  "image_url": coverImage.asset->url,
  "color_accent": accentColor,
  "sort_order": sortOrder,
  "is_active": isActive,
  "created_at": _createdAt
`

const SUB_CATEGORY_PROJECTION = groq`
  "id": _id,
  "category_id": category._ref,
  "slug": slug.current,
  "name": coalesce(name.en, ""),
  "sort_order": sortOrder,
  "is_active": isActive
`

const SERVICE_PROJECTION = groq`
  "id": _id,
  "category_id": category._ref,
  "sub_category_id": subCategory._ref,
  "slug": slug.current,
  "name": coalesce(name.en, ""),
  "description": coalesce(description.en, null),
  "target_client": coalesce(targetClient.en, null),
  "key_deliverables": coalesce(keyDeliverables.en, null),
  "estimated_timeline": coalesce(estimatedTimeline.en, null),
  "real_time_work": coalesce(realTimeWork.en, null),
  "whatsapp_message": coalesce(whatsappMessage.en, null),
  "meta_title": coalesce(seo.metaTitle.en, null),
  "meta_description": coalesce(seo.metaDescription.en, null),
  "sort_order": sortOrder,
  "is_active": isActive,
  "created_at": _createdAt,
  "updated_at": _updatedAt
`

export const categoriesQuery = groq`
  *[_type == "category" && isActive == true] | order(sortOrder asc) {
    ${CATEGORY_PROJECTION}
  }
`

export const categoryBySlugQuery = groq`
  *[_type == "category" && slug.current == $slug && isActive == true][0] {
    ${CATEGORY_PROJECTION},
    "sub_categories": *[_type == "subCategory" && category._ref == ^._id && isActive == true] | order(sortOrder asc) {
      ${SUB_CATEGORY_PROJECTION},
      "services": *[_type == "service" && subCategory._ref == ^._id && isActive == true] | order(sortOrder asc) {
        ${SERVICE_PROJECTION}
      }
    }
  }
`

export const categoriesWithNavQuery = groq`
  *[_type == "category" && isActive == true] | order(sortOrder asc) {
    ${CATEGORY_PROJECTION},
    "sub_categories": *[_type == "subCategory" && category._ref == ^._id && isActive == true] | order(sortOrder asc) {
      ${SUB_CATEGORY_PROJECTION},
      "services": *[_type == "service" && subCategory._ref == ^._id && isActive == true] | order(sortOrder asc) {
        "id": _id,
        "slug": slug.current,
        "name": coalesce(name.en, ""),
        "sub_category_id": subCategory._ref,
        "category_id": category._ref,
        "sort_order": sortOrder,
        "is_active": isActive
      }
    }
  }
`

export const allCategorySlugsQuery = groq`
  *[_type == "category" && isActive == true].slug.current
`
```

- [ ] **Step 3: Commit**

```bash
git add src/sanity/lib/client.ts src/sanity/lib/queries.ts
git commit -m "feat(sanity): add read client and GROQ queries"
```

---

## Task 14: Rewrite `src/lib/db/categories.ts` to use Sanity

**Files:**
- Modify: `src/lib/db/categories.ts`

- [ ] **Step 1: Replace file contents**

Overwrite `src/lib/db/categories.ts`:

```typescript
import { sanityClient } from '@/sanity/lib/client'
import {
  categoriesQuery,
  categoryBySlugQuery,
  categoriesWithNavQuery,
  allCategorySlugsQuery,
} from '@/sanity/lib/queries'
import type { Category, CategoryWithSubCategories } from './types'

export async function getCategories(): Promise<Category[]> {
  try {
    const data = await sanityClient.fetch<Category[]>(
      categoriesQuery,
      {},
      { next: { revalidate: 60, tags: ['category'] } }
    )
    return data ?? []
  } catch {
    return []
  }
}

export async function getCategoryBySlug(
  slug: string
): Promise<CategoryWithSubCategories | null> {
  try {
    const data = await sanityClient.fetch<CategoryWithSubCategories | null>(
      categoryBySlugQuery,
      { slug },
      { next: { revalidate: 60, tags: ['category', `category:${slug}`] } }
    )
    return data ?? null
  } catch {
    return null
  }
}

export async function getCategoriesWithNav(): Promise<CategoryWithSubCategories[]> {
  try {
    const data = await sanityClient.fetch<CategoryWithSubCategories[]>(
      categoriesWithNavQuery,
      {},
      { next: { revalidate: 60, tags: ['category', 'subCategory', 'service'] } }
    )
    return data ?? []
  } catch {
    return []
  }
}

export async function getAllCategorySlugs(): Promise<string[]> {
  try {
    const data = await sanityClient.fetch<string[]>(
      allCategorySlugsQuery,
      {},
      { next: { revalidate: 60, tags: ['category'] } }
    )
    return data ?? []
  } catch {
    return []
  }
}
```

- [ ] **Step 2: Verify the existing pages still type-check**

Run: `npx tsc --noEmit`
Expected: no type errors. The TS shapes remain identical because GROQ projections rename fields to snake_case.

- [ ] **Step 3: Run dev server and visual-check category pages**

```bash
npm run dev -- --port 3003
```

Open in browser:
- `http://localhost:3003/` — home page renders, navbar dropdown shows categories
- `http://localhost:3003/visa` — Visa category page renders with sub-categories and services
- `http://localhost:3003/accounting-tax` — Accounting & Tax category renders
- `http://localhost:3003/legal` — Legal category renders
- `http://localhost:3003/insurance` — renders (sparse, only metadata from seed.sql)
- Open another category from the navbar dropdown, confirm navigation works

Expected: pages render without runtime errors. Service cards show titles, descriptions, deliverables, timelines.

If anything is missing:
- Open Studio at `/studio` and verify the data is there for that field
- Check the browser network tab for the Sanity request (look for a 200 with the expected JSON shape)

- [ ] **Step 4: Stop dev server**

- [ ] **Step 5: Commit**

```bash
git add src/lib/db/categories.ts
git commit -m "feat: switch categories data layer to sanity"
```

---

## Task 15: Rewrite `src/lib/db/services.ts` to use Sanity

**Files:**
- Modify: `src/lib/db/services.ts`
- Modify: `src/sanity/lib/queries.ts` (add service queries)

- [ ] **Step 1: Read current `services.ts` to map all functions**

Run: open `src/lib/db/services.ts` and list every exported function. For each, identify the Supabase query it makes and the return shape.

- [ ] **Step 2: Add service-specific GROQ queries**

Append to `src/sanity/lib/queries.ts`:

```typescript
const SERVICE_WITH_CATEGORY_PROJECTION = groq`
  "id": _id,
  "category_id": category._ref,
  "sub_category_id": subCategory._ref,
  "slug": slug.current,
  "name": coalesce(name.en, ""),
  "description": coalesce(description.en, null),
  "target_client": coalesce(targetClient.en, null),
  "key_deliverables": coalesce(keyDeliverables.en, null),
  "estimated_timeline": coalesce(estimatedTimeline.en, null),
  "real_time_work": coalesce(realTimeWork.en, null),
  "whatsapp_message": coalesce(whatsappMessage.en, null),
  "meta_title": coalesce(seo.metaTitle.en, null),
  "meta_description": coalesce(seo.metaDescription.en, null),
  "sort_order": sortOrder,
  "is_active": isActive,
  "created_at": _createdAt,
  "updated_at": _updatedAt,
  "category": {
    "slug": category->slug.current,
    "name": coalesce(category->name.en, ""),
    "color_accent": category->accentColor
  },
  "sub_category": select(
    defined(subCategory) => {
      "slug": subCategory->slug.current,
      "name": coalesce(subCategory->name.en, "")
    },
    null
  )
`

export const serviceBySlugQuery = groq`
  *[_type == "service" && slug.current == $slug && isActive == true][0] {
    ${SERVICE_WITH_CATEGORY_PROJECTION}
  }
`

export const allServiceSlugsQuery = groq`
  *[_type == "service" && isActive == true].slug.current
`

export const servicesByCategoryQuery = groq`
  *[_type == "service" && category->slug.current == $categorySlug && isActive == true]
    | order(sortOrder asc) {
      ${SERVICE_WITH_CATEGORY_PROJECTION}
    }
`
```

- [ ] **Step 3: Rewrite `src/lib/db/services.ts`**

Replace the body of every exported function with a Sanity fetch using the matching query. Keep the function names, parameter lists, and return types identical to the current Supabase version.

Template — apply this pattern per existing function:

```typescript
import { sanityClient } from '@/sanity/lib/client'
import {
  serviceBySlugQuery,
  allServiceSlugsQuery,
  servicesByCategoryQuery,
} from '@/sanity/lib/queries'
import type { Service, ServiceWithCategory } from './types'

export async function getServiceBySlug(
  slug: string
): Promise<ServiceWithCategory | null> {
  try {
    const data = await sanityClient.fetch<ServiceWithCategory | null>(
      serviceBySlugQuery,
      { slug },
      { next: { revalidate: 60, tags: ['service', `service:${slug}`] } }
    )
    return data ?? null
  } catch {
    return null
  }
}

export async function getAllServiceSlugs(): Promise<string[]> {
  try {
    const data = await sanityClient.fetch<string[]>(
      allServiceSlugsQuery,
      {},
      { next: { revalidate: 60, tags: ['service'] } }
    )
    return data ?? []
  } catch {
    return []
  }
}

export async function getServicesByCategory(
  categorySlug: string
): Promise<ServiceWithCategory[]> {
  try {
    const data = await sanityClient.fetch<ServiceWithCategory[]>(
      servicesByCategoryQuery,
      { categorySlug },
      { next: { revalidate: 60, tags: ['service', `category:${categorySlug}`] } }
    )
    return data ?? []
  } catch {
    return []
  }
}
```

If `services.ts` exports functions not covered above, add a corresponding GROQ query in `queries.ts` and a fetch wrapper in `services.ts` following the same pattern. The original Supabase function tells you what to filter and what to return.

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Visual smoke test**

Start dev server, open a service page (e.g. `http://localhost:3003/visa/investor-kitas-2-years` — adjust path to whatever route the project uses for service detail). Confirm it renders. If the project does not expose a service detail page, skip this and rely on Task 14's category-page check, which transitively renders service data.

- [ ] **Step 6: Commit**

```bash
git add src/lib/db/services.ts src/sanity/lib/queries.ts
git commit -m "feat: switch services data layer to sanity"
```

---

## Task 16: Side-by-side parity verification

**Files:** none modified — verification only.

- [ ] **Step 1: Build and run production locally**

```bash
npm run build
npm start -- --port 3003
```

Expected: build completes with no errors. Server starts.

- [ ] **Step 2: Visual diff against the deployed site**

Open two browser windows:
- Left: production deployment URL (the live Supabase-backed site)
- Right: `http://localhost:3003`

Walk through each page side by side:
- Home (`/`)
- `/visa`, `/legal`, `/company-setup`, `/insurance`, `/property`, `/hr-payroll`, `/accounting-tax`
- Navbar dropdown — all categories visible, sub-categories listed under each, services nested under sub-categories
- Sitemap (`/sitemap.xml`) — confirm all category URLs are present

Expected differences:
- The 3 categories with full client data (Visa, Accounting & Tax, Legal) show the **new client-provided content** (different descriptions, deliverables, etc.) compared to the live site. This is intentional.
- The 4 partially-seeded categories should look identical to the live site.

**Stop and investigate** any of these:
- Missing pages (404)
- Broken navbar dropdown
- Missing icons or accent colors on category cards
- Empty service cards where the live site has content

- [ ] **Step 3: Stop the production server**

- [ ] **Step 4: Commit a notes file documenting the parity check**

Create `docs/superpowers/specs/2026-04-26-sanity-cms-migration-parity-notes.md`:

```markdown
# Sanity Migration — Parity Notes

Date verified: <YYYY-MM-DD>

## Pages checked
- [ ] Home `/`
- [ ] Each of 7 category pages
- [ ] Navbar dropdown
- [ ] Sitemap

## Intentional differences
- Visa, Accounting & Tax, Legal — show new client-provided content
- All other categories — should match live site

## Issues found / fixed
<list any visual fixes applied during cutover>
```

Fill in the date and any notes during the check.

```bash
git add docs/superpowers/specs/2026-04-26-sanity-cms-migration-parity-notes.md
git commit -m "docs: parity verification notes for sanity cutover"
```

---

## Task 17: Lock down Supabase writes

After cutover, Supabase tables are inert reference data. To prevent accidental drift, we remove write access on the tables. (Reads are already public via RLS.)

**Files:**
- Create: `supabase/migrations/002_lock_legacy_tables.sql`

- [ ] **Step 1: Create the lockdown migration**

Create `supabase/migrations/002_lock_legacy_tables.sql`:

```sql
-- After Sanity becomes the source of truth, prevent any writes to the legacy tables.
-- Reads remain allowed for the inert period (~2 weeks) for rollback safety.

-- Drop any existing write policies (if they exist).
DROP POLICY IF EXISTS "categories_insert" ON public.categories;
DROP POLICY IF EXISTS "categories_update" ON public.categories;
DROP POLICY IF EXISTS "categories_delete" ON public.categories;
DROP POLICY IF EXISTS "sub_categories_insert" ON public.sub_categories;
DROP POLICY IF EXISTS "sub_categories_update" ON public.sub_categories;
DROP POLICY IF EXISTS "sub_categories_delete" ON public.sub_categories;
DROP POLICY IF EXISTS "services_insert" ON public.services;
DROP POLICY IF EXISTS "services_update" ON public.services;
DROP POLICY IF EXISTS "services_delete" ON public.services;

-- Revoke INSERT/UPDATE/DELETE from the anon and authenticated roles entirely.
REVOKE INSERT, UPDATE, DELETE ON public.categories FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.sub_categories FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.services FROM anon, authenticated;
```

- [ ] **Step 2: Apply the migration to Supabase**

If using Supabase CLI: `npx supabase db push`
Or manually paste the SQL into the Supabase SQL editor and run it.

- [ ] **Step 3: Verify writes fail**

In the Supabase SQL editor (logged in as the `anon` role via "Run as Postgres role" → `anon`):

```sql
INSERT INTO public.categories (slug, name) VALUES ('test', 'test');
```

Expected: permission denied error.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/002_lock_legacy_tables.sql
git commit -m "chore(supabase): lock legacy tables after sanity cutover"
```

---

## Task 18: Hand-off documentation for the client

**Files:**
- Create: `docs/client/editing-content.md`

- [ ] **Step 1: Write the client-facing editing guide**

Create `docs/client/editing-content.md`:

```markdown
# How to edit content on the Ilot website

You edit all categories, sub-categories, and services through the Studio at:

**https://<your-domain>/studio**

(Use the email address you were invited with. If you lose access, ask the developer to re-invite.)

## What you can edit

- **Categories** (Visa & Immigration, Legal, etc.) — name, tagline, icon, accent colour, cover image, sort order
- **Sub-Categories** (Investor KITAS, Visit Visas, etc.) — name, parent category, sort order
- **Services** (the individual offerings) — name, description, target client, key deliverables, timeline, real-time work, WhatsApp message, SEO

## Editing workflow

1. Find the document in the left sidebar (Categories → click into one → Sub-Categories → Services)
2. Make your changes — every field has an **English** and a **Bahasa Indonesia** input. If Bahasa is empty, the site falls back to English
3. Click **Publish** in the top-right
4. Changes appear on the live site within ~1 minute

## What NOT to do

- **Do not delete a category or sub-category that has services attached** — the services will lose their parent. Move services to a different sub-category first if you need to remove one.
- **Do not change a slug** of an existing item — the slug is part of its URL. Changing it will break links and SEO. Ask the developer if you need to.

## Need help?

Email <developer-email>.
```

- [ ] **Step 2: Commit**

```bash
git add docs/client/editing-content.md
git commit -m "docs: add client-facing editing guide"
```

---

## Task 19: Final verification & deploy

- [ ] **Step 1: Run all tests**

Run: `npm test`
Expected: all 20 tests pass (9 normalize + 7 parseClientData + 4 parseSeedSql).

- [ ] **Step 2: Type-check the whole project**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Lint**

Run: `npm run lint`
Expected: no errors. Address any warnings related to new files.

- [ ] **Step 4: Production build**

Run: `npm run build`
Expected: build succeeds. The Studio route appears in the route summary as a dynamic route.

- [ ] **Step 5: Deploy**

Push the branch to remote, open a PR, wait for preview deployment.

On the preview deployment:
- Visit `/studio` → log in → confirm all data is present
- Visit each category page → confirm visual parity with local
- Visit `/sitemap.xml` → confirm all category URLs are present

- [ ] **Step 6: Add the client's email as Editor in Sanity**

In sanity.io/manage → your project → Members → Invite member → enter client's email, role: Editor.

- [ ] **Step 7: Add production URL to Sanity CORS origins**

In sanity.io/manage → your project → API → CORS origins, add the production URL (e.g. `https://ilot.com`) with credentials allowed.

- [ ] **Step 8: Merge and deploy**

Merge the PR. Once production deploy is green, share `docs/client/editing-content.md` with the client along with their Studio URL.

---

## Self-Review Notes

Reviewed against the spec on 2026-04-26 — all sections of the spec are covered:

- Architecture (Studio at `/studio`, Sanity hosted, ISR 60s) → Tasks 5, 8, 9
- Auth model (Sanity-managed) → Task 19 step 6
- Content model (3 doc types + localized object helpers + SEO) → Tasks 6, 7
- Studio organization (tree-style nesting) → Task 8
- Importer (client JSON + seed.sql fallback, idempotent, dry-run) → Tasks 2, 3, 4, 10, 11, 12
- Cutover (drop-in data layer rewrite, parity check) → Tasks 13, 14, 15, 16
- Code changes (every file in the spec's "Created"/"Modified" lists) → Covered
- Caching & freshness (ISR 60s) → Task 14, 15
- Risk mitigation (lockdown of legacy tables) → Task 17
- Success criteria (Studio works, parity holds, 3 client categories use new content, importer is re-runnable) → Tasks 12, 16, 19

**Refinement noted:** the spec said "field rename to camelCase". The plan instead keeps existing snake_case TS types and renames at the GROQ projection layer. This eliminates a chunk of consumer-file changes and reduces the cutover blast radius. Net result is identical from the user-facing site's perspective.

**One known limitation:** the seed.sql parser (`parseSeedSqlCategories`) handles only the patterns currently in `supabase/seed.sql`. If the seed file changes shape later, the parser may need updating. This is a one-time importer, so this is acceptable.
