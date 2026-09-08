// Fixes the `where` clause on `Get Active Agents (dept)` in Ilot - Assign Agent (#5).
//
// THE DEFECT
//
//   where: "=(department,eq,{{ $json.department }})~and(active,eq,true)"
//
// `active` is a NocoDB Checkbox, stored as 1/0. Comparing it to `true` matches
// nothing. Measured against the live table on 31 Aug 2026, with one active agent
// per department present:
//
//   (department,eq,visa)~and(active,eq,true)  ->  0 rows
//   (department,eq,visa)~and(active,eq,1)     ->  1 row
//   (department,eq,visa)                      ->  1 row
//   (active,eq,true)                          ->  0 rows
//
// HOW IT HID
//
// Zero rows out of a NocoDB node means zero items, and n8n does not run a node
// with no input. So `Pick Least-Loaded Agent` never executed — including the
// branch its own author wrote to handle "no agents found" by returning
// `assigned: false`. The workflow finished with status **success** having done
// nothing at all: no assignment, no customer confirmation, no ops alert. Observed
// in execution 550.
//
// That is the worst shape a failure can take here, and it is exactly the silent
// free-text/typing failure docs/human-agent-handoff.md warns about — just on the
// `active` column rather than `department`.
//
// This is the FOURTH independent break in the chain, all pre-existing:
//   1. `Agents` table held no rows
//   2. the gate's executeWorkflow `workflowId` was a bare string
//   3. this node's `sort` option was a string where a fixedCollection was expected
//   4. this filter
// Each alone was enough to stop every notification.
//
//   N8N_API_KEY=... node scripts/fix-agents-filter.mjs [--commit]
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

const before = nodes[i].parameters?.options?.where
console.log(`current where: ${before}`)
if (!before || !before.includes('active,eq,true')) {
  console.log('nothing to change')
  process.exit(0)
}
const after = before.replace('active,eq,true', 'active,eq,1')
console.log(`new where    : ${after}`)

nodes[i] = {
  ...nodes[i],
  parameters: {
    ...nodes[i].parameters,
    options: { ...nodes[i].parameters.options, where: after },
  },
  notes: 'active is a NocoDB Checkbox stored as 1/0; (active,eq,true) matches nothing and returns zero rows, which makes n8n skip every downstream node and finish "successfully" having done nothing. Use 1, not true. Verified against the live table.',
  notesInFlow: true,
}

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

const chk = await api(`/workflows/${ID}`)
const nav = chk.json.activeVersion
const n2 = nav.nodes.find((n) => n.name === NODE)
console.log(`activeVersion.versionId: ${nav?.versionId}`)
console.log(`draft == published     : ${chk.json.versionId === nav?.versionId}`)
console.log(`published where        : ${n2?.parameters?.options?.where}`)
