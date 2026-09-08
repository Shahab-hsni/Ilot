# Layer 3 — Parse `###LEAD_DATA###` + persist the lead in NocoDB

> Between the AI Agent and the WhatsApp Send node we add a **Code** node that:
> 1. Regex-extracts the `###LEAD_DATA###…###END_LEAD_DATA###` JSON from the
>    Agent's output.
> 2. Strips the marker block from the reply the user sees.
> 3. Exposes the parsed lead as structured JSON for downstream nodes.
>
> Then a **NocoDB → Insert** node writes the row to the `Clients` table.
>
> After this layer the bot goes from "talks to people" → "captures and
> persists leads".
>
> Total time: **~20 min** if NocoDB is already deployed (it is).

---

## Part A — Prepare the NocoDB table (5 min)

1. Open <https://nocodb.ilotlegal.com> (or whatever domain Coolify assigned it).
2. Sign in, create a new **Base** named **`ILOT Master Database`**. If one
   already exists, reuse it.
3. Inside that base, create a new **Table** called **`Clients`** with the
   columns below. Match the names and types exactly — the n8n node will map
   to these by name.

| Column | Type | Notes |
|---|---|---|
| `Date` | `DateTime` | auto-set by n8n at insert time |
| `Phone` | `SingleLineText` | **primary lookup key** — intl format, no `+` (e.g. `64272687087`) |
| `Name` | `SingleLineText` | |
| `Nationality` | `SingleLineText` | |
| `Service` | `SingleLineText` | human-readable service name |
| `Department` | `SingleLineText` | one of `visa`, `legal`, `company`, `tax`, `property`, `hr`, `insurance` |
| `Summary` | `LongText` | AI's one-liner summary of the conversation |
| `Status` | `SingleSelect` | options = the full lifecycle from `ILOT_Simple_Bot_Solution.md`: `NEW_LEAD`, `CONTACTED`, `PENDING_DOCUMENTS`, `DOCUMENTS_RECEIVED`, `DOCUMENTS_INCOMPLETE`, `PENDING_PAYMENT`, `PAID`, `DRAFTING`, `INTERNAL_REVIEW`, `CLIENT_REVIEW`, `SUBMITTED`, `PROCESSING`, `REVISION_NEEDED`, `APPROVED`, `DOCUMENT_READY`, `COMPLETED`, `ON_HOLD`, `CANCELLED`, `REFUNDED` — default `NEW_LEAD` |
| `Payment Status` | `SingleSelect` | `PENDING`, `PAID`, `OVERDUE` — default `PENDING` |
| `Assigned To` | `SingleLineText` | admin owner — blank at creation, filled manually later |
| `Notes` | `LongText` | free-form |
| `Client Folder` | `URL` | populated later when we add Drive integration |
| `Final Document` | `URL` | populated by admin when case completes |

**Tip:** in NocoDB, the first column (which is typically the "primary key"
display field) should be set to `Phone` — NocoDB defaults to auto-incrementing
IDs which aren't useful for us. Right-click `Phone` → **Set as Display Value**
so it shows as the record's primary label.

### Generate an API token

Still in NocoDB:

1. Bottom-left → click your avatar → **Account Settings**.
2. **Tokens** tab → **+ Add new API token**.
3. Name: `n8n-whatsapp-bot`.
4. Click Create → the token value is shown **once** — copy it, put it in
   1Password as `ILOT — NocoDB API token`.

Also capture:
- **Host URL**: the full https URL of your NocoDB instance
  (e.g. `https://nocodb.ilotlegal.com`).
