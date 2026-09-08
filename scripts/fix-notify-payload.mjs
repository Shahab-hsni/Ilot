// Fixes `Notify Agent (WhatsApp)` in Ilot - Assign Agent (#5).
//
// THE DEFECT (introduced by the 31 Aug repair, not pre-existing)
//
// The repair set the node's jsonBody to a single expression wrapping an object
// literal:
//
//   ={{ JSON.stringify({"messaging_product":"whatsapp", ... "parameters":[...]}]}}) }}
//
// n8n's expression parser terminates at the FIRST `}}` it sees. The nested JSON
// closes several braces in a row, producing an interior `}}`, so the expression is
// cut short and the node returns:
//
//   {"error": "invalid syntax"}
//
// Observed in execution 552. Harmless at the time only because the node carries
// onError: continueRegularOutput — the customer confirmation ahead of it still
// went out, with a real wamid from Meta.
//
// THE FIX
//
// Build the payload in a Code node, then stringify one variable. The expression
// becomes `={{ JSON.stringify($json.payload) }}`, which contains no interior `}}`
// and cannot be truncated. Nested JSON in a jsonBody expression is a trap worth
// avoiding by construction rather than by escaping.
//
//   N8N_API_KEY=... node scripts/fix-notify-payload.mjs [--commit]
//
// NOTE: PUT re-publishes immediately. Rollback: n8n-workflows/ilot-assign-agent.json.

const N8N = 'https://n8n.ilotlegal.com'
const KEY = process.env.N8N_API_KEY
const ID = 'Ez08kr0HLdziPPwy'
const NOTIFY = 'Notify Agent (WhatsApp)'
const BUILDER = 'Build Notify Payload'
const PHONE_NUMBER_ID = '1231024886758816'

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
const connections = JSON.parse(JSON.stringify(av.connections))
const ni = nodes.findIndex((n) => n.name === NOTIFY)
if (ni === -1) { console.error(`${NOTIFY} not found`); process.exit(1) }

if (nodes.some((n) => n.name === BUILDER)) {
  console.log(`${BUILDER} already present — nothing to do`)
  process.exit(0)
}

const builderCode = `
// Assemble the WhatsApp template payload here rather than inside the HTTP node's
// jsonBody. An expression like {{ JSON.stringify({ ...nested... }) }} is cut short
// by n8n at the first interior '}}', which produced {"error":"invalid syntax"}.
// One variable, one pair of braces, no ambiguity.
const a = $('Pick Least-Loaded Agent').first().json;

return [{
  json: {
    payload: {
      messaging_product: 'whatsapp',
      to: a.agent_phone,
      type: 'template',
      template: {
        name: 'agent_case_assigned',
        language: { code: 'en' },
        components: [{
          type: 'body',
          parameters: [
            { type: 'text', text: String(a.customer_name ?? '') },
            { type: 'text', text: String(a.service ?? '') },
            { type: 'text', text: String(a.customer_phone ?? '') },
          ],
        }],
      },
    },
  },
}];
`.trim()

const builder = {
  parameters: { jsCode: builderCode },
  type: 'n8n-nodes-base.code',
  typeVersion: 2,
  position: [(nodes[ni].position?.[0] ?? 900) - 220, (nodes[ni].position?.[1] ?? 0) + 160],
  id: 'buildnotify-0000-4aaa-bbbb-notifypayload01',
  name: BUILDER,
}
nodes.push(builder)

nodes[ni] = {
  ...nodes[ni],
  parameters: {
    ...nodes[ni].parameters,
    url: `https://graph.facebook.com/v25.0/${PHONE_NUMBER_ID}/messages`,
    jsonBody: '={{ JSON.stringify($json.payload) }}',
  },
  notes: 'Payload is built in "Build Notify Payload" because a nested object literal inside a jsonBody expression gets truncated at the first interior "}}" — that produced {"error":"invalid syntax"}. Sends will still fail until template agent_case_assigned is APPROVED and the WABA has a payment method (141006); onError is deliberate.',
  notesInFlow: true,
}

// Confirm to Customer -> Build Notify Payload -> Notify Agent
connections['Confirm to Customer'] = { main: [[{ node: BUILDER, type: 'main', index: 0 }]] }
connections[BUILDER] = { main: [[{ node: NOTIFY, type: 'main', index: 0 }]] }

console.log('planned tail wiring:')
for (const src of ['Increment Agent Open Cases', 'Confirm to Customer', BUILDER]) {
  for (const b of connections[src]?.main ?? []) for (const c of b) console.log(`  ${src} -> ${c.node}`)
}
console.log(`\nnew jsonBody: ${nodes[ni].parameters.jsonBody}`)

if (!commit) {
  console.log('\nDRY RUN — nothing written. Re-run with --commit.')
  process.exit(0)
}

const put = await api(`/workflows/${ID}`, {
  method: 'PUT',
  body: { name: wf.name, nodes, connections, settings: av.settings ?? { executionOrder: 'v1' } },
})
console.log(`\nPUT -> ${put.status}`)
if (!put.ok) { console.log(put.text.slice(0, 600)); process.exit(1) }

const chk = await api(`/workflows/${ID}`)
const nav = chk.json.activeVersion
console.log(`activeVersion.versionId: ${nav?.versionId}`)
console.log(`draft == published     : ${chk.json.versionId === nav?.versionId}`)
console.log('\nPUBLISHED tail:')
for (const [src, v] of Object.entries(nav.connections)) {
  for (const b of v.main ?? []) for (const c of b) {
    if (['Increment Agent Open Cases', 'Confirm to Customer', BUILDER].includes(src)) console.log(`  ${src} -> ${c.node}`)
  }
}
