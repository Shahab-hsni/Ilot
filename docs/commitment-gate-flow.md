# ILOT Commitment Gate — End-to-End Flow

> **Purpose:** Stop wasting our agents' time on tire-kickers.
> Before a human gets assigned to a customer, the customer must
> demonstrate commitment by emailing required documents. The bot
> verifies the email arrived, then — and only then — assigns an agent.

> **Status:** Built and running. The gate itself works end to end; what breaks
> immediately after it is the agent handoff — see [`human-agent-handoff.md`](./human-agent-handoff.md).
> **Replaces:** Layer 4 "department admin handoff" in `docs/archive/whatsapp-setup/status.md`.

---

## TL;DR

```
Website visitor clicks "Enquire on WhatsApp" on a service page
                              ↓
            Opens WhatsApp with a pre-filled templated message
            (auto-tagged with the exact service they were viewing)
                              ↓
                  Customer hits send — bot replies
                              ↓
                Gemini bot answers questions, qualifies the lead
                              ↓
                Bot decides "ready for a human" → generates
                a case token (e.g. CASE-AB12) and asks the
                customer to email docs to legal@ilotlegal.com
                with subject [CASE-AB12]
                              ↓
                Customer sends email + attachments
                              ↓
                Gmail receives → fires webhook to n8n
                              ↓
                n8n verifies: token matches? attachments valid?
                              ↓
                  ✅ YES                              ❌ NO
                  ↓                                    ↓
            Assign agent                       WhatsApp customer:
            Notify agent on Slack/WA            "Couldn't read your docs,
            WhatsApp customer:                   please resend as PDF"
            "Agent X will be in touch"
```

One provider (**Google Workspace**) handles both:
- Real `legal@ilotlegal.com` mailbox staff log into normally
- Native push webhooks to n8n the moment mail arrives

No IMAP polling. No second provider. No Hostinger email.

---

## Why a commitment gate

The current pipeline assigns an agent the moment the bot has enough info.
That's fast — but it also means agents get pinged for every WhatsApp message
from someone who never follows through. Three filters fall out of the email
step almost for free:

1. **Did they actually send anything?** → commitment signal
2. **Did they send the right thing?** → capability signal (literacy, has docs)
3. **Did they include the case token?** → "read instructions" signal

If any of those fail, no agent time is spent. The bot handles the loop until
the customer either commits or drops off on their own.

---

## End-to-end flow (the version to show colleagues)

### Stage 1 — Website click → WhatsApp (existing)

The customer journey begins on **ilotlegal.com**, not in WhatsApp.
On every service page there's an "Enquire on WhatsApp" button. Clicking it
opens WhatsApp with a **pre-filled templated message** specific to that
service — the customer doesn't have to type anything to get started.

```
ilotlegal.com / service page
   (e.g. "Investor KITAS")
            │
            │  user clicks "Enquire on WhatsApp"
            ▼
   wa.me/15556318680?text=
     "Hi Ilot 👋 I'd like to learn more about
      your *Investor KITAS* service. Can you help me?"
            │
            │  WhatsApp opens (web/app), message
            │  is already typed — user just hits send
            ▼
   First message arrives at our WhatsApp Business number
            │
            ▼
   n8n: Inbound WhatsApp workflow #1 fires
            │
            ▼
   Gemini agent reads the message. Because the message
   contains *Investor KITAS* in bold, Gemini knows
   exactly which service the customer is interested in
   without asking — pre-qualification is free.
            │
            ▼
   NocoDB row created:
     {phone, name (from WA profile),
      service_interest: "Investor KITAS",
      commitment_status: "in_conversation",
      source: "website-cta"}
            │
            ▼
   Bot greets customer + answers their first questions
   using the FAQ vector store (workflow #2 keeps it fresh)
```

**Why this matters for the commitment gate:**
The pre-filled `*service name*` in bold is the bot's first signal. By the
time we get to Stage 2 (the email ask), we already know which service
the customer wants and therefore which documents to ask for.

This stage is fully deployed today — no change. We just want the doc to
make clear that the funnel starts at the website button, not the WhatsApp
inbox.

### Stage 2 — The commitment ask (new)

When Gemini decides the customer is qualified and ready for a human, it
no longer assigns an agent. Instead:

```
n8n  →  generate token = "CASE-" + random 4 chars (e.g. CASE-AB12)
n8n  →  update NocoDB row:
          commitment_status = "awaiting_email"
          commitment_token  = "AB12"
          required_docs     = ["passport", "proof_of_address"]
n8n  →  send WhatsApp message to customer:

   "Great, we're ready to assign your case officer.
    Please email the following to legal@ilotlegal.com:
       • Copy of passport (PDF or photo)
       • Proof of address (utility bill, bank statement)

    Use this exact subject line so we route it correctly:
       [CASE-AB12]

    The moment we receive it, your assigned officer will reply
    on WhatsApp."
```

The token does three jobs at once:
- Disambiguates customers who share an email address (couples, family lawyers)
- Survives email clients that mangle "Re:" / "Fwd:"
- Lets us match customers whose WhatsApp number ≠ their email address

