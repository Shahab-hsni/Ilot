// Repairs Ilot - Assign Agent (#5) on production.
//
// Three defects, all in docs/human-agent-handoff.md:
//
//  1. ORDER. The true branch ran ...Increment -> Notify Agent -> Confirm to
//     Customer, with no error handling on any node. Notify Agent cannot succeed
//     (business-initiated message, no template until now), and its failure took
//     Confirm to Customer with it — so the customer heard nothing either. Moving
//     Confirm ahead of Notify means the customer is told even when notifying the
//     agent fails.
//
//  2. NOTIFY. Free-form text to an agent with no open 24-hour window can never
//     be delivered. Replaced with a template send. Template `agent_case_assigned`
//     was submitted today and is PENDING; sends will fail until it is APPROVED
//     *and* the WABA has a payment method (141006 is still present). Both nodes
//     get onError: continueRegularOutput so neither failure breaks the run.
//
//     Implemented as an HTTP Request against the Graph API rather than the native
//     WhatsApp node: the payload shape is documented and exact, whereas n8n's
//     template parameter UI would be guesswork against production. It reuses the
//     same credential via predefinedCredentialType, so no token is handled here.
//
//  3. OPS ALERT. `recipientPhoneNumber` was the literal string
//     REPLACE_WITH_OPS_FALLBACK_NUMBER. Replaced with email through the SMTP
//     credential production already uses for booking confirmations. Email has no
//     24-hour window and needs no template approval, so this one works today.
//
// NOTE: PUT /api/v1/workflows/{id} re-publishes automatically for a published
// workflow — there is no draft to review first. The pre-change published version
// is committed at n8n-workflows/ilot-assign-agent.json; that is the rollback.
//
//   N8N_API_KEY=... node fix-assign-agent.mjs [--commit]

const N8N = 'https://n8n.ilotlegal.com'
const KEY = process.env.N8N_API_KEY
const ID = 'Ez08kr0HLdziPPwy'
const PHONE_NUMBER_ID = '1231024886758816'
const WA_CRED = { id: 'o6dqNLf1TgJgnOIW', name: 'WhatsApp account' }
const SMTP_CRED = { id: 'fppQBltXypbJXeDg', name: 'Ilot - legal@ Gmail SMTP' }
// Both the same address, and deliberately so. `legal@ilotlegal.com` appears nine
// times in docs/ and ZERO times in any production workflow — the docs are wrong
// about the operational mailbox. What production actually uses:
//
//   Generate Case Token      tells customers to email legal.admin@ilotpropertybali.com
//   Send Confirmation Email  sends FROM legal.admin@ilotpropertybali.com
//
// So that is the mailbox someone reads. An ops alert to legal@ilotlegal.com would
// most likely land where nobody looks.
const OPS_EMAIL = 'legal.admin@ilotpropertybali.com'
const FROM_EMAIL = 'legal.admin@ilotpropertybali.com'

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
if (!got.ok) { console.error(`read -> ${got.status}\n${got.text.slice(0, 300)}`); process.exit(1) }
const wf = got.json
const av = wf.activeVersion
if (!av) { console.error('no activeVersion — refusing to touch it'); process.exit(1) }

// Work from the PUBLISHED version, not the draft.
const nodes = JSON.parse(JSON.stringify(av.nodes))
const connections = JSON.parse(JSON.stringify(av.connections))
const at = (name) => nodes.findIndex((n) => n.name === name)

const P = "$('Pick Least-Loaded Agent').item.json"

// --- 2. Notify Agent: free-form WhatsApp -> template via Graph API ------------
const ni = at('Notify Agent (WhatsApp)')
if (ni === -1) { console.error('Notify Agent (WhatsApp) not found'); process.exit(1) }
const templateBody = {
  messaging_product: 'whatsapp',
  to: `={{ ${P}.agent_phone }}`,
  type: 'template',
  template: {
    name: 'agent_case_assigned',
    language: { code: 'en' },
    components: [{
      type: 'body',
      parameters: [
        { type: 'text', text: `={{ ${P}.customer_name }}` },
        { type: 'text', text: `={{ ${P}.service }}` },
        { type: 'text', text: `={{ ${P}.customer_phone }}` },
      ],
    }],
  },
}
nodes[ni] = {
  ...nodes[ni],
  type: 'n8n-nodes-base.httpRequest',
  typeVersion: 4.2,
  parameters: {
    method: 'POST',
    url: `https://graph.facebook.com/v25.0/${PHONE_NUMBER_ID}/messages`,
    authentication: 'predefinedCredentialType',
    nodeCredentialType: 'whatsAppApi',
    sendBody: true,
    specifyBody: 'json',
    // The expressions inside are resolved by n8n before the request goes out.
    jsonBody: `={{ JSON.stringify(${JSON.stringify(templateBody).replace(/"=\{\{ ([^}]+) \}\}"/g, '$1')}) }}`,
    options: {},
  },
  credentials: { whatsAppApi: WA_CRED },
  // Cannot succeed until the template is APPROVED and 141006 clears. Must not
  // take the run down in the meantime.
  onError: 'continueRegularOutput',
  notes: 'Template send. agent_case_assigned is PENDING review; sends also need a payment method on the WABA (141006). onError is deliberate — see docs/human-agent-handoff.md.',
  notesInFlow: true,
}

