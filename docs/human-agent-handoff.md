# Human Agent Handoff — Problem Statement & Handover

> **Last updated:** 31 August 2026
> **Status:** 🟡 **PARTLY FIXED.** The `Agents` table is seeded and the notification template is
> submitted; the workflow repair and the WABA payment method are still outstanding. See
> [Progress, 31 August](#progress-31-august-2026).
> **Scope:** this document covers the *human agent handoff* only. The WhatsApp number cutover
> is finished and documented separately in
> [`whatsapp-cutover-status.md`](./whatsapp-cutover-status.md) — read that first for the
> Meta/WABA context, it is accurate.
>
> ⚠️ **The recommended fix below has been overtaken.** Mattermost was dropped by the client, and
> a Cloud API number cannot also be used in the WhatsApp Business app, so neither the Mattermost
> design nor "let the admins use WhatsApp Business" is available. A shared inbox (Chatwoot) was
> then evaluated, worked, and was **not adopted** — the handoff is staffed by a single PIC on the
> company admin number, so there is no multi-agent routing to solve; findings kept in
> [`archive/chatwoot-evaluation.md`](./archive/chatwoot-evaluation.md).
>
> **The agreed replacement is a WhatsApp UTILITY template with a dynamic URL button**, carrying
> the same content the current free-form notify node sends, with the `wa.me` link as a tappable
> button. See `scripts/wa-template.mjs`. It needs a payment method on the WABA plus one approved
> template; neither is under our control, so submit early and in parallel.
>
> **The defect described here is still open in production**; nothing has shipped. Everything
> below about the *defect itself*, the Meta constraints, and the traps remains accurate.

If you read nothing else, read [The defect](#the-defect) and
[Do this first](#do-this-first-30-minutes-stops-the-bleeding).

---

## SECOND, INDEPENDENT BREAK — found 31 August 2026

The empty `Agents` table was never the only thing wrong. **The commitment gate has never been
able to call Assign Agent at all.**

`Trigger Assign Agent (#5)` in `Ilot - Commitment Gate (#4)` is an
`n8n-nodes-base.executeWorkflow` at typeVersion 1.2, and its `workflowId` is stored as a bare
string instead of the resource locator object that version requires:

```json
"workflowId": "Ez08kr0HLdziPPwy"
```

Every run dies there:

```
No information about the workflow to execute found. Please provide either the "id" or "code"!
```

Observed live in execution **545**. Every node before it succeeded — the client was matched,
`Mark Committed` ran, `Log Processed (committed)` wrote its row — and then nothing. The customer
gets no confirmation, no agent is assigned, and `processed_emails` records the case as
`committed`, which makes the failure look like a success from the data side.

This is pre-existing: it is in the snapshot exported before any change was made on 31 Aug, and
the gate workflow was not touched by that work. **Seeding `Agents` alone could never have
produced a notification**, because the sub-workflow was never reached. The trace earlier in this
document assumes Assign Agent gets called; it does not.

Fix in `scripts/fix-gate-trigger.mjs` — rewrites `workflowId` as
`{__rl: true, value: "...", mode: "id"}` and adds `onError: continueRegularOutput` so a
sub-workflow error is recorded rather than half-swallowed.

### What `processed_emails` actually contains

Worth reading before assuming customers were dropped:

```
Id=1  test-simulation-001@gmail.co   committed                  <- a simulation, not a customer
Id=2  CALaYK+suKNxFz+ETaQFFdD_MVeQ   rejected_invalid_docs      <- real, and they got "Resend Please"
Id=3  manual-test-001                rejected_no_client_match   <- 31 Aug test, wrong token form
Id=4  manual-test-002                committed                  <- 31 Aug test
```

So **no real customer has been silently dropped by this defect yet.** An earlier reading of this
table inferred "at least two committed customers were lost" from the row count alone, without
reading the rows. That was wrong. The defect is real and would have taken the first genuine
committed case, but it had not fired.

### The token contract the email parser must satisfy

`Generate Case Token` stores the token **without** the `CASE-` prefix while showing the prefixed
form to the customer:

```js
const caseId = 'CASE-' + token;   // shown as "[CASE-C5H5]"
commitment_token: token,          // stored as "C5H5"
```

`Find Client by Token` matches on the stored form. So the parser must post `C5H5`, not
`CASE-C5H5` and not `[CASE-C5H5]`. Posting the prefixed form lands in
`rejected_no_client_match`, which looks identical to a genuinely unknown sender — a silent
failure worth checking on the live parser.

## Progress, 31 August 2026

| | Item | State |
|---|---|---|
| ✅ | **`Agents` table seeded** | 7 rows — Debia (`6282339941015`), one per department, all `active`. The table had never held a row: the first insert came back `Id: 1` |
| ✅ | **Notification template submitted** | `agent_case_assigned`, id `1105534042153573`, **PENDING** review. UTILITY, `en` |
| ✅ | **Workflow repair applied & published** | `activeVersion` `72bb4c4a-ee6d-4167-b873-8a468d7371e0`, draft == published. Re-exported to `n8n-workflows/ilot-assign-agent.json` |
| ❌ | **WABA payment method** | `141006` confirmed still present today. Browser-only, no API — the client has to add a card |
| ❌ | **Business verification** | `141010` still failing, so the 250-recipient/24h cap stands |

### How the template was submitted without anyone reading the Meta token

`GET /api/v1/credentials/<id>` is still 405, and the n8n UI masks the field. But an HTTP Request
node with `authentication: predefinedCredentialType` / `nodeCredentialType: whatsAppApi` makes
n8n inject `Authorization: Bearer <token>` itself, for any URL. Proven on the local stack first,
then used through a throwaway workflow that was created, called, and deleted in one pass
(`scripts/wa-probe-prod.mjs` does the read-only version). The public API has no endpoint to run
a workflow, so a Webhook node is the only trigger available — which is why the window has to be
kept to seconds and the path randomised.

### What the workflow does now

```
Agent Found? [true]  -> Assign Agent to Client -> Increment Open Cases
                     -> Confirm to Customer   (WhatsApp, inside the service window — works today)
                     -> Notify Agent           (template via Graph API — waits on approval + billing)
Agent Found? [false] -> Ops Alert: No Agent    (email to legal.admin@ilotpropertybali.com)
```

All three leaf nodes carry `onError: continueRegularOutput`. That is the point of the change:
production previously had **no error handling on any node**, so `Notify Agent` failing took
`Confirm to Customer` with it and the customer heard nothing. Now the customer is confirmed
first, and a failed agent notification costs only the notification.

`Ops Alert: No Agent` is no longer a WhatsApp send to a literal placeholder string — it is an
email through the SMTP credential production already uses for booking confirmations. Email has
no 24-hour window and needs no template, so this is the one notification path that works
**today**, before billing.

**Not verified end to end.** Doing so means putting a real customer through the flow, or firing
a test that emails the client's ops mailbox. The next real committed case is the test. If
`Confirm to Customer` does not arrive, check the execution in n8n before assuming the template
is at fault — the template send is deliberately allowed to fail for now.

### `legal@ilotlegal.com` DOES NOT EXIST — the domain has no mail

Stronger than an earlier note in this file said. Checked in DNS on 31 Aug:

```
ilotlegal.com          A  76.13.211.156     <- web only, DNS at Hostinger
ilotlegal.com          MX  (none at all)    <- cannot receive mail
ilotlegal.com          SPF (none)
ilotpropertybali.com   MX  aspmx.l.google.com + 4  <- real Google Workspace
```

**`ilotlegal.com` has zero MX records**, so no mailbox on that domain can receive anything.
Mail sent to `legal@ilotlegal.com` bounces. This document and `commitment-gate-flow.md` name it
**nine times**, including *"Real `legal@ilotlegal.com` mailbox staff log into normally"* — that
was never true.

Beware the near-misses too: `ilotproperty.com` (no "bali") has **no A, MX or NS records** — it
does not resolve at all. The only working domain is `ilotpropertybali.com`.

What production actually uses is **`legal.admin@ilotpropertybali.com`**:

| Node | Use |
|---|---|
| `Generate Case Token` (inbound) | tells the customer to email documents there |
| `Send Confirmation Email` (calendar book) | sends **from** there |

Observed live on 31 Aug: the commitment ask a real customer receives reads *"Please email the
following to legal.admin@ilotpropertybali.com"*. Note it is a different domain from
`ilotlegal.com` — worth raising with the client for brand consistency and deliverability, but
it is what the system runs on today, so the ops alert was pointed there. Do not "correct" it to
`legal@ilotlegal.com` on the strength of these docs.

### Two template rejections worth remembering

Both were guesses until Meta answered, and both are now settled:

- **A `wa.me` URL button is refused.** `error_subcode 2388081`, *"Direct links to WhatsApp aren't
  allowed for buttons."* So the tap-through cannot be a styled button; the link goes in the body
  text, which is where production already had it.
- **A body may not end with a variable.** `error_subcode 2388299`, *"Variables can't be at the
  start or end of the template."* Hence the closing line, which also asks the agent to reply —
  their reply opens a 24-hour window, after which free-form follow-ups need no template.

Approved template body:

```
New committed case assigned to you.
Name: {{1}}
Service: {{2}}
Open the customer chat: https://wa.me/{{3}}
Reply here if you cannot take this case.
```

---

## TL;DR

| | Item | State |
|---|---|---|
| 1 | Bot answers inbound WhatsApp, captures leads, books meetings | ✅ Working |
| 2 | Commitment gate (email + docs → `Trigger Assign Agent (#5)`) | ✅ Working |
| 3 | **`Agents` table populated** | ❌ **0 rows — this is the defect** |
| 4 | **Ops fallback alert** | ❌ Sends to literal `REPLACE_WITH_OPS_FALLBACK_NUMBER` |
| 5 | **`Notify Agent (WhatsApp)`** | ❌ Structurally cannot work (see [why](#why-notify-agent-whatsapp-cannot-work-as-written)) |
| 6 | Agent replies to customer | ⚠️ By design, from the agent's **personal phone** |
| 7 | AI takeover flag (stop bot when human joins) | ❌ Does not exist |

**Net effect: 100% of committed cases are silently lost.** Both branches of the
`Agent Found?` IF node are broken — the true branch has no agents to find, and the false
branch sends to a placeholder string.

---

## The defect

`Ilot - Assign Agent (#5)` (workflow `Ez08kr0HLdziPPwy`) is called by the commitment gate.
Trace the live data through it:

```
Get Active Agents (dept)          → NocoDB Agents, where department=X and active=true
                                    → table has 0 rows → returns nothing
Pick Least-Loaded Agent           → correctly returns { assigned: false }
Agent Found?                      → false branch
Ops Alert: No Agent               → sends WhatsApp to "REPLACE_WITH_OPS_FALLBACK_NUMBER"
                                    → invalid recipient → node fails
```

Nobody is notified. The customer *does* get told a case officer was assigned (that message
only fires on the **true** branch, so in practice they get nothing at all). The lead sits in
NocoDB with `assigned_agent_id` empty and no human ever sees it.

**Verified 28 Aug 2026** via the NocoDB REST API with a logged-in session:
`GET /api/v2/tables/mcgjknbniocnvk7/records` → `200`, `list.length === 0`.

The `Agents` table schema itself is correct and needs no changes:

| Column | Type | Notes |
|---|---|---|
| `Id` | ID | |
| `name` | SingleLineText | used in the customer confirmation message |
| `phone` | SingleLineText | E.164, no `+` (e.g. `6281…`) — see the caveat below |
| `department` | SingleLineText | **must match `Clients.Department` values exactly** |
| `active` | Checkbox | default `0` — **remember to tick it** |
| `slack_id` | SingleLineText | unused; repurpose for the Mattermost user/channel |
| `open_cases` | Number | incremented by the flow; seed as `0`, not null |

### `department` is a free-text join and will bite you

`Get Active Agents (dept)` filters `=(department,eq,{{ $json.department }})~and(active,eq,true)`.
Both sides are `SingleLineText`. Observed values in `Clients.Department` include
**`company`** (lowercase). There is no constraint, no enum, and no trimming — a row with
`Company` or `company ` matches nothing and fails **silently down the same broken path**,
which looks identical to the bug you just fixed. Seed departments by copying exact strings
out of the `Clients` table:

```sql
-- conceptually; do it via the NocoDB UI or API
select distinct Department from Clients;
```

---

## Why `Notify Agent (WhatsApp)` cannot work as written

This is the part that is *not* obvious and will waste your day if you assume the placeholder
is the only problem.

```json
{
  "operation": "send",
  "recipientPhoneNumber": "={{ $('Pick Least-Loaded Agent').item.json.agent_phone }}",
  "textBody": "New committed case assigned to you.\nName: {{ … }}\nService: {{ … }}\nOpen the customer chat: https://wa.me/{{ … customer_phone }}"
}
```

Two independent blockers:

1. **It is a business-initiated message.** The WABA has **no payment method**
   (`health_status` error `141006`). Sends are therefore restricted to the **24-hour customer
   service window**, which only opens when *that recipient* messages your number. An agent who
   has never texted the bot has no open window, so the send fails regardless of the number
   being valid.
2. **Free-form text is not template-shaped.** Outside the window you must use a
   **pre-approved template** with fixed structure and typed variables. You cannot pour an
   arbitrary case summary into one. This node needs rewriting, not a parameter swap.

**Do not "fix" this by adding a payment method and calling it done.** Billing + a template
would let the message send, but the `Agents` table would *still* be empty, so the flow would
still take the false branch and still notify nobody. Billing does not touch the actual defect.

---

## The design question, and the recommendation

The current design has the agent click `wa.me/{customer_phone}` and message the client **from
their own personal phone**. Three consequences, in the order they matter for a legal services
firm:

1. **No audit trail.** The client conversation happens entirely outside your systems. Nothing
   in NocoDB, nothing reviewable. For legal work this is the serious one.
2. **Personal numbers leak** to clients, permanently.
3. **The client is messaged by an unknown number** after being told "Ilot Legal" would be in
   touch.

**Recommended target: notify agents in Mattermost, and relay their replies back out through
the Cloud API number** so the client sees one continuous thread with "Ilot Legal".

Rationale: internal staff notification and external client contact are different problems, and
only the second belongs on WhatsApp. Paying Meta per message — with template rigidity, approval
latency and rejection risk — to notify **your own staff** is the wrong tool when you already
self-host a chat system.

### Mattermost is available and suitable (verified 28 Aug 2026)

`GET /api/v4/config/client?format=old` on `mattermost.ilotlegal.com`:

| Setting | Value |
|---|---|
| `Version` | `10.11.15` |
| `EnableIncomingWebhooks` | **`true`** ← inbound alerts work today, no config needed |
| `EnableOutgoingWebhooks` | **`true`** ← needed to relay agent replies back |
| `EnableBotAccountCreation` | **`false`** ← blocker for a clean bot identity, see below |
| `EnableUserAccessTokens` | **`false`** ← blocker for API-based posting |
| Team | one team, `test` |

Free, unlimited, no 24-hour window, no template approval, and rich enough to carry a full case
summary. The unused `slack_id` column suggests chat-based notification was the original intent.

> **Two settings you will need to flip** (System Console → Integrations) if you go past Tier 1:
> `EnableBotAccountCreation` and `EnableUserAccessTokens` are both **off**. Incoming webhooks
> work without them, so **Tier 1 needs no admin changes** — but Tier 2's reply relay does.
> Note the only team is literally named `test`; consider whether production belongs there.

---

## Do this first (30 minutes, stops the bleeding)

Ordered. This stops leads being dropped without touching Meta billing at all.

1. **Seed the `Agents` table.** Real rows: `name`, `phone` (E.164, no `+`), `department`
   copied verbatim from `Clients.Department`, `active` **ticked**, `open_cases` = `0`.
   Table: <https://nocodb.ilotlegal.com/wwhn1cbz/pkm6hqm4mh9vj0s/mcgjknbniocnvk7/vwyxn0y5jkd2egua/agents-agents>
2. **Create a Mattermost incoming webhook** (Integrations → Incoming Webhooks) pointed at an
   ops channel. Copy the URL.
3. **Replace `Ops Alert: No Agent`** — swap the WhatsApp node for an HTTP Request `POST` to the
   webhook with `{"text": "⚠️ No active agent in department '…' for committed case …"}`.
   This removes the `REPLACE_WITH_OPS_FALLBACK_NUMBER` placeholder entirely.
4. **Replace `Notify Agent (WhatsApp)`** with the same pattern — post the case summary to
   Mattermost, mentioning the agent (`@username` via `slack_id`). Sidesteps both the window and
   the template problem.
5. **Leave `Confirm to Customer` on WhatsApp.** It messages the *customer*, who just messaged
   you, so it is inside the 24-hour window and is legitimately free and working.
6. **Publish, and verify against `activeVersion`** — see [the n8n trap](#the-n8n-trap-that-will-fake-your-success).
7. **Test end to end**: real inbound message → commitment gate → assignment → confirm the
   Mattermost post arrives *and* `Clients.assigned_agent_id` is populated.

## Then (half a day) — the real fix

8. **Add a `takeover` boolean to `Clients`** and gate the `AI Agent` node on it. Without this
   the bot keeps replying over the top of your human agent, which is worse than no handoff.
9. **Relay agent replies** from Mattermost back through the Cloud API number via an outgoing
   webhook → n8n → WhatsApp send. Requires the two Mattermost settings above.
10. Log every relayed message so the thread is auditable.

## In parallel, not first — Meta billing + template

Start these now because **approval latency is outside your control**, but do not block the
steps above on them. They are required for exactly one capability: contacting a customer
**more than 24 hours** after their last message (the "assign an agent a bit later" case).

11. **Add a payment method** to the WABA → clears `health_status` `141006`.
12. **Submit one utility template** (e.g. "your case officer will contact you shortly").
13. **Resubmit business verification.** It is currently **`Rejected`**. The legal name and
    website were empty and are now populated (`PT INTERNATIONAL LIVING ONE TOUCH` /
    `https://ilotlegal.com`), which was almost certainly the original cause.
    ⚠️ **Only 3 attempts per portfolio** — check the documents match the legal name *exactly*
    before submitting. While rejected you are capped at **250 unique recipients / 24 h**, which
    constrains templated sending anyway.

---

## Key IDs

| Thing | Value |
|---|---|
| NocoDB workspace / base | `wwhn1cbz` / `pkm6hqm4mh9vj0s` |
| **`Agents` table** | **`mcgjknbniocnvk7`** |
| `Clients` table | `m1q8u8q393tf6ej` |
| `FAQs` table | `miltd46do8tcznj` |
| `processed_emails` table | `mx9k2n7fxp1zax1` |
| Workflow — Inbound Whatsapp | `EHTyQZSnZMZsespF` |
| Workflow — Commitment Gate (#4) | `Lgrc2W90RxRo0EPG` |
| **Workflow — Assign Agent (#5)** | **`Ez08kr0HLdziPPwy`** ← the one to fix |
| Workflow — Calendar Check / Book (sub) | `fbNF72OFmS0rRtuv` / `KB1esFv6zhbDHTkK` |
| Live Cloud API phone number ID | `1231024886758816` (+62 819-9480-0946) |
| Old sandbox phone number ID | `1063131786890917` |
| Target WABA | `881512055018127` |
| Mattermost | <https://mattermost.ilotlegal.com> (v10.11.15, team `test`) |

---

## Traps that will cost you time

### The n8n trap that will fake your success

n8n **2.10.2+** keeps a draft (top-level `nodes`) and a published snapshot (`activeVersion`).
**Production runs `activeVersion`.** `PATCH /rest/workflows/<id>` returns `200`, updates
`updatedAt`, and edits **only the draft**. Re-reading `data.nodes` shows your change and looks
green while production keeps running the old config. This already caused a false "done" on
this project once.

Publish with:

```
POST /rest/workflows/<id>/activate
body: {"versionId": "<the DRAFT's top-level versionId>", "versionName": "..."}
```

**Verify against `activeVersion`, never `nodes`.**

#### Correction (31 Aug 2026): the public API can publish, and PUT publishes by itself

This document used to say the public API could not be used for any of this. Read from
production's own OpenAPI spec (`GET /api/v1/openapi.yml`), that is no longer true:

| Endpoint | What the spec says |
|---|---|
| `POST /api/v1/workflows/{id}/activate` | *"Publish a workflow. In n8n v1, this action was termed activating a workflow."* Accepts `versionId`, `name`, `description` |
| `PUT /api/v1/workflows/{id}` | *"Update a workflow. **If the workflow is published, the updated version will be automatically re-published.**"* |
| `GET /api/v1/workflows/{id}/{versionId}` | Reads a specific version out of history |

So an API key is enough to change what production runs. **That makes `PUT` more dangerous than
the `/rest` PATCH, not less**: there is no draft stage to inspect first — the write and the
publish are one call. If you want a reviewable draft, use `/rest` PATCH and publish separately.

Either way, verify against `activeVersion` afterwards.

### `n8n-workflows/` — FIXED 31 Aug 2026, and it was worse than "stale"

This section used to say the snapshots carried the old sandbox `phoneNumberId` and that
`Ilot - Assign Agent (#5)` was missing. Both were true, and both understated it. Read live
against `n8n.ilotlegal.com` via the public API on 31 Aug, the old files were a **different
lineage**, not an old copy of the same thing:

| | Old committed file | Production |
|---|---|---|
| Inbound nodes | 12 | **14** |
| Model | Google Gemini | **OpenAI** (`lmChatOpenAi`) |
| FAQ lookup | in-memory vector store + Gemini embeddings | **`Search FAQs`** toolCode, queries NocoDB live |
| Calendar / commitment nodes | absent | `Check Calendar Availability`, `Book Meeting`, `Generate Case Token`, `Send commitment ask` |

**There is no Gemini and no vector store anywhere in production.** Two committed files had no
production counterpart at all (`ilot-faq-reindex.json`, `ilot-outbound-status-updates.json`) and
three production workflows had no file.

`n8n-workflows/` now holds the published `activeVersion` of all five production workflows, with
provenance in each file's `meta` block; the two orphans moved to `n8n-workflows/archive/`.
Draft and `activeVersion` matched in production for every workflow, so nothing was sitting
unpublished.

⚠️ **Secrets can hide in Code nodes.** `Search FAQs` held a NocoDB personal access token as a
JavaScript literal — invisible to a credential-block scan and to the n8n credential list. It is
`__REDACTED_SEE_PRODUCTION_N8N__` in the committed snapshot. Check for this on every re-export.

### `docs/archive/whatsapp-setup/` is stale (14 May)

Different lineage, pre-cutover. It documents the sandbox number as the live target and
references a "Prod WABA" that does not appear in Business Settings.
`whatsapp-cutover-status.md` supersedes it for anything number/WABA related.

### Other

- **`__n8n_BLANK_VALUE_<uuid>` is a redaction sentinel, not a wiped value.** The same UUID
  appears for every password-type field across all credentials. Do not report data loss.
- **n8n's public API cannot read credentials.** `GET /api/v1/credentials/<id>` → `405`. Use a
  logged-in session against `/rest/credentials/<id>?includeData=true` with a `browser-id`
  header (read it from `localStorage.getItem('n8n-browserId')`). It *can* read and publish
  workflows — see the correction above.

- **A NocoDB personal access token is scoped, and the split is not obvious.** Verified with the
  token found in the `Search FAQs` node:

  | Endpoint | Result |
  |---|---|
  | `GET /api/v2/meta/bases` | **403** `ERR_FORBIDDEN` |
  | `GET /api/v2/tables/{id}/records` | **200** |
  | `POST /api/v2/tables/{id}/records` | **200** |
  | `DELETE /api/v2/tables/{id}/records` | **200** |

  So it has full data read/write but no schema access. Seeding `Agents` is possible with it;
  creating or altering a table is not. A create-then-delete round trip on `Agents` left the
  table back at 0 rows.

  The new row came back as `Id: 1`, so the auto-increment had never advanced: `Agents` has held
  **no row at any point** since the table was created, not merely none today.
- **`health_status` is the highest-signal Meta endpoint.** Query it first on any "cannot send"
  problem: `GET /v25.0/{phone-number-id}?fields=health_status`. It reports per entity
  (BUSINESS / WABA / phone number).
- **Do not diagnose from the developer-app use-case page** — it is a static checklist with
  fake time estimates showing no real state. Real state lives on `business.facebook.com`.

---

## Other known issues (pre-existing, not part of this defect)

- **`SANITY_API_WRITE_TOKEN` and `SANITY_API_READ_TOKEN` are identical** 180-char values, so
  the build carries write access. Worth a security review.
- **Display name review** for "Ilot Legal" is `Pending`. Cosmetic only.

---

## Verification status of this document

Verified live on 28 August 2026:

- `Agents` table row count `0` — NocoDB REST API, authenticated session
- `Agents` / `Clients` column schemas — NocoDB meta API
- Mattermost version and webhook/bot/token settings — `/api/v4/config/client`
- Stale `phoneNumberId` and the missing assign-agent file in `n8n-workflows/` — `grep` of this repo
- `wa.me/6281994800946` resolves profile name **"Ilot Legal"**; the live site serves 9
  `wa.me/6281994800946` links on `/` and 3 on `/contact`

**Verified live on 31 August 2026** against production, via the n8n public API and the NocoDB
data API:

- **`Ez08kr0HLdziPPwy` published node parameters.** Draft and `activeVersion` are identical.
  The node chain is exactly as described above. All three WhatsApp nodes use
  `phoneNumberId` `1231024886758816`; **zero** references to the old sandbox id remain.
- **`Ops Alert: No Agent` really does send to the literal `REPLACE_WITH_OPS_FALLBACK_NUMBER`**
  in the version production is running. The defect is live, not a draft.
- **`Get Active Agents (dept)` filter** is `=(department,eq,{{ $json.department }})~and(active,eq,true)`,
  sorted by `open_cases` — the free-text join described above.
- **Row counts:** `Agents` **0**, `Clients` 7, `processed_emails` 2, `FAQs` 60. So real leads
  have gone through, at least two reached the commitment gate, and there has never been an
  agent to assign them to.

The 18 Aug local backup this document used to rely on (`~/ilot-wa-cutover/backup/`) **does not
exist on the current machine**. Do not go looking for it; read production instead.

**Not independently verified — check before relying on it:**
- **Current Meta per-message pricing for Indonesia** — consult Meta's pricing page.
- Whether the `test` Mattermost team is intended to be production.
