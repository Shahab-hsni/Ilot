# ILOT — What's Next (MVP — verified against live official docs)

> **About this doc.** MVP scope: **Coolify + n8n + Google Sheets + Google Drive + WhatsApp Cloud API**. Chatwoot and any other human-inbox layer are **deliberately out of scope for v1** — admins reply directly from the WhatsApp Business App or a WhatsApp Web session **[CORRECTION, 31 Aug 2026: this is not possible. A number registered on Cloud API cannot also be used in the WhatsApp Business app — verified against Meta's docs. +62 819-9480-0946 is `platform_type: CLOUD_API`, so putting admins in the Business app would mean deregistering it and taking the bot down. Admins are notified by template instead; see docs/human-agent-handoff.md.]**, per the architecture in `ILOT_Simple_Bot_Solution.md`. Every URL and quote below was fetched live from the official source on **4 May 2026**. Any place where the official page paraphrases rather than quotes is flagged *(paraphrased)*. Meta renames paths often — re-check the Meta URLs quarterly.

**Current state**

- Hostinger VPS is live, Coolify installed.
- A domain is pointed at the VPS (placeholder: `ilot.example` — swap in the real one).
- A Facebook developer account exists.

**Goal (MVP)**
A client messages the ILOT WhatsApp number → n8n receives the message → AI agent replies → when the AI has captured name + nationality + service, n8n writes a row to Google Sheets, creates a Drive folder for the client, and WhatsApps the right department admin with a `wa.me/…` handoff link. Admins reply directly from their phone. Total build time: ~1 day of infra + waiting on Meta (1–3 business days for display-name review and Business Verification). **Start Phase 1 (Meta) in parallel with Phase 2 (n8n) — Meta is the long pole.**

---

## Phase 0 — Secure and finish the Coolify install (15 min)

### 0.1 Claim the root admin account immediately

**Docs:** <https://coolify.io/docs/get-started/installation>
**Verbatim from the page (DANGER callout):** *"Immediately create your admin account after installation. If someone else accesses the registration page before you, they might gain full control of your server."*

1. Open `http://<VPS_IP>:8000`.
2. Register email + strong password.

### 0.2 Put the Coolify dashboard itself on your domain over HTTPS

There is **no dedicated "instance settings" doc page** on coolify.io — the procedure is covered by combining the installation page with the DNS page.

**Docs (DNS / wildcard):** <https://coolify.io/docs/knowledge-base/dns-configuration> — verbatim: *"You can configure a wildcard domain for your applications, so you don't have to configure each domain separately."*

1. DNS: add an **A record** `coolify.ilot.example` → VPS IP.
2. DNS: add a **wildcard A record** `*.ilot.example` → VPS IP (so every app you deploy gets auto-TLS on its own subdomain).
3. Coolify UI → user menu → **Settings** → fill **Instance's Domain** = `https://coolify.ilot.example` → **Save**. Coolify's bundled Traefik requests the Let's Encrypt cert on the next request.
4. Verify `https://coolify.ilot.example` serves the dashboard over TLS. Stop using `IP:8000` after this.

### 0.3 Firewall / ports

Open **80, 443, 8000, 6001, 6002** on the Hostinger VPS firewall panel.

```bash
# on the VPS
ss -ltnp | grep -E ':(80|443|8000|6001|6002)\b'
# if Hostinger shipped nginx/apache pre-installed, stop them:
systemctl disable --now apache2 nginx 2>/dev/null || true
```

### 0.4 Enable backups

**Docs:** <https://coolify.io/docs/knowledge-base/backups> — Coolify supports scheduled backups per database (Postgres/MySQL/MariaDB/MongoDB) to S3 or local. Turn this on **before** putting real data in the system — each database has its own **Backups** tab in the UI.

---

## Phase 1 — WhatsApp Cloud API onboarding (start NOW, ~1–3 business days)

> Meta migrated the entire WhatsApp developer doc tree from `developers.facebook.com/docs/whatsapp/cloud-api/…` to `developers.facebook.com/documentation/business-messaging/whatsapp/…` — and many pages collapsed out the `/cloud-api/` segment entirely. Old URLs 301-redirect, but the canonical URLs below are the real ones today.

### 1.1 Create / confirm the Meta Business Portfolio (ex-"Business Manager")

**Docs:** <https://developers.facebook.com/documentation/business-messaging/whatsapp/cloud-api/overview>

A **business portfolio** (Meta's 2024+ name for "Business Manager account") is the container that holds your WhatsApp Business Account (WABA), phone numbers, system users, and assets.

- <https://business.facebook.com/> → create portfolio for ILOT → add legal business name, website, physical address.
- **Start Business Verification in parallel** → Business Manager → **Security Center → Start Verification**. Docs: <https://www.facebook.com/business/help/1710077379203657> ("About business verification"). Upload ILOT's registration document (Akta Pendirian / NIB). This unlocks higher messaging tiers and marketing templates later. Don't block on it.

### 1.2 Create the App and add the WhatsApp product

**Docs:** <https://developers.facebook.com/documentation/business-messaging/whatsapp/get-started>

1. <https://developers.facebook.com/apps/> → **Create App** → type **Business** → link to the portfolio from 1.1.
2. App dashboard → **Add Products** → **WhatsApp → Set up**.
3. Meta auto-provisions a **test WABA** + a **test phone number** (`+1 555 …`). From this number you can send free of charge to up to **5 recipient phone numbers** that you explicitly whitelist.

### 1.3 Capture the IDs you'll paste into n8n

From **WhatsApp → API Setup**, copy:
- **Phone Number ID** (numeric — the ID of the test or, later, production number).
- **WhatsApp Business Account ID** (WABA ID).
- **App ID** (in App Settings → Basic).

### 1.4 Generate a **non-expiring** System User access token (most important step)

The "temporary" user token visible on API Setup lives only **24 hours**. In production use a **System User** token.

**Docs:**
- System users (general): <https://developers.facebook.com/docs/development/create-an-app/app-dashboard/system-users/>
- Business Help: <https://www.facebook.com/business/help/503306463479099> ("Add system users to your business portfolio")

The old `business.facebook.com/settings/system-users` URL 302-redirects to a login wall; the live canonical path today is **<https://business.facebook.com/latest/settings/system_users>**.

Procedure:

1. <https://business.facebook.com/latest/settings/system_users> → **Add** → name `n8n-whatsapp-bot`, role **Admin**.
2. Select the system user → **Add Assets** → choose the **WhatsApp Account** (the WABA) → grant **Full Control**.
3. **Generate New Token** → pick the App from 1.2 → scopes **`whatsapp_business_messaging`** + **`whatsapp_business_management`** → **Token expiration: Never** → **Generate** → paste into a password manager (Meta will not show it again).

> **Re-check at go-live:** if Meta has removed the "Never" option by the time you reach this step and only offers 60 days, add an n8n Cron job that regenerates the token every 50 days and updates the saved credential.

### 1.5 Add a real (production) phone number

Done from WhatsApp Manager at <https://business.facebook.com/wa/manage/> → **Phone numbers → Add phone number**. Verify by SMS or voice. Pick a **Display Name** — Meta reviews it in 24–72 h and will reject it if it doesn't match ILOT's registered trading name.

### 1.6 Understand the current messaging limits (the old 250/1K/10K/100K "tier" scheme was replaced)

**Docs (verified live today):** <https://developers.facebook.com/documentation/business-messaging/whatsapp/cloud-api/messaging-limits>

Verbatim from the live page:

> *"Messaging limits are the maximum number of unique WhatsApp user phone numbers your business can deliver messages to, outside of a customer service window, within a moving 24-hour period."*

> *"Messaging limits are calculated and set at the business portfolio level and are shared by all business phone numbers within a portfolio."*

> *"Newly created business portfolios have a messaging limit of 250, but this limit can be increased to:"* → **2,000** (scaling path), **10,000** (automatic scaling), **100,000** (automatic scaling), **Unlimited** (automatic scaling).

**Summary:** new portfolios start at **250 unique recipients per rolling 24 h**, portfolio-scoped (not per phone number). Fine for MVP. The first jump to 2,000 needs a "scaling path" event; higher jumps are automatic based on quality + volume.

### 1.7 Understand the 24-hour customer-service window (critical to the workflow design)

**Docs:** <https://developers.facebook.com/documentation/business-messaging/whatsapp/messages/send-messages> (canonical today — the old `/cloud-api/messages/send-messages` URL 404s).

*(paraphrase of the live page):* You can freely send a **"service" (free-form) message** — text, image, video, document, etc. — to a user only **within 24 hours of their most recent inbound message to you**. Outside that window, the only thing you can send is a **pre-approved Message Template**. Register templates at <https://business.facebook.com/wa/manage/> → Message Templates. Docs: <https://developers.facebook.com/documentation/business-messaging/whatsapp/message-templates>.

For ILOT's MVP: every client reply from n8n happens inside the 24-hour window (the client just messaged in), so free-form is fine. Only the **status-update** and **final-document-delivery** workflows might fire >24 h later — those need UTILITY templates. See Phase 5.

### 1.8 Don't configure Meta's webhook yet

You'll do it in Phase 3, after n8n exists and gives you a webhook URL.

---

## Phase 2 — Deploy n8n via Coolify (20 min)

**Docs:** <https://coolify.io/docs/services/n8n> — n8n ships as a first-class one-click service template in Coolify.

### 2.1 Project → Service

1. Coolify → **Projects → + New** → name `ilot`.
2. Environment "production" auto-created.
3. **+ New Resource → Service → n8n**.

### 2.2 Set the public domain

Service **General / Configuration** tab → **Domains** → `https://n8n.ilot.example`. Traefik routing + Let's Encrypt cert are automatic (per the DNS doc cited in 0.2).

### 2.3 Set the env vars n8n requires in production

**Docs (deployment env vars):** <https://docs.n8n.io/hosting/configuration/environment-variables/deployment/> — verified verbatim on the live page today:

- `N8N_HOST` — *"Host name n8n runs on."*
- `N8N_PROTOCOL` — *"The protocol used to reach n8n."*
- `N8N_EDITOR_BASE_URL` — *"Public URL where users can access the editor. Also used for emails sent from n8n and the redirect URL for SAML based authentication."*
- `N8N_ENCRYPTION_KEY` — *"Provide a custom key used to encrypt credentials in the n8n database. By default n8n generates a random key on first launch."* **Set this ONCE — never change it, or every saved credential becomes unreadable.**

**Docs (endpoints env vars):** <https://docs.n8n.io/hosting/configuration/environment-variables/endpoints/> — `WEBHOOK_URL` is the variable that tells n8n the outside-world URL to advertise when webhook nodes ask for their public URL. Critical when n8n is behind Coolify's Traefik reverse proxy.

**Docs (supported databases):** <https://docs.n8n.io/hosting/configuration/supported-databases-settings/> — `DB_TYPE=postgresdb` is the exact value; `sqlite` is the default if omitted. Coolify's n8n template already wires Postgres for you, so leave `DB_*` alone.

**Docs (task runners):** <https://docs.n8n.io/hosting/configuration/task-runners/> — *(paraphrased)* task runners are the current best-practice execution mode; opt in with `N8N_RUNNERS_ENABLED=true`.

Coolify service → **Environment Variables**:

```env
N8N_HOST=n8n.ilot.example
N8N_PROTOCOL=https
N8N_PORT=5678
N8N_EDITOR_BASE_URL=https://n8n.ilot.example
WEBHOOK_URL=https://n8n.ilot.example/
N8N_ENCRYPTION_KEY=<openssl rand -hex 32>   # generate once, store in 1Password, NEVER change
N8N_RUNNERS_ENABLED=true
EXECUTIONS_MODE=regular
GENERIC_TIMEZONE=Asia/Jakarta
TZ=Asia/Jakarta
```

Leave `DB_TYPE` / `DB_POSTGRESDB_*` at Coolify's template defaults.

Deploy → wait for green.

### 2.4 Owner account

<https://n8n.ilot.example> → create owner account. Community (free) is fine.

### 2.5 Back up n8n

Coolify → the Postgres sub-resource under the n8n stack → **Backups** tab → enable daily. Also snapshot the `/home/node/.n8n` volume (holds binary files and, importantly, your encryption key if you ever lose the env var).

---

## Phase 3 — Wire n8n's WhatsApp Trigger to Meta (the only tricky part)

### 3.1 Create the n8n WhatsApp credentials

**Docs:** <https://docs.n8n.io/integrations/builtin/credentials/whatsapp/>

n8n → **Credentials → New → WhatsApp OAuth API** (this is the credential used by BOTH the **WhatsApp Trigger** and the **WhatsApp** action node). Fill:

- **Access Token** — the non-expiring System User token from **1.4**.
- **Business Account ID** — the WABA ID from **1.3**.

> The n8n docs page at the URL above is intentionally sparse. These two fields are what the credential currently asks for in the UI. You also need a separate **Verify Token** below for the trigger itself.

### 3.2 Add a "WhatsApp Trigger" node to your first workflow

**Docs:** <https://docs.n8n.io/integrations/builtin/trigger-nodes/n8n-nodes-base.whatsapptrigger/>

1. New workflow in n8n → add **WhatsApp Trigger** node (not the generic Webhook node).
2. Attach the credential from 3.1.
3. **Updates → Message** (to receive inbound client messages). Optionally also **Message status** if you care about delivery receipts.
4. When you open the node, n8n displays the webhook's **Production URL** in the format `https://n8n.ilot.example/webhook/<uuid>` (and a separate **Test URL** at `/webhook-test/<uuid>` used only when the node is in "Listen for Event" mode during manual testing). Copy the **Production URL**.
5. On the same node, set (or auto-generate) a **Verify Token** — any random string (e.g. `openssl rand -hex 16`). You'll paste this into Meta next.
6. **Save and Activate** the workflow (top-right toggle). The webhook is only served when the workflow is active.

### 3.3 Register the webhook in Meta

**Docs (webhook handshake):** <https://developers.facebook.com/docs/graph-api/webhooks/getting-started>

*(paraphrased from the live page):* when you save a webhook subscription, Meta issues an HTTP **GET** to your callback URL with `hub.mode=subscribe`, `hub.challenge=<random>`, and `hub.verify_token=<your token>`; the endpoint must respond **HTTP 200** with the value of `hub.challenge` as the plain-text body. **n8n's WhatsApp Trigger handles this automatically** when the workflow is active — you don't write code, but the workflow **must be Active** for the GET to succeed.

Meta app dashboard → **WhatsApp → Configuration → Webhook → Edit**:

- **Callback URL:** the Production URL from step 3.2.4 (e.g. `https://n8n.ilot.example/webhook/4f0a…`).
- **Verify Token:** the random string from 3.2.5.
- Click **Verify and Save** → green tick confirms the challenge succeeded.

Then **Webhook fields → Manage → subscribe to**:

- `messages` *(required — inbound customer messages)*
- `message_template_status_update` *(notifies when your Message Templates are approved / rejected — useful even at MVP)*
- *optional:* `message_status` *(delivery receipts — skip for MVP; chatter in the logs)*

Docs for webhook fields: <https://developers.facebook.com/documentation/business-messaging/whatsapp/cloud-api/webhooks/components>.

### 3.4 Smoke test: inbound message

From a non-admin phone, WhatsApp the test number. In n8n → Executions → you should see the trigger fire within ~2 seconds and the payload should contain `entry[0].changes[0].value.messages[0].text.body`.

---

## Phase 4 — Build the three MVP workflows (Google Sheets + Drive + WhatsApp)

Per `ILOT_Simple_Bot_Solution.md` you need exactly three workflows. Do them in this order.

### 4.1 Google credentials (service account — no OAuth redirect needed for a server)

**Docs:** <https://docs.n8n.io/integrations/builtin/credentials/google/service-account/>

1. <https://console.cloud.google.com/> → new project "ilot-automation" → **IAM & Admin → Service Accounts → Create** → name `n8n-ilot`.
2. **Keys → Add Key → JSON** → download the JSON.
3. **APIs & Services → Enable APIs** → enable **Google Sheets API** and **Google Drive API**.
4. Back in Google Drive, **share** the `ILOT Master Database` Sheet AND the `ILOT_Clients/` Drive folder with the service-account's email (looks like `n8n-ilot@ilot-automation.iam.gserviceaccount.com`) as **Editor**.
5. n8n → **Credentials → New → Google Service Account** → paste the JSON.

> **Drive quota caveat (Google-side):** service accounts don't have personal Drive storage. For the MVP that's fine because the Drive folder lives in a **real user's Drive** (or Shared Drive) and the service account is only an editor. If you later move to a **Shared Drive**, you must also add the service account as a member of the Shared Drive — per Google's docs, otherwise writes fail with 403. (Google Workspace docs, not n8n-specific.)

### 4.2 Workflow 1: AI chatbot + lead capture

**Trigger:** WhatsApp Trigger (built in Phase 3.2) — event **Message**.

Minimum nodes (follow the `ILOT_Simple_Bot_Solution.md` design):

1. **WhatsApp Trigger** — fires on inbound message.
2. **IF** — drop everything that isn't a text/media message (ignore `statuses[]` events etc.).
3. **IF** — drop if the client's phone is currently flagged `human_active=true` in the `Conversations` Google Sheet.
4. **AI Agent** node.
   **Docs:** <https://docs.n8n.io/integrations/builtin/cluster-nodes/root-nodes/n8n-nodes-langchain.agent/>.
   Because the trigger is the WhatsApp Trigger (not the Chat Trigger), set **Prompt → "Define below"** and pass the user text via expression: `{{ $json.entry[0].changes[0].value.messages[0].text.body }}`.
   Attach sub-nodes: **OpenAI Chat Model** (GPT-4o-mini) and **Simple Memory** with `Session Key = {{ $json.entry[0].changes[0].value.messages[0].from }}` so every WhatsApp user has their own memory.
5. **Code** node — parse the `###LEAD_DATA### … ###END_LEAD_DATA###` block the system prompt asks the AI to append when it has captured name + nationality + service. Strip it from the reply.
6. **WhatsApp** (action) node, operation **Send Message → Text**.
   **Docs:** <https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.whatsapp/>.
   Uses the same WhatsApp credential from 3.1. Send the cleaned AI reply back to `{{ $json.entry[0].changes[0].value.messages[0].from }}`.
7. **IF** (lead captured?) → fan out:
   - **Google Sheets → Append** a row to the `Clients` sheet (docs: <https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.googlesheets/>).
   - **Google Drive → Create Folder** under `ILOT_Clients/<department>/<name>_<phone>/` (docs: <https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.googledrive/>). Save its URL to the row.
   - **Switch** by `department` → **WhatsApp → Send Message** to the correct department admin's phone (a simple text with name, nationality, service, and a `https://wa.me/{{phone}}` click-through link so the admin taps and opens the WhatsApp chat with the client directly on their own phone).
   - **Google Sheets → Update** row in `Conversations`: `human_active=TRUE`, `handoff_time=NOW()`.

**Verified send-text call (if you ever need to use the HTTP Request node instead of the WhatsApp action node):** the WhatsApp send-messages doc (<https://developers.facebook.com/documentation/business-messaging/whatsapp/messages/send-messages>) shows this cURL on the live page today, using **Graph API v25.0**:

```
POST https://graph.facebook.com/v25.0/<PHONE_NUMBER_ID>/messages
Authorization: Bearer <ACCESS_TOKEN>
Content-Type: application/json

{
  "messaging_product": "whatsapp",
  "recipient_type": "individual",
  "to": "+16505551234",
  "type": "text",
  "text": {
    "preview_url": true,
    "body": "As requested, here's the link to our latest product: https://www.meta.com/quest/quest-3/"
  }
}
```

**Prefer the WhatsApp action node** — n8n fills the version, URL, and auth for you.

### 4.3 Workflow 2: Google-Sheets status tracker → WhatsApp notifier

**Trigger:** **Google Sheets Trigger** — event "Row Updated" on the `Clients` sheet, poll every minute.
**Docs:** <https://docs.n8n.io/integrations/builtin/trigger-nodes/n8n-nodes-base.googlesheetstrigger/>

Nodes:
1. **Google Sheets Trigger** (Row Updated).
2. **IF** — Status column changed?
3. **Code** — map the new status string to a friendly WhatsApp message (see `statusMessages` dictionary in `ILOT_Simple_Bot_Solution.md`).
4. **IF** — Status = `COMPLETED` **AND** `Final Document` column not empty?
   - Yes → **WhatsApp → Send Message → Document**, `link = <final-document Drive direct-download URL>`.
   - No → skip to next node.
5. **WhatsApp → Send Message → Text** (the mapped message) to the client phone from column B.

> **24-hour window warning:** if the last inbound client message was >24 h ago, `type:text` will be rejected by Meta. For status updates you should send a **UTILITY template** (registered in step 5.2). Do a try/catch or an IF on `since last_client_message > 24h` and branch to the template path.

### 4.4 Workflow 3: auto-reset the human-active flag

**Trigger:** **Schedule Trigger** (every 30 min).

Nodes:
1. **Schedule Trigger** (30 min).
2. **Google Sheets → Read Rows** from `Conversations` where `human_active = TRUE` AND `handoff_time < NOW() - 2 hours`.
3. **Google Sheets → Update** those rows → `human_active = FALSE`.

So the bot resumes if no human replied within 2 h.

---

## Phase 5 — Production hardening (before go-live, not before MVP smoke test)

In priority order:

1. **Finish Meta Business Verification** (see 1.1). Required for anything beyond tiny volume and for marketing templates.
2. **Register 3 UTILITY message templates** in WhatsApp Manager at <https://business.facebook.com/wa/manage/> → Message Templates. Docs: <https://developers.facebook.com/documentation/business-messaging/whatsapp/message-templates>. Template review usually takes minutes to hours. Register at least:
   - `lead_followup_v1` — for re-engaging an old lead after 24 h.
   - `status_update_v1` — for Workflow 2 when the last inbound was >24 h ago.
   - `document_ready_v1` — for Workflow 2's document-delivery branch when >24 h.
3. **Coolify alerts** — <https://coolify.io/docs/knowledge-base/notifications> — Slack / Telegram / email on deploy failure + backup failure + container-down.
4. **Store the two irreplaceable secrets** in 1Password / Bitwarden:
   - `N8N_ENCRYPTION_KEY` (rotating = every saved credential becomes unreadable).
   - Meta System User token (regenerable, but requires re-pasting into n8n after every rotation).
5. **Plan for token rotation.** If Meta removes the "Never" option before go-live, add a 50-day Cron workflow in n8n that hits the Graph API to regenerate the System User token and updates the stored credential.
6. **Hostinger side:** set up automated snapshots of the whole VPS in the Hostinger panel (weekly is fine — Coolify's own backups handle the DB; the VPS snapshot is your disaster recovery).

---

## Daily-use URLs

| Purpose | URL |
|---|---|
| Coolify dashboard | `https://coolify.ilot.example` |
| n8n editor | `https://n8n.ilot.example` |
| Meta App dashboard | <https://developers.facebook.com/apps/> |
| Meta Business settings | <https://business.facebook.com/latest/settings/> |
| System Users | <https://business.facebook.com/latest/settings/system_users> |
| WhatsApp Manager (templates, phone numbers) | <https://business.facebook.com/wa/manage/> |
| Google Sheet | (share link to `ILOT Master Database`) |
| Google Drive | (share link to `ILOT_Clients/`) |

---

## Verified docs index (live-fetched 4 May 2026)

### Coolify
- Installation: <https://coolify.io/docs/get-started/installation>
- DNS / wildcard: <https://coolify.io/docs/knowledge-base/dns-configuration>
- Services → n8n: <https://coolify.io/docs/services/n8n>
- Backups: <https://coolify.io/docs/knowledge-base/backups>
- Notifications: <https://coolify.io/docs/knowledge-base/notifications>

### Meta / WhatsApp Business Platform (current canonical paths)
- Overview: <https://developers.facebook.com/documentation/business-messaging/whatsapp/cloud-api/overview>
- Get started (includes "Add a phone number"): <https://developers.facebook.com/documentation/business-messaging/whatsapp/get-started>
- Messaging limits (portfolio-level, 250 → 2K → 10K → 100K → Unlimited): <https://developers.facebook.com/documentation/business-messaging/whatsapp/cloud-api/messaging-limits>
- Send messages (free-form) — **canonical today, `/cloud-api/` removed**: <https://developers.facebook.com/documentation/business-messaging/whatsapp/messages/send-messages>
- Text messages: <https://developers.facebook.com/documentation/business-messaging/whatsapp/messages/text-messages>
- Message templates: <https://developers.facebook.com/documentation/business-messaging/whatsapp/message-templates>
- Webhook components (WhatsApp-specific): <https://developers.facebook.com/documentation/business-messaging/whatsapp/cloud-api/webhooks/components>
- Webhook handshake (generic Graph API): <https://developers.facebook.com/docs/graph-api/webhooks/getting-started>
- System User tokens: <https://developers.facebook.com/docs/development/create-an-app/app-dashboard/system-users/>
- Business verification help: <https://www.facebook.com/business/help/1710077379203657>
- Add system users help: <https://www.facebook.com/business/help/503306463479099>
- **Current stable Graph API version:** `v25.0` (visible in the live send-message cURL example on the send-messages doc).

### n8n
- Deployment env vars: <https://docs.n8n.io/hosting/configuration/environment-variables/deployment/>
- Endpoints env vars (`WEBHOOK_URL`): <https://docs.n8n.io/hosting/configuration/environment-variables/endpoints/>
- Supported databases: <https://docs.n8n.io/hosting/configuration/supported-databases-settings/>
- Task runners: <https://docs.n8n.io/hosting/configuration/task-runners/>
- WhatsApp Trigger node: <https://docs.n8n.io/integrations/builtin/trigger-nodes/n8n-nodes-base.whatsapptrigger/>
- WhatsApp (action) node: <https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.whatsapp/>
- WhatsApp credential: <https://docs.n8n.io/integrations/builtin/credentials/whatsapp/>
- AI Agent node: <https://docs.n8n.io/integrations/builtin/cluster-nodes/root-nodes/n8n-nodes-langchain.agent/>
- Google Service Account: <https://docs.n8n.io/integrations/builtin/credentials/google/service-account/>
- Google Sheets Trigger: <https://docs.n8n.io/integrations/builtin/trigger-nodes/n8n-nodes-base.googlesheetstrigger/>
- Google Sheets (action): <https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.googlesheets/>
- Google Drive (action): <https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.googledrive/>

---

## One-paragraph TL;DR

Harden Coolify (A + wildcard DNS, dashboard on `coolify.ilot.example` over TLS, ports 80/443/8000/6001/6002 open, backups on). In parallel in Meta's developer console: create a Business portfolio, add a Business-type App with the WhatsApp product, grab the **Phone Number ID + WABA ID**, and — critically — create a **System User** at <https://business.facebook.com/latest/settings/system_users>, attach the WABA as an asset, and generate a **non-expiring** access token with `whatsapp_business_messaging` + `whatsapp_business_management`. Deploy **n8n** via Coolify at `n8n.ilot.example` with the exact env vars above (`N8N_HOST`, `WEBHOOK_URL`, `N8N_EDITOR_BASE_URL`, `N8N_ENCRYPTION_KEY` — set once, never rotate, `N8N_RUNNERS_ENABLED=true`). Add n8n's **WhatsApp Trigger** node, attach the WhatsApp credential with the System User token + WABA ID, and set a Verify Token — the trigger exposes a production webhook URL `https://n8n.ilot.example/webhook/<uuid>`. **Activate the workflow**, then in Meta set that URL + verify token as the WhatsApp Callback and subscribe to the `messages` field. Build the three workflows from `ILOT_Simple_Bot_Solution.md` (AI lead capture → Google Sheets + Drive + admin WhatsApp handoff; Sheets status trigger → client WhatsApp notifier; 30-min schedule → reset stale human-active flags). Register three UTILITY templates so you can message clients past the 24-hour window. Expect to start at the **250 unique recipients / 24 h / portfolio** messaging limit — plenty for MVP. No Chatwoot, no Slack, no custom dashboard — admins just reply on WhatsApp using the `wa.me/<phone>` handoff links n8n sends them.