- **Base ID**: visible in the URL when you're inside the base:
  `nocodb.ilotlegal.com/dashboard/#/<ORG_ID>/<BASE_ID>/...` — the 32-char segment.
  (n8n's node can also list bases via a dropdown once the credential works,
  but it's worth noting the ID for debugging.)
- **Table ID**: same URL pattern when clicked into the `Clients` table
  (the last segment). Again, n8n's node can pick this via dropdown — just
  have it handy.

---

## Part B — Add the NocoDB credential in n8n (1 min)

1. n8n → **Credentials** → **+ Add credential**.
2. Search `NocoDB` → pick the built-in one.
3. **Authentication:** `API Token`.
4. **Host:** `https://nocodb.ilotlegal.com` (no trailing slash).
5. **API Token:** paste from 1Password.
6. Name: `Ilot — NocoDB`.
7. **Save** → green "Connection tested successfully".

If the test fails:
- Double-check the Host has `https://`.
- Confirm the token has not been revoked (NocoDB shows all tokens under
  Account → Tokens).

---

## Part C — Insert the Code node that parses `###LEAD_DATA###` (5 min)

In your workflow, you currently have:

```
[On messages] ──► [AI Agent] ──► [WhatsApp Send]
```

We'll insert two nodes in the middle:

```
[On messages] ──► [AI Agent] ──► [Code: parseLeadData] ──► [IF lead captured?]
                                                              │       │
                                                         (yes) │       │ (no)
                                                              ▼       │
                                                      [NocoDB: Insert] │
                                                              │       │
                                                              └───┬───┘
                                                                  ▼
                                                         [WhatsApp Send]
```

### C.1 — Delete the Agent→Send arrow

Click the line between AI Agent and WhatsApp Send → delete it.

### C.2 — Add the Code node

1. Click `+` to the right of AI Agent → **Code**.
2. **Language:** `JavaScript`.
3. **Mode:** `Run Once for Each Item`.
4. Paste this code:

```javascript
// Layer 3 — parse ###LEAD_DATA###...###END_LEAD_DATA### from the AI's reply.
// - If the marker block is present, extract the JSON, strip the block from
//   the user-visible reply, and expose the parsed fields as top-level.
// - If absent, `leadCaptured` is false and the reply is passed through unchanged.
//
// Gemini occasionally wraps the block in ```json fences — the regex tolerates that.

const raw = $json.output ?? $json.text ?? $json.response ?? '';
const markerRegex = /###LEAD_DATA###\s*```?(?:json)?\s*([\s\S]*?)\s*```?\s*###END_LEAD_DATA###/m;
const match = raw.match(markerRegex);

let leadCaptured = false;
let lead = null;
let cleanReply = raw;

if (match) {
  try {
    lead = JSON.parse(match[1].trim());
    // sanity: require name + service to mark as captured
    leadCaptured = Boolean(lead.name && lead.service);
    // strip the whole block (including markers and optional fences) from the reply
    cleanReply = raw.replace(markerRegex, '').trim();
  } catch (err) {
    // JSON was malformed — log it but don't crash the workflow
    console.warn('LEAD_DATA JSON parse failed:', err.message);
    console.warn('Raw block:', match[1]);
  }
}

// Also pull through the trigger context so downstream nodes have easy access
const triggerPayload = $('WhatsApp Trigger').first().json;
const messages = triggerPayload.messages ?? [];
const contacts = triggerPayload.contacts ?? [];
const phone = messages[0]?.from ?? '';
const waName = contacts[0]?.profile?.name ?? '';

return {
  json: {
    cleanReply,         // the text the user should see (no marker block)
    leadCaptured,       // boolean — drives the IF branch below
    lead,               // { name, nationality, service, department, summary }  or null
    phone,              // intl format digits only
    waName,             // WhatsApp display name
    rawAgentOutput: raw // for debugging
  }
};
```

5. Name the node: `parseLeadData`.
6. Click **Execute node** to test it against the pinned Agent data from the
   last execution. Output should include `cleanReply` (no `###` markers) and
   either `leadCaptured: true` with a populated `lead` object, or
   `leadCaptured: false`.

> If your n8n node trigger outputs the Agent reply under a different field
> name than `output`/`text`/`response`, extend the fallback chain at the top
> of the Code node accordingly.

### C.3 — Add the IF node

1. Click `+` after the Code node → **If**.
2. Add one condition:
   - **Value 1** (Expression): `{{ $json.leadCaptured }}`
   - **Operator:** `is true`
3. Two output branches appear: `true` (top) and `false` (bottom).

### C.4 — Add the NocoDB Insert node on the `true` branch

1. Click the `+` on the IF's `true` branch → search **NocoDB** → select **NocoDB**.
2. Config:
   - **Credential:** `Ilot — NocoDB`
   - **API Version:** `v2` (n8n may offer v1/v2 — v2 is the current NocoDB API)
   - **Operation:** `Create` (insert one row)
   - **Project** (aka Base): dropdown → pick `ILOT Master Database`
   - **Table:** dropdown → pick `Clients`
   - **Fields:** click **Add Field** for each column you want to populate —
     these expressions map the parsed lead into the table:

| Column | Value (Expression) |
|---|---|
| `Date` | `{{ new Date().toISOString() }}` |
| `Phone` | `{{ $json.phone }}` |
| `Name` | `{{ $json.lead.name }}` |
| `Nationality` | `{{ $json.lead.nationality }}` |
| `Service` | `{{ $json.lead.service }}` |
| `Department` | `{{ $json.lead.department }}` |
| `Summary` | `{{ $json.lead.summary }}` |
| `Status` | `NEW_LEAD` (literal, no expression) |
| `Payment Status` | `PENDING` (literal) |

3. Name this node: `createLeadInNocoDB`.

### C.5 — Converge IF branches into the Send node

Both IF branches (`true` → NocoDB → ..., and `false`) need to end up at the
Send node. n8n's IF node has two output dots stacked vertically.

1. Draw arrow from `NocoDB Insert`'s right dot → `WhatsApp Send`'s left dot.
2. Draw arrow from IF's `false` (lower) dot → `WhatsApp Send`'s left dot.

Now the Send node runs in both cases — either after the NocoDB insert
(lead captured) or directly from the IF's false branch (still collecting).

### C.6 — Point Send's Text Body at `cleanReply`

1. Click **WhatsApp Send** to edit.
2. **Text Body:** change the expression from `{{ $json.output }}` to
   `{{ $json.cleanReply }}`.
   *(Why: in both IF branches the Code node's `cleanReply` is what we want
   the user to see — the marker block stripped. After the NocoDB node, the
   NocoDB response body would overwrite `$json` — if your expression is
   pulling from the Code node output, also fix by using explicit reach-back:
   `{{ $('parseLeadData').item.json.cleanReply }}`.)*

   **Recommended version** (works regardless of which branch ran):
   ```
   {{ $('parseLeadData').item.json.cleanReply }}
   ```
3. **Recipient Phone Number / To** — same principle:
   ```
   {{ $('parseLeadData').item.json.phone }}
   ```
   This removes the dependency on the original trigger name / any rewiring.

4. Save workflow.

---

## Part D — Smoke test (3 min)

Keep the workflow **Active**. From your whitelisted phone:

### Test 1 — open-ended (should NOT write to NocoDB yet)

You: `"Hi, I'd like to learn about visa options for Bali"`
Bot: should reply conversationally asking what fits — investor/retirement/
     digital nomad.
NocoDB: no new row (`leadCaptured: false` → false branch → skip insert).

### Test 2 — complete the lead (SHOULD write to NocoDB)

You: `"Investor KITAS. My name is Pouya Ataei, I'm Iranian."`
Bot: should reply something like *"Thanks Pouya! I've passed this to our
     visa team — a specialist will reach out shortly. 🙏"*.
     **Crucially, no `###LEAD_DATA###` block should appear in the reply.**
NocoDB: navigate to the `Clients` table — a new row with:
  - `Phone` = your phone
  - `Name` = Pouya Ataei
  - `Nationality` = Iranian
  - `Service` = Investor KITAS
  - `Department` = visa
  - `Summary` = AI's one-liner
  - `Status` = NEW_LEAD

### Test 3 — executions view

n8n → **Executions** → open the latest. You should see:
1. `On messages` — trigger payload
2. `AI Agent` — Gemini's output including the `###LEAD_DATA###` block
3. `parseLeadData` — `leadCaptured: true` with structured `lead` object
4. `If` — going down the `true` branch
5. `createLeadInNocoDB` — returns the created row's ID + fields
6. `WhatsApp Send` — Meta's 200 OK response

Click through each step's output pane to confirm.

---

## Part E — Common issues

| Symptom | Cause | Fix |
|---|---|---|
| NocoDB node shows `Invalid credentials` | Token revoked or wrong host | Regenerate in NocoDB account settings, update n8n credential |
| NocoDB insert fails with `column not found` | Column name mismatch (case-sensitive) | Check table columns exactly match names above |
| `leadCaptured` always false even when lead is complete | Gemini wraps JSON in ```json``` fences | The regex in the Code node handles this, but if it still fails, paste a sample of Gemini's raw output and we'll harden the regex |
| User sees the `###LEAD_DATA###` block in WhatsApp reply | Send node's `Text Body` still points at the raw agent output | Change to `{{ $('parseLeadData').item.json.cleanReply }}` |
| Lead row appears in NocoDB but with empty fields | Expressions in field mapping reference `$json.name` instead of `$json.lead.name` | Fix per the table in C.4 — everything from the parsed lead is under `lead.*` |
| Workflow errors with "Cannot read property 'name' of null" | AI didn't emit the marker block but IF condition fires | The Code node sets `leadCaptured` only if `lead.name && lead.service` — but if you edit the logic, keep this guard |

---

## What's next

**Layer 4 (~15 min):** When `leadCaptured = true`, also fire a WhatsApp
notification to the correct ILOT department admin using a **Switch** node
keyed by `{{ $json.lead.department }}`. Each branch → WhatsApp Send → the
admin's personal phone with a pre-filled `wa.me/<client_phone>` link so
they can hop into the client conversation with one tap.

**Layer 5 (~15 min):** Add the `human_active` boolean flag so the bot goes
silent for 2 hours once the admin has taken over. Implemented as an IF
check at the top of the workflow (right after the Trigger) that reads
NocoDB and short-circuits if `Human Active = true`. Plus a Schedule trigger
every 30 min that resets stale handoffs.
