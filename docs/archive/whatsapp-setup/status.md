# ILOT WhatsApp Bot — current build status

> ⚠️ **SUPERSEDED for anything number/WABA-related (18 Aug 2026).**
> The phone number, Phone Number ID and WABA IDs below are the **old sandbox** values,
> and the "Prod WABA `786260250486628`" line is **unconfirmed / likely stale**.
> For the current cutover to **+62 819-9480-0946**, the live IDs, and what is still
> blocking go-live, read **[`docs/whatsapp-cutover-status.md`](../../whatsapp-cutover-status.md)**
> in the repo root first. The bot-logic sections below (Gemini agent, parsing, NocoDB,
> layers, smoke tests) are still accurate.

> **Last updated:** 14 May 2026 (evening — Layer 3 complete)
> **Single source of truth — read this first.** Older runbooks
> (`01-system-user-token.md` … `04-nocodb-file-handling.md`) have
> details, but their scope and order have shifted; trust this doc when
> they conflict.

---

## TL;DR

The bot can answer a customer on WhatsApp using Gemini, parse the lead,
persist it to NocoDB, and reply cleanly. **Layer 3 is fully done as of
14 May evening.** Next session starts on Layer 4 (department admin handoff)
File handling has been **dropped from MVP** (admin will ask client to
email files instead).

---

## Architecture overview (what exists vs what's planned)

```
┌─────────────────────────────────────────────────────────────────────┐
│  Frontend (DONE)                                                     │
│  ilotlegal.com → wa.me/15556318680?text=<prefilled>                  │
└────────────────────────┬────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────────┐
│  Meta WhatsApp Cloud API — Test number +1 555-631-8680              │
│  Phone Number ID: 1063131786890917                                   │
│  Test WABA ID:    1642983990345181                                   │
│  Prod WABA ID:    786260250486628 (Ilot Property Legal — Offline)    │
│  System User token (n8n): non-expiring, scoped to both WABAs         │
└────────────────────────┬────────────────────────────────────────────┘
                         │  webhook → on inbound message
                         ▼
┌─────────────────────────────────────────────────────────────────────┐
│  n8n @ https://n8n.ilotlegal.com  (workflow: "Ilot - Inbound        │
│  Whatsapp", exported to n8n-workflows/ilot-inbound-whatsapp.json)   │
│                                                                      │
│  CURRENT STATE:                                                      │
│   ┌──────────┐    ┌──────────┐   ┌────────────────┐   ┌─────────┐  │
│   │ WhatsApp │───►│ AI Agent │──►│ Parse Lead     │──►│  Send   │  │
│   │ Trigger  │    │ Gemini + │   │ Datat (Code)   │   │ message │  │
│   │ (events: │    │ Memory   │   │ regex strips   │   │ TextBody│  │
│   │ messages)│    │          │   │ marker block;  │   │ ={{     │  │
│   │          │    │          │   │ exposes        │   │ $json.  │  │
│   │          │    │          │   │ {cleanReply,   │   │ clean   │  │
│   │          │    │          │   │  leadCaptured, │   │ Reply}} │  │
│   │          │    │          │   │  lead, phone}  │   │         │  │
│   └──────────┘    └──────────┘   └────────────────┘   └─────────┘  │
│        ▲              ▲                                              │
│  OAuth2 cred     googlePalmApi                                      │
│  "WhatsApp        cred                                              │
│  OAuth account"   "Google Gemini                                    │
│                    (PaLM) Api                                       │
│                    account"                                         │
│                                                                      │
│  NEXT TO ADD (Layer 3 finish + Layer 4):                            │
│   parseLeadData → IF leadCaptured?                                  │
│                     │true ──► NocoDB Create row in Clients          │
│                     │           │                                    │
│                     │           ▼                                    │
│                     │       (also notify admin — Layer 4 — TBD)     │
│                     │           │                                    │
│                     │false ◄────┘                                    │
│                     ▼                                                │
│                   Send message (already built — keep)                │
└────────────────────────┬────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────────┐
│  NocoDB @ https://nocodb.ilotlegal.com  (Coolify-hosted)            │
│                                                                      │
│  Base "ILOT" → table "Clients" exists with columns:                  │
│    Phone (display value), Name, Nationality, Service, Department,    │
│    Summary, Status (SingleSelect default NEW_LEAD), Created At       │
│                                                                      │
│  API token "n8n-whatsapp-bot" generated, stored in 1Password.        │
│  n8n credential "Ilot — NocoDB" added, connection test green.        │
│                                                                      │
│  Persistent storage for /usr/app/data:                               │
│  ⚠️  NOT VERIFIED YET — confirm next session                         │
└─────────────────────────────────────────────────────────────────────┘
```

---

## What works end-to-end (smoke-tested)

1. **Frontend WhatsApp deeplink** — `ilotlegal.com` buttons open
   `wa.me/15556318680?text=<prefilled message>` correctly.
