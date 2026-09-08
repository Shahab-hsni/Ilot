// Reads the live WhatsApp sending state, and submits the agent-notification
// template. Both halves need META_TOKEN_ILOT — a system-user token on app
// 977601884782973 with whatsapp_business_messaging + whatsapp_business_management.
//
//   META_TOKEN_ILOT=... node scripts/wa-template.mjs status
//   META_TOKEN_ILOT=... node scripts/wa-template.mjs submit            # dry run
//   META_TOKEN_ILOT=... node scripts/wa-template.mjs submit --commit
//
// WHY THIS EXISTS
//
// `Notify Agent (WhatsApp)` in Ilot - Assign Agent (#5) sends free-form text to
// an agent who has never messaged the bot. That cannot work: outside the 24-hour
// customer service window only a pre-approved template may be sent, and the
// window only opens when *that recipient* messages your number first.
//
// A template with a dynamic URL button carries the same content the free-form
// message does, including the tap-through to the customer chat. Verified against
// Meta's own docs: a URL button "Supports 1 variable, appended to the end of the
// URL string", max two URL buttons, and variable values must be percent-encoded.
// Body variables may not contain newlines — but the body's FIXED text may, so the
// multi-line shape of the current message survives.

const GRAPH = 'https://graph.facebook.com/v25.0'
const TOKEN = process.env.META_TOKEN_ILOT
const WABA = process.env.ILOT_WABA_ID || '881512055018127'
const PHONE_NUMBER_ID = process.env.ILOT_PHONE_NUMBER_ID || '1231024886758816'

const TEMPLATE_NAME = process.env.ILOT_TEMPLATE_NAME || 'agent_case_assigned'

// Mirrors the current production message, which is:
//
//   New committed case assigned to you.
//   Name: {customer_name}
//   Service: {service}
//   Open the customer chat: https://wa.me/{customer_phone}
//
// The fourth line becomes the button, which is tappable rather than a bare URL.
const TEMPLATE = {
  name: TEMPLATE_NAME,
  language: 'en',
  // UTILITY, not MARKETING: it is a transactional notification, not promotion.
  // NOTE: this is the reviewer's judgement, not ours. The message notifies our
  // own staff about a customer's case, which is an unusual shape for UTILITY.
  // Rejection is a real possibility — submit early, do not block on it.
  category: 'UTILITY',
  components: [
    {
      type: 'BODY',
      text: 'New committed case assigned to you.\nName: {{1}}\nService: {{2}}',
      example: { body_text: [['Andi Wijaya', 'KITAS']] },
    },
    {
      type: 'BUTTONS',
      buttons: [
        {
          type: 'URL',
          text: 'Open customer chat',
          // One variable, at the very end of the string. Digits need no
          // percent-encoding.
          url: 'https://wa.me/{{1}}',
          example: ['https://wa.me/6281234567890'],
        },
      ],
    },
  ],
}

const cmd = process.argv[2]
const commit = process.argv.includes('--commit')

if (!TOKEN) {
  console.error('\nSet META_TOKEN_ILOT. Without it neither half of this script can run.')
  process.exit(1)
}

async function graph(path, { method = 'GET', body } = {}) {
  const res = await fetch(`${GRAPH}${path}`, {
    method,
    headers: { authorization: `Bearer ${TOKEN}`, 'content-type': 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
  const json = await res.json().catch(() => ({}))
  return { ok: res.ok, status: res.status, json }
}

async function status() {
  // health_status is the highest-signal endpoint: it reports per entity
  // (BUSINESS / WABA / phone number) and is what exposed the real blocker during
  // the number cutover.
  const health = await graph(`/${PHONE_NUMBER_ID}?fields=health_status,status,platform_type,quality_rating,display_phone_number`)
  console.log(`\nGET phone number -> ${health.status}`)
  if (!health.ok) {
    console.log(JSON.stringify(health.json, null, 2).slice(0, 600))
    return
  }
  const d = health.json
  console.log(`  number        ${d.display_phone_number ?? '?'}`)
  console.log(`  status        ${d.status ?? '?'}`)
  console.log(`  platform      ${d.platform_type ?? '?'}`)
  console.log(`  quality       ${d.quality_rating ?? '?'}`)

  const entities = d.health_status?.entities ?? []
  console.log(`  can_send_message: ${d.health_status?.can_send_message ?? '?'}`)
  for (const e of entities) {
    const errs = (e.errors ?? []).map((x) => `${x.error_code} ${x.error_description}`).join('; ')
    console.log(`    ${String(e.entity_type).padEnd(14)} ${String(e.can_send_message).padEnd(10)} ${errs}`)
  }
  // 141006 is the one that decides whether templates are sendable at all.
  const codes = entities.flatMap((e) => (e.errors ?? []).map((x) => x.error_code))
  console.log(
    codes.includes(141006)
      ? '\n  ⚠️  141006 present — no payment method. Template sends will fail until a card is added.\n      That is a browser action on business.facebook.com; it has no API.'
      : '\n  ✅ no 141006 — a payment method appears to be in place.',
  )

  const tpl = await graph(`/${WABA}/message_templates?fields=name,status,category,language&limit=50`)
  console.log(`\nGET templates -> ${tpl.status}`)
  for (const t of tpl.json?.data ?? []) {
    console.log(`  ${String(t.name).padEnd(28)} ${String(t.status).padEnd(10)} ${t.category ?? ''} ${t.language ?? ''}`)
  }
  if (!(tpl.json?.data ?? []).length) console.log('  (none)')
}

async function submit() {
  const existing = await graph(`/${WABA}/message_templates?fields=name,status&limit=100`)
  const already = (existing.json?.data ?? []).find((t) => t.name === TEMPLATE_NAME)
  if (already) {
    console.log(`\ntemplate "${TEMPLATE_NAME}" already exists with status ${already.status} — nothing to do`)
    return
  }

  console.log(`\nPOST /${WABA}/message_templates`)
  console.log(JSON.stringify(TEMPLATE, null, 2))

  if (!commit) {
    console.log('\nDRY RUN — nothing submitted. Re-run with --commit to submit.')
    console.log('Approval is asynchronous and outside our control; poll with `status`.')
    return
  }

  const res = await graph(`/${WABA}/message_templates`, { method: 'POST', body: TEMPLATE })
  console.log(`\n-> ${res.status}`)
  console.log(JSON.stringify(res.json, null, 2).slice(0, 800))
}

if (cmd === 'status') await status()
else if (cmd === 'submit') await submit()
else {
  console.error('\nUsage: node scripts/wa-template.mjs status | submit [--commit]')
  process.exit(1)
}