// --- 3. Ops Alert: placeholder WhatsApp -> email ------------------------------
const oi = at('Ops Alert: No Agent')
if (oi === -1) { console.error('Ops Alert: No Agent not found'); process.exit(1) }
nodes[oi] = {
  ...nodes[oi],
  type: 'n8n-nodes-base.emailSend',
  typeVersion: 2.1,
  parameters: {
    fromEmail: FROM_EMAIL,
    toEmail: OPS_EMAIL,
    subject: '=⚠️ No active agent for committed case — {{ $json.customer_name }}',
    emailType: 'text',
    message: '=No active agent in department \'{{ $json.department }}\' for a committed case.\n\nName: {{ $json.customer_name }}\nPhone: {{ $json.customer_phone }}\nService: {{ $json.service }}\n\nThis case needs manual assignment. Open the customer chat: https://wa.me/{{ $json.customer_phone }}',
    options: {},
  },
  credentials: { smtp: SMTP_CRED },
  onError: 'continueRegularOutput',
  notes: 'Was a WhatsApp send to the literal string REPLACE_WITH_OPS_FALLBACK_NUMBER and had never worked. Email has no 24-hour window and needs no template, so this path works today.',
  notesInFlow: true,
}

// --- 1. Reorder: Confirm to Customer ahead of Notify Agent --------------------
const link = (from, to) => ({ main: [[{ node: to, type: 'main', index: 0 }]] })
connections['Increment Agent Open Cases'] = link('Increment Agent Open Cases', 'Confirm to Customer')
connections['Confirm to Customer'] = link('Confirm to Customer', 'Notify Agent (WhatsApp)')
delete connections['Notify Agent (WhatsApp)']

// Confirm to Customer stays a native WhatsApp node: it messages the customer, who
// just messaged us, so it is inside the service window and legitimately free.
const ci = at('Confirm to Customer')
nodes[ci] = { ...nodes[ci], onError: 'continueRegularOutput' }

console.log('planned wiring:')
for (const [src, v] of Object.entries(connections)) {
  for (const b of v.main ?? []) for (const c of b) console.log(`  ${src} -> ${c.node}`)
}
console.log('\nnode types after change:')
for (const n of ['Notify Agent (WhatsApp)', 'Confirm to Customer', 'Ops Alert: No Agent']) {
  const n2 = nodes[at(n)]
  console.log(`  ${n.padEnd(26)} ${n2.type.replace('n8n-nodes-base.', '').padEnd(14)} onError=${n2.onError ?? '(default)'}`)
}

if (!commit) {
  console.log('\nDRY RUN — nothing written. Re-run with --commit.')
  console.log('Remember: PUT re-publishes immediately, there is no draft stage.')
  process.exit(0)
}

const put = await api(`/workflows/${ID}`, {
  method: 'PUT',
  body: { name: wf.name, nodes, connections, settings: av.settings ?? { executionOrder: 'v1' } },
})
console.log(`\nPUT -> ${put.status}`)
if (!put.ok) { console.log(put.text.slice(0, 600)); process.exit(1) }

// Verify against activeVersion, never nodes.
const after = await api(`/workflows/${ID}`)
const nav = after.json.activeVersion
console.log(`activeVersion.versionId: ${nav?.versionId}`)
console.log(`draft == published: ${after.json.versionId === nav?.versionId}`)
console.log('\nPUBLISHED wiring:')
for (const [src, v] of Object.entries(nav.connections)) {
  for (const b of v.main ?? []) for (const c of b) console.log(`  ${src} -> ${c.node}`)
}
console.log('\nPUBLISHED nodes:')
for (const n of nav.nodes) {
  console.log(`  ${n.name.padEnd(28)} ${n.type.replace('n8n-nodes-base.', '').padEnd(22)} onError=${n.onError ?? '(default)'}`)
}
// Check PARAMETERS only. Stringifying the whole version also matches the note
// this script writes, which quotes the placeholder to explain the fix — a false
// positive that reads alarmingly.
const leftover = nav.nodes.filter((n) => JSON.stringify(n.parameters).includes('REPLACE_WITH_OPS_FALLBACK_NUMBER'))
console.log(`\nplaceholder in any node's parameters: ${leftover.length ? `YES — ${leftover.map((n) => n.name).join(', ')}` : 'no'}`)
