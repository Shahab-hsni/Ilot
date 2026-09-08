// Repairs `Trigger Assign Agent (#5)` in Ilot - Commitment Gate (#4).
//
// THE DEFECT
//
// The node is an `n8n-nodes-base.executeWorkflow` at typeVersion 1.2, and its
// `workflowId` is stored as a bare string:
//
//   "workflowId": "Ez08kr0HLdziPPwy"
//
// typeVersion 1.2 expects a resource locator object. With a bare string,
// fetchWorkflowData cannot resolve it and the node throws:
//
//   No information about the workflow to execute found.
//   Please provide either the "id" or "code"!
//
// Observed live in execution 545 on 31 Aug 2026: every node before it succeeded —
// the client was matched, `Mark Committed` ran, `Log Processed (committed)` wrote
// its row — and then the handoff died right here.
//
// So the commitment gate has NEVER been able to call Assign Agent. This sits
// underneath the empty `Agents` table as a second, independent break: seeding the
// table alone could never have produced a notification, because the sub-workflow
// was never reached. docs/human-agent-handoff.md does not mention it; its trace
// assumes Assign Agent gets called.
//
// This is pre-existing. It is present in the snapshot exported before any change
// was made today, and the gate workflow was never modified by this session.
//
//   N8N_API_KEY=... node scripts/fix-gate-trigger.mjs [--commit]
//
// NOTE: PUT /api/v1/workflows/{id} re-publishes immediately — no draft stage. The
// pre-change published version is committed at
// n8n-workflows/ilot-commitment-gate.json; that is the rollback.

const N8N = 'https://n8n.ilotlegal.com'
const KEY = process.env.N8N_API_KEY
const GATE_ID = 'Lgrc2W90RxRo0EPG'
const TARGET_ID = 'Ez08kr0HLdziPPwy'
const TARGET_NAME = 'Ilot - Assign Agent (#5)'
const NODE = 'Trigger Assign Agent (#5)'

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

const got = await api(`/workflows/${GATE_ID}`)
if (!got.ok) { console.error(`read -> ${got.status}\n${got.text.slice(0, 300)}`); process.exit(1) }
const wf = got.json
const av = wf.activeVersion
if (!av) { console.error('no activeVersion — refusing to touch it'); process.exit(1) }

const nodes = JSON.parse(JSON.stringify(av.nodes))
const i = nodes.findIndex((n) => n.name === NODE)
if (i === -1) { console.error(`${NODE} not found`); process.exit(1) }

const before = nodes[i].parameters?.workflowId
console.log(`current workflowId: ${JSON.stringify(before)}`)
if (before && typeof before === 'object' && before.__rl) {
  console.log('already a resource locator — nothing to do')
  process.exit(0)
}

nodes[i] = {
  ...nodes[i],
  parameters: {
    ...nodes[i].parameters,
    workflowId: {
      __rl: true,
      value: TARGET_ID,
      mode: 'id',
      cachedResultName: TARGET_NAME,
    },
  },
  // The handoff must not be lost silently if the sub-workflow errors. Let the
  // parent finish so the execution is recorded rather than half-written.
  onError: 'continueRegularOutput',
  notes: 'workflowId must be a resource locator object on executeWorkflow v1.2. A bare string throws "No information about the workflow to execute found" and the handoff dies here — see docs/human-agent-handoff.md.',
  notesInFlow: true,
}

console.log(`new workflowId    : ${JSON.stringify(nodes[i].parameters.workflowId)}`)

if (!commit) {
  console.log('\nDRY RUN — nothing written. Re-run with --commit.')
  console.log('Remember: PUT re-publishes immediately.')
  process.exit(0)
}

const put = await api(`/workflows/${GATE_ID}`, {
  method: 'PUT',
  body: { name: wf.name, nodes, connections: av.connections, settings: av.settings ?? { executionOrder: 'v1' } },
})
console.log(`\nPUT -> ${put.status}`)
if (!put.ok) { console.log(put.text.slice(0, 600)); process.exit(1) }

const after = await api(`/workflows/${GATE_ID}`)
const nav = after.json.activeVersion
const n2 = nav.nodes.find((n) => n.name === NODE)
console.log(`activeVersion.versionId: ${nav?.versionId}`)
console.log(`draft == published     : ${after.json.versionId === nav?.versionId}`)
console.log(`published workflowId   : ${JSON.stringify(n2?.parameters?.workflowId)}`)
console.log(`published onError      : ${n2?.onError ?? '(default)'}`)
