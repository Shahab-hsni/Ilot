// Simulates an inbound WhatsApp message against the local n8n.
//
//   node scripts/dev/send-inbound.mjs [path/to/fixture.json] [--test]
//
// The WhatsApp trigger node verifies x-hub-signature-256 as
// HMAC-SHA256(rawBody, clientSecret) and silently returns {} when it does not
// match, so the signature is computed here rather than faked.
//
// --test posts to the /webhook-test/ URL, which only listens while the workflow
// is open in the editor with "Test workflow" armed. Without it, the post goes to
// the production /webhook/ URL, which requires the workflow to be ACTIVE — and
// active workflows run activeVersion, not the draft.

import { createHmac } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { N8N_URL, N8N_EMAIL, N8N_PASSWORD, WHATSAPP_CLIENT_SECRET } from './local-config.mjs'

const args = process.argv.slice(2)
const useTestUrl = args.includes('--test')
const fixturePath = args.find((a) => !a.startsWith('--')) || 'scripts/dev/fixtures/whatsapp-inbound.json'

async function findTriggerWebhookId() {
  const login = await fetch(`${N8N_URL}/rest/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ emailOrLdapLoginId: N8N_EMAIL, password: N8N_PASSWORD }),
  })
  const cookie = login.headers.getSetCookie().map((c) => c.split(';')[0]).join('; ')

  const list = await (await fetch(`${N8N_URL}/rest/workflows`, { headers: { cookie } })).json()
  for (const summary of list.data || list) {
    const wrapped = await (await fetch(`${N8N_URL}/rest/workflows/${summary.id}`, { headers: { cookie } })).json()
    const wf = wrapped.data || wrapped
    const trigger = wf.nodes.find((n) => n.type === 'n8n-nodes-base.whatsAppTrigger')
    if (trigger) return { workflow: wf, webhookId: trigger.webhookId, active: wf.active }
  }
  throw new Error('no workflow with a WhatsApp trigger found — import the workflows first')
}

const { workflow, webhookId, active } = await findTriggerWebhookId()
const body = readFileSync(fixturePath, 'utf8')
const signature = createHmac('sha256', WHATSAPP_CLIENT_SECRET).update(body).digest('hex')

const prefix = useTestUrl ? 'webhook-test' : 'webhook'
const url = `${N8N_URL}/${prefix}/${webhookId}/webhook`

console.log(`workflow  ${workflow.name} (${workflow.id}), active=${active}`)
console.log(`fixture   ${fixturePath}`)
console.log(`POST      ${url}`)

const res = await fetch(url, {
  method: 'POST',
  headers: { 'content-type': 'application/json', 'x-hub-signature-256': `sha256=${signature}` },
  body,
})
console.log(`response  ${res.status} ${(await res.text()).slice(0, 300)}`)

if (!active && !useTestUrl) {
  console.log('\nWorkflow is not active, so the production webhook is not registered.')
  console.log('Either activate it, or re-run with --test while the editor is armed.')
}
