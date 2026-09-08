// Reads the live WhatsApp sending state from production, WITHOUT extracting the
// Meta token.
//
// The token lives in n8n credential o6dqNLf1TgJgnOIW and cannot be read out: the
// public API answers 405 on credentials, and the UI masks the field. But an HTTP
// Request node with `authentication: predefinedCredentialType` /
// `nodeCredentialType: whatsAppApi` makes n8n inject `Authorization: Bearer
// <token>` itself, for any URL. Proven on the local stack first — webhook-catcher
// received the header.
//
// The public API has no endpoint to run a workflow (only /executions reads,
// activate, deactivate), so a Webhook node is the only trigger available. That
// webhook is publicly reachable while the workflow is active, so this script
// creates, activates, calls, and destroys it in one pass: the window is seconds,
// the path is random, and every request it can make is a GET.
//
//   N8N_API_KEY=... node wa-probe-prod.mjs

import { randomBytes } from 'node:crypto'

const N8N = 'https://n8n.ilotlegal.com'
const KEY = process.env.N8N_API_KEY
const CRED = { id: 'o6dqNLf1TgJgnOIW', name: 'WhatsApp account' }
const PHONE_NUMBER_ID = '1231024886758816'
const WABA = '881512055018127'
const GRAPH = 'https://graph.facebook.com/v25.0'

if (!KEY) {
  console.error('Set N8N_API_KEY')
  process.exit(1)
}

const path = `wa-probe-${randomBytes(16).toString('hex')}`
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

const httpNode = (name, id, url, x) => ({
  parameters: {
    url,
    authentication: 'predefinedCredentialType',
    nodeCredentialType: 'whatsAppApi',
    options: {},
  },
  type: 'n8n-nodes-base.httpRequest',
  typeVersion: 4.2,
  position: [x, 0],
  id,
  name,
  credentials: { whatsAppApi: CRED },
  // A probe must not take the workflow down on a Meta error — we want to SEE it.
  onError: 'continueRegularOutput',
})

const wf = {
  name: 'TEMP wa-probe (delete me)',
  nodes: [
    {
      parameters: { httpMethod: 'GET', path, responseMode: 'lastNode', options: {} },
      type: 'n8n-nodes-base.webhook', typeVersion: 2, position: [-220, 0],
      id: 'waprobe-webhook-00000000000001', name: 'Webhook', webhookId: path,
    },
    httpNode('Health', 'waprobe-http-health-000000001',
      `${GRAPH}/${PHONE_NUMBER_ID}?fields=health_status,status,platform_type,quality_rating,display_phone_number`, 0),
    httpNode('Templates', 'waprobe-http-templates-00001',
      `${GRAPH}/${WABA}/message_templates?fields=name,status,category,language&limit=50`, 220),
    {
      parameters: {
        jsCode: `
return [{ json: {
  health: $('Health').first().json,
  templates: $('Templates').first().json,
} }];`.trim(),
      },
      type: 'n8n-nodes-base.code', typeVersion: 2, position: [440, 0],
      id: 'waprobe-code-merge-0000000001', name: 'Merge',
    },
  ],
  connections: {
    Webhook: { main: [[{ node: 'Health', type: 'main', index: 0 }]] },
    Health: { main: [[{ node: 'Templates', type: 'main', index: 0 }]] },
    Templates: { main: [[{ node: 'Merge', type: 'main', index: 0 }]] },
  },
  settings: { executionOrder: 'v1' },
}

let id = null
try {
  const created = await api('/workflows', { method: 'POST', body: wf })
  if (!created.ok) throw new Error(`create -> ${created.status}\n${created.text.slice(0, 400)}`)
  id = (created.json.data ?? created.json).id
  console.log(`created ${id}`)

  const act = await api(`/workflows/${id}/activate`, { method: 'POST', body: { versionName: 'probe' } })
  console.log(`activate -> ${act.status}`)
  if (!act.ok) throw new Error(act.text.slice(0, 400))

  await new Promise((r) => setTimeout(r, 3000))
  const hit = await fetch(`${N8N}/webhook/${path}`)
  const body = await hit.text()
  console.log(`webhook -> ${hit.status}\n`)

  let out
  try { out = JSON.parse(body) } catch { out = null }
  if (!out) {
    console.log(body.slice(0, 800))
  } else {
    const h = out.health ?? {}
    console.log('NUMBER')
    console.log(`  display        ${h.display_phone_number ?? '?'}`)
    console.log(`  status         ${h.status ?? '?'}`)
    console.log(`  platform_type  ${h.platform_type ?? '?'}`)
    console.log(`  quality        ${h.quality_rating ?? '?'}`)
    const hs = h.health_status ?? {}
    console.log(`  can_send       ${hs.can_send_message ?? '?'}`)
    const codes = []
    for (const e of hs.entities ?? []) {
      const errs = (e.errors ?? []).map((x) => `${x.error_code} ${x.error_description}`)
      codes.push(...(e.errors ?? []).map((x) => x.error_code))
      console.log(`    ${String(e.entity_type).padEnd(14)} can_send=${String(e.can_send_message).padEnd(6)} ${errs.join('; ')}`)
    }
    console.log(codes.includes(141006)
      ? '\n  >>> 141006 STILL PRESENT — no payment method. Template SENDS will fail.'
      : '\n  >>> no 141006 — a payment method appears to be in place.')
    if (h.error) console.log(`\n  Meta error: ${JSON.stringify(h.error).slice(0, 300)}`)

    console.log('\nTEMPLATES')
    const tpls = out.templates?.data
    if (!Array.isArray(tpls)) console.log(`  ${JSON.stringify(out.templates).slice(0, 300)}`)
    else if (!tpls.length) console.log('  (none registered)')
    else for (const t of tpls) console.log(`  ${String(t.name).padEnd(30)} ${String(t.status).padEnd(10)} ${t.category ?? ''} ${t.language ?? ''}`)
  }
} finally {
  if (id) {
    await api(`/workflows/${id}/deactivate`, { method: 'POST' })
    const del = await api(`/workflows/${id}`, { method: 'DELETE' })
    console.log(`\ncleanup: deactivate + delete -> ${del.status}`)
    if (!del.ok) console.log(`  !! WORKFLOW ${id} STILL EXISTS ON PRODUCTION — delete it by hand`)
  }
}
