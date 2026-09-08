import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { parseSeedSqlCategories } from '@scripts/lib/parseSeedSql'

const seedSql = `
-- Comment
insert into public.categories (slug, name, tagline, icon_name, sort_order) values
  ('visa', 'Visa & Immigration', 'Your gateway to legal residency in Indonesia.', 'Plane', 0),
  ('insurance', 'Insurance', 'Protect what you''ve built.', 'Shield', 3)
on conflict (slug) do nothing;
`

describe('parseSeedSqlCategories', () => {
  it('extracts categories with metadata', () => {
    const result = parseSeedSqlCategories(seedSql)
    expect(result).toHaveLength(2)
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

  it('always returns empty subCategorySlugs (sub-cats come from client data)', () => {
    const result = parseSeedSqlCategories(seedSql)
    for (const cat of result) {
      expect(cat.subCategorySlugs).toEqual([])
    }
  })

  it('returns empty array when no INSERT found', () => {
    expect(parseSeedSqlCategories('-- empty')).toEqual([])
  })

  it('parses the real legacy categories SQL block', () => {
    const seedFile = path.resolve(__dirname, '../docs/seed-data/legacy-categories.sql')
    const sql = fs.readFileSync(seedFile, 'utf-8')
    const result = parseSeedSqlCategories(sql)

    expect(result).toHaveLength(7)

    const slugs = result.map((c) => c.slug)
    expect(slugs).toEqual(
      expect.arrayContaining([
        'visa',
        'legal',
        'company-setup',
        'insurance',
        'property-advisory',
        'hr-payroll',
        'accounting-tax',
      ])
    )

    for (const cat of result) {
      expect(cat.name).toBeTruthy()
      expect(cat.subCategorySlugs).toEqual([])
    }
  })
})
