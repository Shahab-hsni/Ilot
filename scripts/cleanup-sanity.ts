/**
 * Cleanup script: removes orphaned category / subCategory / service documents
 * from Sanity that are no longer present in the current seed data.
 *
 * Safe to run repeatedly — it only deletes documents whose _id is NOT in the
 * expected set derived from docs/seed-data/raw.json.
 *
 * Usage:
 *   npm run cleanup:sanity          → delete orphans
 *   npm run cleanup:sanity:dry      → preview only (no mutations)
 */
import 'dotenv/config'
import fs from 'node:fs'
import path from 'node:path'
import { createClient } from '@sanity/client'
import { parseClientData } from './lib/parseClientData'
import { parseSeedSqlCategories } from './lib/parseSeedSql'
import type { ClientDataRow } from './lib/types'

const DRY_RUN = process.argv.includes('--dry-run')
const ROOT = path.resolve(__dirname, '..')
const CLIENT_DATA_PATH = path.join(ROOT, 'docs/seed-data/raw.json')
const SEED_SQL_PATH = path.join(ROOT, 'docs/seed-data/legacy-categories.sql')

function requireEnv(name: string): string {
  const v = process.env[name]
  if (!v) throw new Error(`Missing env var ${name}`)
  return v
}

/** Build the full set of expected Sanity _ids from the current seed data. */
function buildExpectedIds(clientRows: ClientDataRow[]): Set<string> {
  const ids = new Set<string>()
  const parsed = parseClientData(clientRows)

  for (const cat of parsed) {
    ids.add(`category-${cat.slug}`)
    for (const sub of cat.subCategories) {
      ids.add(`subCategory-${cat.slug}-${sub.slug}`)
      for (const svc of sub.services) {
        ids.add(`service-${cat.slug}-${sub.slug}-${svc.slug}`)
      }
    }
  }

  // Fallback categories (insurance, property) — keep them alive
  const seedSql = fs.readFileSync(SEED_SQL_PATH, 'utf8')
  const fallback = parseSeedSqlCategories(seedSql)
  for (const fb of fallback) {
    ids.add(`category-${fb.slug}`)
  }

  return ids
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

  const expectedIds = buildExpectedIds(clientRows)
  console.log(`Expected document count: ${expectedIds.size}`)
  console.log(DRY_RUN ? '— DRY RUN (no deletions will be made) —' : '— LIVE RUN —')

  // Fetch all managed document IDs from Sanity
  const types = ['category', 'subCategory', 'service']
  const allDocs: Array<{ _id: string; _type: string; slug?: { current: string } }> =
    await client.fetch(
      `*[_type in $types]{_id, _type, slug}`,
      { types }
    )

  console.log(`\nFound ${allDocs.length} documents in Sanity across types: ${types.join(', ')}`)

  const toDelete = allDocs.filter((doc) => !expectedIds.has(doc._id))

  if (toDelete.length === 0) {
    console.log('\n✓ No orphaned documents found. Sanity is clean.')
    return
  }

  console.log(`\nOrphaned documents to delete (${toDelete.length}):`)
  for (const doc of toDelete) {
    console.log(`  [${doc._type}] ${doc._id}  (slug: ${doc.slug?.current ?? 'n/a'})`)
  }

  if (DRY_RUN) {
    console.log('\n(Dry run — no documents were changed)')
    return
  }

  // Strategy: try hard-delete first; fall back to isActive=false for docs with
  // existing references (Sanity returns 409 Conflict in that case).
  const BATCH = 50
  let hardDeleted = 0
  let softDisabled = 0

  for (let i = 0; i < toDelete.length; i += BATCH) {
    const batch = toDelete.slice(i, i + BATCH)
    const tx = client.transaction()
    for (const doc of batch) tx.delete(doc._id)

    try {
      await tx.commit()
      hardDeleted += batch.length
    } catch {
      // One or more docs in the batch are referenced — fall back to individual
      // soft-disable for each doc in the batch.
      for (const doc of batch) {
        try {
          await client.delete(doc._id)
          hardDeleted++
        } catch {
          // Referenced — mark inactive instead
          await client.patch(doc._id).set({ isActive: false }).commit()
          softDisabled++
          console.log(`  ⚠ Referenced — marked inactive: ${doc._id}`)
        }
      }
    }

    console.log(`Progress: ${hardDeleted + softDisabled}/${toDelete.length}…`)
  }

  console.log(
    `\n✓ Done. Hard-deleted: ${hardDeleted} | Soft-disabled (still referenced): ${softDisabled}`
  )
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