2. **Meta → n8n inbound webhook** — every message to the test number
   fires the n8n workflow within ~2 s.
3. **n8n WhatsApp Trigger** payload is unwrapped — `$json.messages[0].*`
   is the canonical access path (not the old `entry[0].changes[0].value`).
4. **AI Agent (Gemini 3.1 Flash)** — replies in clean WhatsApp tone,
   collects name+nationality+service, emits `###LEAD_DATA###...
   ###END_LEAD_DATA###` block when ready.
5. **Code node ("Parse Lead Datat")** — regex extracts the JSON, strips
   the marker block from the user-visible reply, exposes `cleanReply`,
   `leadCaptured`, `lead`, `phone`, `waName`, `rawAgentOutput`.
6. **Send message** — pulls `{{ $json.cleanReply }}` and replies on
   WhatsApp with no marker leakage.

Verified live by sending: `"I want PT PMA setup. My name is Pouya
Ataei, I'm Iranian."` → received clean reply, no `###LEAD_DATA###` shown.

---

## Where we stopped (literal next click)

In n8n canvas:

1. ✅ `WhatsApp Trigger` (OAuth2 cred — type `whatsAppTriggerApi`,
   id `vAFJXGxZw8i6HQ7P`)
2. ✅ `AI Agent` (typeVersion 3.1, prompt source = define, system
   message inlined in the workflow JSON; max iterations 3)
3. ✅ `Google Gemini Chat Model` (sub-node) — credential
   `googlePalmApi` id `JjjWWqrKLljutcjM`, model
   `models/gemini-3.1-flash-lite` (consider switching to
   `gemini-flash-latest` for stronger marker-block compliance)
4. ✅ `Simple Memory` (sub-node) — sessionKey
   `={{ $json.messages[0].from }}`, contextWindowLength 15
5. ✅ `Parse Lead Datat` (Code node, see workflow JSON for the JS —
   uses two-pass regex, fence-tolerant)
6. ✅ `Send message` (`whatsAppApi` cred id `o6dqNLf1TgJgnOIW`,
   phoneNumberId `1063131786890917`,
   recipientPhoneNumber `={{ $('WhatsApp Trigger').item.json.messages[0].from }}`,
   textBody `={{ $json.cleanReply }}`)
7. ❌ **TO ADD NEXT — IF node "Lead captured?"**
   - Insert between `Parse Lead Datat` and `Send message`
   - Condition: `{{ $json.leadCaptured }}` is **true** (Boolean)
   - Connect `false` branch → existing `Send message` node
   - Leave `true` branch unconnected for now
8. ❌ **TO ADD NEXT — NocoDB "Create row" node**
   - Connect from IF's `true` branch
   - Credential: `Ilot — NocoDB` (already created)
   - API Version: v2
   - Operation: Create
   - Project: `ILOT`, Table: `Clients`
   - Field mapping (use Expression mode for each):

     | NocoDB column | Expression                          |
     |---------------|-------------------------------------|
     | Phone         | `{{ $json.phone }}`                 |
     | Name          | `{{ $json.lead.name }}`             |
     | Nationality   | `{{ $json.lead.nationality }}`      |
     | Service       | `{{ $json.lead.service }}`          |
     | Department    | `{{ $json.lead.department }}`       |
     | Summary       | `{{ $json.lead.summary }}`          |
     | Status        | `NEW_LEAD` (literal)                |
     | Created At    | `{{ new Date().toISOString() }}`    |

9. ❌ **TO ADD NEXT — connect NocoDB Create → Send message**
   - **Important:** after this connection, the Send node's `$json` will
     be the NocoDB response (different shape). Either:
     - Change Send's textBody to
       `={{ $('Parse Lead Datat').item.json.cleanReply }}` (explicit
       reach-back), OR
     - Leave it as `={{ $json.cleanReply }}` and add a Set node before
       Send to put cleanReply back into $json.
   - Recommended: explicit reach-back. Same fix needed for `recipient
     PhoneNumber` if it ever changes.

---

## Open MVP layers (after Step 9 above)

### Layer 4 — Department admin handoff (~20 min)
On the IF's `true` branch, after NocoDB Create, fan out a Switch by
`{{ $json.lead.department }}` → for each branch, a `WhatsApp Send`
that messages the relevant department admin's personal number with a
short brief and a `https://wa.me/<client phone>` deep-link the admin
can tap to open the chat with the customer.

**Blocker:** we don't yet have the 7 admin phone numbers. Need to
ask Indonesia team for them before this can be wired.

