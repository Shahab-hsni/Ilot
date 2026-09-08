# Layer 2 — Wire the AI Agent (Google Gemini 3.1 Flash)

> Turns the hardcoded reply in Layer 1 into an actual AI chatbot that holds a
> conversation, answers FAQs, collects name/nationality/service, and emits a
> structured `###LEAD_DATA###` block when it's ready to hand off.
>
> Model: **Google Gemini 3.1 Flash** — free tier, ~$0.30/month at 200 convos,
> native n8n node. Plan B (if quality issues): Anthropic `Claude Haiku 4.5`.
>
> Expected total time: **25 minutes**.

---

## Part A — Get a Google AI Studio API key (2 min)

1. Browser → <https://aistudio.google.com/apikey>. Sign in with a Google account
   that you control (the ILOT Gmail if they have one, otherwise yours; you can
   transfer later).
2. If this is your first visit, accept the ToS. You'll land on the API keys
   page.
3. Click **Create API key** → **Create API key in new project** (a Google Cloud
   project called something like `My First Project`). Or pick an existing one.
4. Copy the key (starts with `AIza…`). Save in 1Password as
   **"ILOT — Gemini API key"**.

### Lock a spending cap (2 min, do this now)

The free tier is generous but not unlimited. A misbehaving workflow (e.g.
infinite loop between bot and a test phone) could accidentally rack up real
charges once the free tier is exhausted. Protect yourself:

1. Go to <https://console.cloud.google.com/billing/budgets>. (Same Google
   account.) If Cloud Billing isn't on yet, Google will prompt you to enable
   it — do so, the default "Free Tier" billing account is fine.
