// Removes the malformed `sort` option from `Get Active Agents (dept)` in
// Ilot - Assign Agent (#5).
//
// THE DEFECT
//
// The node carries:
//
//   "options": { "where": "=(department,eq,{{ ... }})~and(active,eq,true)",
//                "sort": "open_cases" }
//
// n8n's NocoDB node expects `sort` as a fixedCollection — `{ property: [ { field,
// direction } ] }` — and calls `.map()` on `sort.property`. A bare string has no
// `.property`, so every run throws:
//
//   Cannot read properties of undefined (reading 'map')
//
// Observed live in execution 548 on 31 Aug 2026: `When Called by #4` succeeded and
// `Get Active Agents (dept)` died immediately after.
//
// WHY REMOVE RATHER THAN CORRECT
//
// The sort is redundant. `Pick Least-Loaded Agent`, the very next node, already
// orders the agents itself:
//
//   .sort((a, b) => { const ao = Number(a.open_cases || 0); ... })
//
// Deleting a broken parameter is safer than guessing the exact shape n8n wants for
// it, and nothing downstream depends on NocoDB having sorted the rows.
//
// This is the THIRD independent break in the handoff chain, all pre-existing:
//   1. `Agents` table held no rows
//   2. the gate's executeWorkflow `workflowId` was a bare string
//   3. this
// Each one alone was enough to stop any notification, so the chain had never once
// run to completion.
//
//   N8N_API_KEY=... node scripts/fix-agents-sort.mjs [--commit]
//
// NOTE: PUT re-publishes immediately. Rollback: n8n-workflows/ilot-assign-agent.json.

const N8N = 'https://n8n.ilotlegal.com'
const KEY = process.env.N8N_API_KEY
const ID = 'Ez08kr0HLdziPPwy'
const NODE = 'Get Active Agents (dept)'

const commit = process.argv.includes('--commit')
if (!KEY) { console.error('Set N8N_API_KEY'); process.exit(1) }

const api = async (p, { method = 'GET', body } = {}) => {
  const res = await fetch(`${N8N}/api/v1${p}`, {
    method,
    headers: { 'X-N8N-API-KEY': KEY, 'content-type': 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
  const text = await res.text()
  let json
  try { json = JSON.parse(text) } catch { json = text }
  return { ok: res.ok, status: res.status, json, text }
}

const got = await api(`/workflows/${ID}`)
if (!got.ok) { console.error(`read -> ${got.status}`); process.exit(1) }
const wf = got.json
const av = wf.activeVersion
if (!av) { console.error('no activeVersion — refusing to touch it'); process.exit(1) }

const nodes = JSON.parse(JSON.stringify(av.nodes))
const i = nodes.findIndex((n) => n.name === NODE)
if (i === -1) { console.error(`${NODE} not found`); process.exit(1) }

const opts = nodes[i].parameters?.options ?? {}
console.log(`current options: ${JSON.stringify(opts)}`)
if (!('sort' in opts)) {
  console.log('no sort option — nothing to do')
  process.exit(0)
}

const { sort, ...rest } = opts
nodes[i] = {
  ...nodes[i],
  parameters: { ...nodes[i].parameters, options: rest },
  notes: 'A `sort: "open_cases"` string used to live in options and threw "Cannot read properties of undefined (reading \'map\')" on every run — n8n wants a fixedCollection there. Removed rather than corrected: Pick Least-Loaded Agent already sorts by open_cases.',
  notesInFlow: true,
}
console.log(`new options    : ${JSON.stringify(rest)}`)

if (!commit) {
  console.log('\nDRY RUN — nothing written. Re-run with --commit.')
  process.exit(0)
}

const put = await api(`/workflows/${ID}`, {
  method: 'PUT',
  body: { name: wf.name, nodes, connections: av.connections, settings: av.settings ?? { executionOrder: 'v1' } },
})
console.log(`\nPUT -> ${put.status}`)
if (!put.ok) { console.log(put.text.slice(0, 600)); process.exit(1) }

const after = await api(`/workflows/${ID}`)
const nav = after.json.activeVersion
const n2 = nav.nodes.find((n) => n.name === NODE)
console.log(`activeVersion.versionId: ${nav?.versionId}`)
console.log(`draft == published     : ${after.json.versionId === nav?.versionId}`)
console.log(`published options      : ${JSON.stringify(n2?.parameters?.options)}`)