### Stage 3 — Email arrives at Google Workspace (new)

Customer sends email to `legal@ilotlegal.com`. Two things happen:

1. **Real mailbox** — staff can log in to Gmail and see it like any normal email.
2. **Push notification** — Gmail API publishes a notification to a Google Cloud
   Pub/Sub topic, which HTTP-POSTs to n8n's Gmail Trigger node.

```
Customer ─► smtp.gmail.com ─► legal@ilotlegal.com (real mailbox)
                                    │
                                    │ Gmail API watch()
                                    ▼
                            Cloud Pub/Sub topic
                                    │ push subscription
                                    ▼
                            n8n: Gmail Trigger node
                                  (fires within seconds)
```

No IMAP polling. No missed messages. No duplicate-trigger headaches.
n8n's Gmail Trigger handles the Pub/Sub plumbing — we just authenticate
once with OAuth.

### Stage 4 — The commitment-gate workflow (new — workflow #4)

```
Gmail Trigger
    │  payload: {messageId, from, subject, attachments[]}
    ▼
[Set] extract:
    from_email      = parse address out of "From"
    token           = match /\[CASE-(\w+)\]/ on subject
    message_id      = headers["Message-Id"]
    attachment_meta = list of {filename, mimeType, size}
    │
    ▼
[Remove Duplicates] compare on message_id
    │  (n8n persists this across executions — idempotency safety net)
    ▼
[IF] all true:
       • token != null
       • attachments.length >= 1
       • at least one attachment in [pdf, jpg, png, heic]
       • that attachment > 10 KB (filters blank scans)
    │
    ├── false ──►  [WhatsApp] "We received your email but couldn't
    │                          read the documents. Please resend
    │                          your passport + proof of address
    │                          as PDF or photo."
    │              [NocoDB]   log rejection reason
    │              END
    │
    └── true ──►  [NocoDB - Get Row] where commitment_token = token
                       │
                       ▼
                 [IF] row found AND status = "awaiting_email"
                       │
                       ├── false ──►  [Slack/Email ops]
                       │              "Unmatched email needs human review"
                       │              END
                       │
                       └── true ──►   [NocoDB - Update Row]
                                        commitment_status = "committed"
                                        committed_at      = now()
                                        attachments_drive_url = <link>
                                        message_id        = ...
                                        ▼
                                     [Trigger Workflow #5]
```

### Stage 5 — Agent assignment (new — workflow #5)

```
[Webhook from #4] payload: {customer_id, service, attachments_url}
    │
    ▼
[NocoDB - Get Many] agents where:
       department = service.department
       active = true
    │
    ▼
[Code] pick agent with fewest open cases this week
    │
    ▼
[NocoDB - Update Row] customer.assigned_agent = agent.id
    │
    ▼
[Slack/WhatsApp DM to agent]
    "New committed case: {customer_name}
     Service: {service}
     Docs: {attachments_url}
     WhatsApp: wa.me/{customer_phone}"
    │
    ▼
[WhatsApp to customer]
    "Your case officer {agent_name} has been assigned.
     They'll reach out within 1 business day."
```

### Stage 6 — Agent reply (existing pattern)

Agent replies to the customer directly on their WhatsApp Business app.
That's already how Layer 4 works in the current proposal — we just gated
it behind the email-commitment check.

---

## The whole picture

```
┌────────────────────────────────────────────────────────────────────────┐
│                        ILOT COMMITMENT-GATED FUNNEL                     │
└────────────────────────────────────────────────────────────────────────┘

   Customer                                              Staff & Systems
   ────────                                              ───────────────

   Browses ilotlegal.com
   Lands on service page                                 Next.js + Sanity
        │
        │ clicks "Enquire on WhatsApp"
        ▼
   wa.me deep-link with                                  (pre-filled message
   pre-filled "*Service Name*"                            generated from
        │                                                 Sanity service data)
        │ user hits send
        ▼
   First WhatsApp message                                n8n Workflow #1
        │                                                "Inbound WhatsApp"
        └──────────►  Gemini AI bot  ◄────FAQ vectors─── n8n Workflow #2
                          │                              "FAQ Reindex" (cron)
                          │
                          │  (qualified, ready for human)
                          ▼
                     Generate CASE-XXXX token
                     WhatsApp customer the ask
                          │
                          ▼
   Customer reads ask                                    NocoDB row:
        │                                                  status = awaiting_email
        ▼
   Sends email
   to legal@ilotlegal.com  ──────►  Google Workspace  ─► Real mailbox (staff visible)
                                          │
                                          │ Pub/Sub push
                                          ▼
                                    n8n Workflow #4
                                    "Commitment Gate"
                                          │
                                ┌─────────┴─────────┐
                                ▼                   ▼
                           docs invalid         docs valid
                                │                   │
                                ▼                   ▼
                           WhatsApp:          NocoDB row:
                           "resend please"      status = committed
                                                    │
                                                    ▼
                                             n8n Workflow #5
                                             "Assign Agent"
                                                    │
                                  ┌─────────────────┼────────────────┐
                                  ▼                 ▼                ▼
                            Slack DM agent   WhatsApp customer  NocoDB row:
                                              "agent assigned"   assigned_agent_id
                                                    │
                                                    ▼
                                             Agent replies on
                                             WhatsApp Business
                                                    │
                                                    ▼
                                           ◄── status changes ──►
                                                    │
                                                    ▼
                                             n8n Workflow #3
                                             "Outbound Status"
                                             keeps customer informed
```

