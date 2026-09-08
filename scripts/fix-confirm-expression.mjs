// Fixes `Confirm to Customer` in Ilot - Assign Agent (#5).
//
// THE DEFECT (pre-existing)
//
// In n8n a parameter only evaluates `{{ }}` when its value starts with `=`. This
// node had the prefix on the recipient but not on the body:
//
//   recipientPhoneNumber: "={{ ...customer_phone }}"   <- evaluated
//   textBody:             "Your case officer {{ ...agent_name }} has been..."  <- NOT
//
// So the message reached the right number carrying the raw template. The customer
// received, verbatim:
//
//   Your case officer {{ $('Pick Least-Loaded Agent').item.json.agent_name }} has
//   been assigned. They'll reach out within 1 business day. ✅
//
// Found on 31 Aug 2026 by reading the message that actually arrived on a real
// handset — Meta returned a valid wamid and the execution was green, so nothing
// upstream of the recipient could have revealed it. Worth remembering: an n8n
// execution showing success proves the request was accepted, not that the content
// was right.
//
// Audited the other customer-facing nodes at the same time; `WhatsApp: Resend
// Please`, `Send message` and `Send commitment ask` all carry the prefix
// correctly, so this was the only one.
//
//   N8N_API_KEY=... node scripts/fix-confirm-expression.mjs [--commit]
//
// NOTE: PUT re-publishes immediately. Rollback: n8n-workflows/ilot-assign-agent.json.

const N8N = 'https://n8n.ilotlegal.com'
const KEY = process.env.N8N_API_KEY
const ID = 'Ez08kr0HLdziPPwy'
const NODE = 'Confirm to Customer'

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

const before = nodes[i].parameters?.textBody ?? ''
console.log(`current textBody starts with '=': ${before.startsWith('=')}`)
if (before.startsWith('=')) {
  console.log('already an expression — nothing to do')
  process.exit(0)
}

nodes[i] = {
  ...nodes[i],
  parameters: { ...nodes[i].parameters, textBody: `=${before}` },
  notes: 'textBody needs the leading "=" or n8n sends the {{ }} verbatim. It was missing, and a real customer received the raw expression while the execution reported success.',
  notesInFlow: true,
}
console.log(`new textBody: ${nodes[i].parameters.textBody.slice(0, 90)}...`)

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
console.log(`published textBody '=' : ${String(n2?.parameters?.textBody).startsWith('=')}`)