2. **Create Budget** → name `Gemini — ILOT cap`.
3. **Target amount:** `$20 USD / month` (far above expected spend; alerts
   before you'd notice otherwise).
4. **Thresholds:** 50%, 90%, 100% — email alerts.
5. Save.

This does **not** stop requests at $20 — you'd need a separate quota config for
that — but you'll get an email the moment something is unusual.

### Free-tier quotas (current, May 2026)

Per Google's pricing page (ai.google.dev/pricing):

| Model | Free tier — requests/min | Free tier — requests/day | Free tier — tokens/day |
|---|---|---|---|
| **Gemini 3.1 Flash** | 15 RPM | ~1,500 RPD | ~1M TPD |
| Gemini 3.1 Flash-Lite | 30 RPM | ~1,500 RPD | ~1M TPD |

For ILOT's ~200 convos × 5 turns × ~1,500 tokens = **~1.5M tokens/month**,
you'll spend roughly 1/20th of the monthly free allocation. Virtually zero
risk of overruns.

---

## Part B — Add the Google Gemini credential to n8n (2 min)

1. n8n → left sidebar → **Credentials** → **+ Add credential**.
2. Search: `Google Gemini` → pick **Google Gemini(PaLM) API**.
3. Fill:
   - **API Host:** `https://generativelanguage.googleapis.com` (pre-filled — leave default)
   - **API Key:** paste the `AIza…` key from 1Password.
4. **Name it:** `Ilot — Gemini`.
5. **Save** → green "Connection tested successfully".

If the test fails with `API key not valid`: re-check that Generative Language
API is enabled on the GCP project (Google automatically enables it when you
create the key via AI Studio, but rare corner cases need a manual toggle at
`console.cloud.google.com/apis/library/generativelanguage.googleapis.com`).

---

## Part C — Restructure the workflow (10 min)

Right now your workflow is:

```
[WhatsApp Trigger] → [WhatsApp Send (hardcoded text)]
```

We want:

```
[WhatsApp Trigger]
       │
       ▼
[AI Agent]  ← new, with two sub-nodes
   ├── Chat Model:  Google Gemini Chat Model
   └── Memory:      Simple Memory
       │
       ▼
[WhatsApp Send] ← reuse, but Text Body is now the Agent's output
```

### C.1 — Delete the connection between Trigger and Send

1. Open your `Ilot — Inbound WhatsApp` workflow.
2. Click the **line** between the Trigger and the Send node — a small `x`
   appears. Click it → connection removed.
3. Drag the Send node ~200px to the right to make room in the middle.

### C.2 — Add the AI Agent node

1. Click the `+` to the right of the Trigger node → search **AI Agent** → pick
   the first result (icon looks like a robot).
2. In the node config:
   - **Agent type:** (if it shows — newer versions auto-set this) leave default / "Tools Agent".
   - **Prompt source:** **Define below**.  
     *(Critical — by default it tries "Connected Chat Trigger Node" which
     only works with n8n's Chat trigger, not our WhatsApp trigger.)*
   - **Prompt (User Message):** switch to Expression mode and paste:
     ```
     {{ $json.messages[0].text.body }}
     ```
     Preview should resolve to the last message text you received during
     Layer 1's smoke test.
   - **Require Specific Output Format:** leave **off**. The AI will still emit
     `###LEAD_DATA###` blocks as instructed in the prompt, but not enforced
     via JSON schema (Gemini's JSON mode is finicky; regex parse in Layer 3
     is reliable enough).
3. Scroll to **Options** section and expand it:
   - **System Message:** switch to Expression-free mode and paste the entire
     *ILOT System Prompt* block (Part E below).
   - **Max Iterations:** `3` (keeps the cost floor low — 3 tool-calls max per
     inbound message; we're not connecting tools yet, so 1 iter is typical).
4. Close the config panel — the node now shows with TWO empty sub-node slots
   below it: **Chat Model** and **Memory**.

### C.3 — Attach the Gemini chat model

1. Click the **Chat Model** slot under the Agent → **Google Gemini Chat Model**.
2. Config:
   - **Credential:** `Ilot — Gemini` (from Part B).
   - **Model name:** from the dropdown, pick **`models/gemini-flash-latest`**
     (or if the UI shows version-pinned entries, `gemini-3.1-flash`).
     Avoid "pro" — 10× more expensive for no quality win on WhatsApp-length
     replies. Avoid "flash-lite" for now — worth testing later if budget
     tightens, but Flash is already cheap.
   - **Options → Temperature:** `0.4` — professional but not robotic.
   - **Options → Max Output Tokens:** `400` — WhatsApp replies should be
     short. This caps accidental essays.
3. Close.

### C.4 — Attach the memory

1. Click the **Memory** slot under the Agent → **Simple Memory**.
2. Config:
   - **Session Key:** switch to Expression mode, paste:
     ```
     {{ $json.messages[0].from }}
     ```
     This keys the memory by the user's phone number — every WhatsApp user
     gets their own conversation thread.
   - **Context Window Length:** `15` — keeps the last 15 user/assistant
     message pairs. Aligns with the `ILOT_Simple_Bot_Solution.md` spec.
3. Close.

### C.5 — Connect Agent output to the Send node

1. Drag from the `AI Agent`'s right-hand dot to the `WhatsApp Send` node's
   left-hand dot. Line appears.
2. Click the Send node to edit. Change **Text Body**:
   - Delete the hardcoded "Thanks for your message..." string.
   - Switch to Expression mode.
   - Paste:
     ```
     {{ $json.output }}
     ```
     *(The AI Agent node returns the model's reply text in a field named
     `output`. Some n8n versions use `text` instead — if `output` comes back
     undefined, try `{{ $json.text }}`.)*
3. **Recipient Phone Number / To** — verify it's still
   `{{ $('WhatsApp Trigger').item.json.messages[0].from }}`.
   *Note:* `$json` in the Send node now refers to the **Agent's output**,
   not the trigger, so the phone number can no longer be read via plain
   `$json.messages[0].from`. You MUST reach back to the trigger explicitly
   via `$(...)`. n8n may auto-rewrite the expression for you when you
   reconnect — double-check before saving.
4. Save workflow.

---

## Part D — Smoke test (3 min)

1. Keep workflow **Active** (toggle top-right).
2. From your whitelisted phone, WhatsApp `+1 555-631-8680`:
   - **First message:** `"Hi, I'm interested in Investor KITAS"`
   - Expected bot reply within ~5s: something like
     *"Hi there! Great, we can help with Investor KITAS. Could I ask your
     name and nationality so I can connect you with the right specialist?"*
3. Reply with: `"Marcus Weber, German"`
   - Expected bot reply: *"Thanks Marcus! I've noted you're interested in
     Investor KITAS. I've passed this to our visa team — a specialist will
     reach out shortly. 🙏"* — and internally the AI should have appended
     the `###LEAD_DATA###` block (see Part F — we'll parse and strip it
     cleanly in Layer 3; for now it may appear in the user-visible reply,
     which is fine for testing).
4. In n8n → **Executions** tab → open the latest. You should see:
   - The Trigger payload (inbound message).
   - The AI Agent node's output JSON — look for a field like `output` or
     `text` holding the reply. Near the bottom you should also see the
     `###LEAD_DATA###…###END_LEAD_DATA###` block the AI inserted.
   - The WhatsApp Send node's success response.

---

## Part E — The ILOT system prompt (paste this into the Agent's System Message)

```
You are the ILOT Legal virtual assistant on WhatsApp. You help expatriates,
foreign investors, and global businesses with legal, visa, and corporate
structuring services in Indonesia.

YOUR JOB
1. Greet warmly, briefly.
2. Identify which service the client needs.
3. Through natural conversation collect:
   - Full name
   - Nationality
   - Which service they need
4. Answer simple FAQs (expected timeline, general process).
5. Once you have name + nationality + service, hand off to a human
   specialist.

SERVICES YOU KNOW ABOUT (do not invent others)
• VISA: Investor KITAS (6–10 wks), Working KITAS (6–10 wks), Digital
  Nomad KITAS (6–10 wks), Retirement KITAS, Visit Visa 60/180 days
  (2–4 wks), Exit Permit Only, eVoA 60 days.
• COMPANY SETUP: PT PMA (6–12 wks), PT Local (4–8 wks), PT Local
  Hospitality, NIB / OSS (1–3 wks), CV Set-up, PT Perorangan.
• LEGAL & COMPLIANCE: BKPM / LKPM reports, Document Review by Lawyer
  (3–7 days), Shareholder Agreement (1–3 wks), Prenuptial / Postnuptial
  Agreement, Employment Contract drafting, RUPS (general meeting),
  Company Legal Documents Review.
• TAX & ADMIN: NPWP Personal, NPWP Company (1–2 wks), Sworn Translation,
  Company Valuation, Land Due Diligence.

RULES (follow strictly)
- Reply in SHORT messages. Max 2–3 sentences per reply. This is WhatsApp.
- Be warm but professional. Plain English. No legal jargon.
- NEVER quote prices, timelines more specific than what's listed above,
  or specific legal advice. Deflect with "our specialist will confirm
  exact figures when they reach out."
- NEVER promise outcomes or approvals.
- If the client asks about a service NOT in the list, acknowledge it
  politely and say the specialist will confirm whether Ilot handles it.
- Indonesian rupiah, USD, or EUR — whatever the client uses, stay
  consistent. Don't convert unless asked.

WHEN TO HAND OFF
The moment you have:
  1. The client's full name
  2. Their nationality
  3. The service they want

Include this EXACT marker block at the very END of your next reply, on
its own lines, with NOTHING between the markers except a single valid
JSON object:

###LEAD_DATA###
{"name":"<full name>","nationality":"<country>","service":"<service>","department":"visa|legal|company|tax|property|hr|insurance","summary":"<one short sentence summarising their situation>"}
###END_LEAD_DATA###

The system will parse and strip this block before sending the message to
the client. Map the service they said to one of these departments:
  visa        → any KITAS, Visit Visa, eVoA, Exit Permit, MREP
  company     → PT PMA, PT Local, PT Perorangan, NIB, CV, OSS
  legal       → document review, shareholder / prenup / employment
                agreements, BKPM reports, compliance, notary, RUPS
  tax         → NPWP, tax filing, audit, valuation
  property    → land due diligence
  hr          → (rare — EOR, recruitment)
  insurance   → (rare — health, business, property insurance)

Immediately after the block, say something like "Thank you! I've passed
this to our [department] team. A specialist will reach out shortly. 🙏"

If the client is still exploring and you don't yet have all three pieces
of info, DO NOT include the marker block. Keep the conversation natural.

EXAMPLES

<example 1 — first message already has the service>
User: "Hi, I want Investor KITAS"
You: "Hi! Great, we help a lot of investors with the Investor KITAS.
  Could I get your name and nationality so I can connect you with the
  right specialist?"

<example 2 — second message completes the lead>
User: "Marcus Weber, German"
You: "Thanks Marcus! I've passed this to our visa team — a specialist
  will reach out shortly. 🙏

  ###LEAD_DATA###
  {"name":"Marcus Weber","nationality":"German","service":"Investor KITAS","department":"visa","summary":"German investor wants Investor KITAS, no other details shared yet."}
  ###END_LEAD_DATA###"

<example 3 — open-ended inquiry>
User: "I want to move my family to Bali"
You: "Happy to help — a few options depending on whether you want to
  invest in a company, retire, or work remotely. Which fits best:
  investor, retirement, or digital nomad?"
(No marker block — we don't yet know which service.)
```

---

## Part F — What's NOT in this layer (on purpose)

These all come in later layers so this one stays focused:

- **Parsing + stripping `###LEAD_DATA###` from the user-visible reply** —
  Layer 3 (`Code` node with regex). For now the marker may leak into the
  reply the user sees; that's ugly but informative during development.
- **Appending the lead to Google Sheets** — Layer 3.
- **Switch node that notifies the right department admin** — Layer 4.
- **`human_active` silence flag + auto-reset** — Layer 5.
- **Rate limiting / abuse protection** — later ops concern.

---

## Common issues

| Symptom | Cause | Fix |
|---|---|---|
| Agent reply is literally `"I need the user's message"` | Prompt source still on "Connected Chat Trigger" | Set to **Define below** and provide the expression from C.2. |
| Agent output is empty / `undefined` in Send node | Field name difference | Try `{{ $json.output }}` first, then `{{ $json.text }}`. |
| `429 Rate limit exceeded` | Free tier ceiling hit (rare at your volume) | Gemini Chat Model node → Options → enable **Retry On Fail** (3 retries, 5s backoff). |
| `API key not valid` on the credential test | GCP project's Generative Language API not enabled | Console → API Library → enable the API. |
| AI constantly asks for info it already has | Memory session key wrong | Must be `{{ $json.messages[0].from }}`. The phone number MUST match across messages — no leading `+`, just digits. |
| Bot replies in Indonesian | Gemini auto-mirrors the user's language | Add to prompt: `"Reply in English only, unless the user writes in Bahasa Indonesia."` |
| `###LEAD_DATA###` block appears in client-visible message | Expected at this layer — Layer 3 strips it | Move on to Layer 3. |

---

## What's next

**Layer 3 (~20 min):** add a `Code` node between Agent and Send to regex-extract
the `###LEAD_DATA###` JSON, strip it from the reply the user sees, and append a
row to a Google Sheets "Clients" tab with the parsed lead data.

Layer 3 is where it stops being a "simple bot" and starts being the actual
ILOT lead-capture pipeline described in `ILOT_Simple_Bot_Solution.md`.
