/**
 * One-time import script: client JSON + seed.sql → Sanity.
 * Run with: `npm run import:sanity` (real) or `npm run import:sanity:dry` (preview).
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
const CLIENT_DATA_PATH = path.join(ROOT, 'docs/seed-data/raw.json')
const SEED_SQL_PATH = path.join(ROOT, 'docs/seed-data/legacy-categories.sql')

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