---

## What changes in our stack

| Component | Before | After |
|---|---|---|
| Email host | Hostinger mailbox | **Google Workspace** ($7/user/mo) |
| Inbound mail to n8n | (nothing — manual) | Gmail API push → Pub/Sub → n8n |
| Outbound transactional | Hostinger SMTP | Gmail API send (same provider) |
| n8n workflows | 3 (Inbound, FAQ, Outbound Status) | 5 (+ Commitment Gate, + Assign Agent) |
| NocoDB columns added | — | `commitment_status`, `commitment_token`, `committed_at`, `attachments_drive_url`, `assigned_agent_id` |
| New NocoDB table | — | `processed_emails` (unique constraint on `message_id` for idempotency) |

**Net cost:** ~$7/user/mo. We drop Hostinger email entirely.

---

## Why Google Workspace and not the alternatives

We considered four paths. This is the trade summary:

| Option | Mailboxes for staff | Webhook for n8n | Monthly | Ops burden |
|---|---|---|---|---|
| Hostinger + Postmark | ✅ Hostinger | ✅ Postmark | ~$18 | Low (two providers) |
| Self-host Stalwart on Coolify | ✅ | ✅ native | ~$5 VPS | **High** (deliverability, port 25, IP reputation) |
| Microsoft 365 | ✅ | ✅ Graph webhooks | ~$6/user | Medium (Azure AD setup) |
| **Google Workspace** ⭐ | ✅ | ✅ Pub/Sub push | **$7/user** | **Low** |

Google Workspace wins because:
- One provider, one bill, one auth
- n8n has a first-class Gmail Trigger node — the Pub/Sub plumbing is configured once and forgotten
- Best-in-class deliverability (we send legal docs; spam folder = lost customer)
- Staff already know Gmail UI — zero training
- Calendar + Drive included if/when we need them

Self-hosting was tempting but the realistic ops burden — IP reputation, port 25
policies, blocklist monitoring, deliverability tuning — is not worth it for a
legal-services business where missed mail = missed revenue.

---

## Open questions for the team

1. **Which domain owns the mailbox?** Currently `ilotlegal.com`. Confirm the
   domain DNS is somewhere we can change MX records (Cloudflare? registrar?).
2. **How many staff mailboxes?** Each Workspace seat is $7/mo. The bot itself
   only needs one (`legal@`). Agents may want their own.
3. **What docs do we actually require per service?** The list above
   (passport + proof of address) is a placeholder — real list depends on
   service category. Suggest we map this in `docs/seed-data/raw.json` per
   service.
4. **What's the timeout for "awaiting_email"?** If a customer never sends
   the email, do we follow up after 24h / 48h / 1 week, then mark dropped?
   Recommend: WhatsApp nudge at 24h, drop at 7d.
5. **Do agents reply from Gmail or only WhatsApp?** If staff also email
   customers from Gmail, those threads should sync back into NocoDB. Out of
   scope for v1 but worth flagging.

---

## Implementation order (suggested)

1. Buy Google Workspace seat for `ilotlegal.com`, migrate MX (1 hr)
2. Set up GCP project + Pub/Sub topic + service account (1 hr)
3. Wire n8n Gmail Trigger, smoke-test with a manual email (30 min)
4. Add NocoDB columns + `processed_emails` table (15 min)
5. Modify Workflow #1 to generate token + send commitment ask (1 hr)
6. Build Workflow #4 (commitment gate) (2 hr)
7. Build Workflow #5 (agent assignment) (1 hr)
8. End-to-end test with a real WhatsApp number + real email (1 hr)
9. Deploy + monitor first week of real traffic (~1 hr/day for a week)

**Total build:** ~1 working day. Plus monitoring.

---

## Appendix — n8n Gmail Trigger setup notes

- Node: `n8n-nodes-base.gmailTrigger` (already in standard n8n).
- Auth: OAuth2 with Google scopes `gmail.readonly` + `gmail.modify`.
- Trigger mode: "Message Received" (uses Gmail's `users.watch` under the hood).
- Filter: `to:legal@ilotlegal.com has:attachment` — server-side filter so we
  don't fire on staff-typed mail.
- Renewal: Gmail watches expire every 7 days. n8n re-registers automatically
  when the workflow is active. Add a "workflow disabled" alert just in case.
- Idempotency: dedupe on `headers.message-id` via the Remove Duplicates node
  AND the `processed_emails` NocoDB unique constraint. Belt + braces because
  push notifications can occasionally double-fire on Pub/Sub redelivery.