### Layer 5 — Status updates (admin → client) (~20 min)
Separate workflow:
- Trigger: NocoDB webhook → "After Update" on Clients table
- Filter: only when `Status` field changed
- Action: WhatsApp Send a friendly text mapped from the new status
  (e.g. SUBMITTED → *"Hi {Name}, your {Service} application has been
  submitted to the Ministry. We'll keep you posted."*)

Status enum values: NEW_LEAD, CONTACTED, IN_PROGRESS, COMPLETED,
ON_HOLD, CANCELLED. Could expand later (PENDING_DOCUMENTS,
PENDING_PAYMENT, SUBMITTED, etc. — see ILOT_Simple_Bot_Solution.md
for the full list, but MVP keeps it shorter).

### Layer 6 — Auto-reset bot silence flag (~10 min)
Future, when we add a `human_active` boolean to the Clients schema:
Schedule trigger every 30 min → find rows where `human_active=true`
AND `handoff_time` > 2h ago → set `human_active=false`. Means stalled
handoffs revert to bot eventually.

For MVP we can skip this — we don't have `human_active` yet, and
the bot isn't going to spam the customer either way (memory keyed by
phone means the bot remembers the handoff happened).

### Layer 7 — Frontend prompt tightening (~10 min)
The `wa.me` prefilled message already encodes the service the user
clicked, e.g. *"Hi Ilot, I'd like to learn more about your PT PMA
setup service."* The AI ignores this and asks for the service again.
Add to system prompt: *"If the user's first message already names a
specific service from the list above, treat it as collected — do not
ask again. Move directly to asking for name + nationality."*

---

### Deferred — duplicate-row handling on repeat inquiries

When the same phone re-engages with a different service, the bot
currently inserts a brand-new row in `Clients`, leading to multiple
rows for one phone. Tested 14 May — confirmed visually in NocoDB.

**Decision:** keep current behavior for MVP. Acknowledged as a known
issue. To fix later, swap the single `Create lead in NocoDB` node for
the lookup-then-branch pattern:

```
Lead Captured ?(true)
   └─► Find existing client (Get Many where Phone = current)
         └─► Client exists?
               ├─ true ──► Update existing client (preserves Status, Created At)
               └─ false ─► Create lead in NocoDB
```

Both branches converge on `Send message`.

This is documented in chat notes from 14 May 2026, runbook detail to
be written when prioritised.

## Out-of-MVP (deferred)

- File upload from client → NocoDB Attachment column
- File delivery from admin → client via WhatsApp document message
- Chatwoot for multi-admin shared inbox
- Production WhatsApp number (`Ilot Property Legal`,
  `+62 823-3994-1015`) — currently Offline. Needs Meta Business
  Verification to be cleared by Indonesia team. Once Online,
  swap two values:
  - In Coolify ilot-frontend env: `NEXT_PUBLIC_WA_NUMBER` → new digits
  - In n8n WhatsApp credentials: WABA ID and Phone Number ID

---

## Credentials / IDs cheat sheet (look these up in 1Password)

| Name in 1Password | Used by | Where |
|---|---|---|
| `ILOT — Meta WhatsApp credentials` | n8n + future bot | System User token (non-expiring), App ID, WABA IDs, Phone Number IDs |
| `ILOT — Gemini API key` | n8n Gemini Chat Model | Google AI Studio |
| `ILOT — NocoDB API token` | n8n NocoDB node | NocoDB Account Settings → Tokens |
| (Sanity creds — unrelated to bot) | Next.js site | live in Coolify Environment Variables |

n8n credential IDs (visible in workflow JSON):
- WhatsApp OAuth2 (Trigger): `vAFJXGxZw8i6HQ7P`  ("WhatsApp OAuth account")
- WhatsApp API key (Send): `o6dqNLf1TgJgnOIW`  ("WhatsApp account")
- Google Gemini PaLM: `JjjWWqrKLljutcjM`  ("Google Gemini(PaLM) Api account")
- NocoDB: created today, name `Ilot — NocoDB`

---

## Workflow JSON

Exported and committed at:

```
n8n-workflows/ilot-inbound-whatsapp.json
```

(Re-export after adding IF + NocoDB nodes — n8n's UI is the source of
truth, this file is a snapshot for git history.)

---

## Smoke tests to re-run after any change

1. Send `"hello"` from a whitelisted phone → bot greets, asks how it can
   help. NO row in NocoDB.
2. Send `"PT PMA. Pouya Ataei, Iranian"` → bot replies with clean
   handoff text, NO marker block visible. NEW row in NocoDB Clients
   with all 5 fields populated.
3. n8n Executions tab — every step shows green ✓. The `If` step shows
   one of the two output tabs populated.

---

## Common stumbles already encountered

- "send node has empty body" → 99% of the time the `Text Body`
  expression points at the wrong field name (`$json.output` after the
  Code node) — fix to `$json.cleanReply` (or use explicit reach-back
  via `$('Parse Lead Datat').item.json.cleanReply`).
- Marker block leaking into reply → regex too clever; current version
  uses two-pass parse (outer regex catches the block, inner strips
  optional ```json``` fences).
- Token "Invalid OAuth access token" → the leaked token from earlier
  was already revoked. The current valid token lives only in 1Password
  (key `ILOT — Meta WhatsApp credentials`). NEVER paste it into chat.
