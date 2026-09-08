// Seeds the production NocoDB `Agents` table, which the handoff flow reads to
// decide who a committed case goes to. An empty table is the open defect in
// docs/human-agent-handoff.md: every branch of `Agent Found?` fails.
//
//   NOCODB_TOKEN=... node scripts/seed-agents.mjs <agents.json>            # dry run
//   NOCODB_TOKEN=... node scripts/seed-agents.mjs <agents.json> --commit   # write
//
// Dry run by default, matching `import:sanity:dry`. Nothing is written without
// --commit.
//
// The agents file is passed in rather than committed, so staff phone numbers stay
// out of git. Format — one object per PERSON, with the departments they cover:
//
//   [
//     { "name": "Debia", "phone": "6282339941015", "departments": ["visa", "legal"] }
//   ]
//
// One row is written per (person × department). That is not a convenience: the
// lookup is an exact-equality match on a single text column,
//
//   =(department,eq,{{ $json.department }})~and(active,eq,true)
//
// so a single row saying "all departments" can never match anything. A person
// covering everything needs seven rows.

const BASE = process.env.NOCODB_URL || 'https://nocodb.ilotlegal.com'
const TABLE = process.env.NOCODB_AGENTS_TABLE || 'mcgjknbniocnvk7'
const TOKEN = process.env.NOCODB_TOKEN

// The only values the production AI Agent can emit, from its system prompt in
// n8n-workflows/ilot-inbound-whatsapp.json. A department outside this list is a
// typo that will fail silently, so it is rejected up front.
const DEPARTMENTS = ['visa', 'company', 'legal', 'tax', 'property', 'hr', 'insurance']

const commit = process.argv.includes('--commit')
const file = process.argv.slice(2).find((a) => !a.startsWith('--'))

function die(msg) {
  console.error(`\n${msg}`)
  process.exit(1)
}

if (!TOKEN) die('Set NOCODB_TOKEN to a NocoDB personal access token with data write access.')
if (!file) die('Usage: NOCODB_TOKEN=... node scripts/seed-agents.mjs <agents.json> [--commit]')

async function call(path, { method = 'GET', body } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'xc-token': TOKEN, 'content-type': 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
  const text = await res.text()
  if (!res.ok) throw new Error(`${method} ${path} -> ${res.status}\n${text.slice(0, 400)}`)
  return text ? JSON.parse(text) : null
}

const people = JSON.parse(await (await import('node:fs/promises')).readFile(file, 'utf8'))

const rows = []
for (const p of people) {
  if (!p.name || !p.phone || !Array.isArray(p.departments)) {
    die(`Each entry needs name, phone and departments[]. Bad entry: ${JSON.stringify(p)}`)
  }
  // E.164 without a leading +, which is what the WhatsApp node expects.
  if (!/^[0-9]{8,15}$/.test(p.phone)) {
    die(`phone must be digits only, no + and no spaces (E.164). Got ${JSON.stringify(p.phone)} for ${p.name}`)
  }
  for (const raw of p.departments) {
    const department = String(raw).trim().toLowerCase()
    if (!DEPARTMENTS.includes(department)) {
      die(`unknown department ${JSON.stringify(raw)} for ${p.name}. Allowed: ${DEPARTMENTS.join(', ')}`)
    }
    rows.push({
      name: p.name,
      phone: p.phone,
      department,
      // Default is 0/false. An unticked row matches nothing, which looks exactly
      // like the bug this script exists to fix.
      active: true,
      // The picker does Number(open_cases || 0), so null is survivable — but seed
      // it anyway so the column reads honestly.
      open_cases: 0,
      ...(p.slack_id ? { slack_id: p.slack_id } : {}),
    })
  }
}

const existing = await call(`/api/v2/tables/${TABLE}/records?limit=200`)
const before = existing.pageInfo?.totalRows ?? existing.list?.length ?? 0

console.log(`\n${BASE}  table ${TABLE}`)
console.log(`existing rows: ${before}`)
console.log(`\n${rows.length} row(s) to write:`)
for (const r of rows) {
  console.log(`  ${r.name.padEnd(14)} ${r.phone.padEnd(15)} ${r.department.padEnd(10)} active=${r.active}`)
}

const covered = new Set(rows.map((r) => r.department))
const gaps = DEPARTMENTS.filter((d) => !covered.has(d))
if (gaps.length) {
  console.log(`\n⚠️  no active agent for: ${gaps.join(', ')}`)
  console.log('   A committed case in one of those falls to the false branch, which is')
  console.log('   the ops alert — still pointed at REPLACE_WITH_OPS_FALLBACK_NUMBER.')
}

if (!commit) {
  console.log('\nDRY RUN — nothing written. Re-run with --commit to write.')
  process.exit(0)
}

const created = await call(`/api/v2/tables/${TABLE}/records`, { method: 'POST', body: rows })
const after = await call(`/api/v2/tables/${TABLE}/records?limit=200`)
console.log(`\nwrote ${Array.isArray(created) ? created.length : 1} row(s)`)
console.log(`rows now: ${after.pageInfo?.totalRows ?? after.list?.length}`)
for (const r of after.list ?? []) {
  console.log(`  Id=${r.Id} ${String(r.name).padEnd(14)} ${r.department.padEnd(10)} active=${r.active}`)
}
