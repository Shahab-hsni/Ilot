# ILOT WhatsApp AI Bot — The Simplest Proven Solution

## No Slack. No Complex Bridges. Just WhatsApp + n8n + Google Sheets.

---

## Assumptions Challenged

Before building, I questioned every assumption from the original proposal:

| Original Assumption | Challenge | Verdict |
|---------------------|-----------|---------|
| Need Slack for admin management | WhatsApp Business supports multi-agent (5 devices on app, unlimited on API). Admins can reply directly on WhatsApp. | **DROP Slack** — it adds a complex bidirectional bridge for zero benefit |
| Need Google Drive for documents | Clients send docs on WhatsApp. Admins can save them manually or we auto-save to Drive. | **KEEP but simplify** — auto-save uploaded files to Drive |
| Need Stripe for payments | Most ILOT clients are in Indonesia. Local payment links (Xendit/Midtrans) or even manual bank transfer work. | **OPTIONAL** — start with manual, add Stripe/Xendit later |
| Need complex departmental routing | With ~5-10 admins, a WhatsApp group notification with the department tagged is enough. | **SIMPLIFY** — one WhatsApp group for admin alerts |
| Need a database | Google Sheets works for <5K clients and admins already know it. | **KEEP Google Sheets** — proven, zero-setup |
| Need reference codes on website | The AI parses natural language. "I'm interested in Investor KITAS" is enough. | **DROP ref codes** — unnecessary complexity |
| Need 6 separate n8n workflows | Can be consolidated into fewer workflows. | **2-3 workflows total** |

### The Simplest Architecture That Actually Works

```
Website "Enquire" button
        ↓
    WhatsApp
        ↓
    n8n (AI Bot)
     /    |    \
    ↓     ↓     ↓
Qualify  Answer  Save to
 Lead    FAQs   Google Sheets
    \     |     /
        ↓
  Route to correct department admin
  (7 WhatsApp channels — one per department)
        ↓
  Admin replies DIRECTLY
  on WhatsApp Business App
        ↓
  Bot goes silent
        ↓
  Admin updates Google Sheets
  (status changes → auto-notify client)
        ↓
  Admin marks "Completed" + adds doc link
  → Client gets final PDF on WhatsApp
```

**No Slack. No bidirectional bridge. No complex routing.**

The admin just picks up their phone and replies on WhatsApp — the same app they already use.

---

## Why No Slack?

The original proposal assumed admins need Slack to manage WhatsApp conversations. But:

1. **WhatsApp Business App supports multi-agent** — connect up to 5 devices to one number (phones + web). Every admin can see every conversation.
2. **WhatsApp Business API coexistence** — since 2024, you can use both the API (for bot) AND the Business App (for humans) on the same number.
3. **Slack adds a $0 tool but massive complexity** — the bidirectional WhatsApp↔Slack bridge is the hardest thing to build and maintain. It's the #1 source of bugs (message loops, media handling, channel management).
4. **Admins don't want another tool** — they already have WhatsApp on their phone. Opening Slack to reply to a WhatsApp message is friction, not efficiency.

**The simplest handoff: bot classifies department → notifies the right admin on WhatsApp → admin opens the chat → replies directly.**

---

## The Complete Flow (5 Steps)

### Step 1: AI Lead Capture

```
Client sends WhatsApp message
        ↓
n8n AI Agent (GPT-4o-mini) has a conversation:
  - Greets client
  - Asks what service they need
  - Asks their name and nationality
  - Answers FAQs (timelines, process, etc.)
        ↓
When name + nationality + service collected:
  → Save to Google Sheets
  → Send WhatsApp message to Admin Group
  → Tell client "A specialist will follow up shortly"
  → Bot goes quiet for this conversation
```

### Step 2: Human Takes Over (No Slack Needed)

```
Admin sees notification in WhatsApp Admin Group:
  "🆕 New Lead: Marcus Weber (German)
   Service: Investor KITAS
   Phone: +4917xxx
   Summary: Wants 2-year investor visa, timeline urgent"
        ↓
Admin opens the conversation with +4917xxx on WhatsApp Business App
        ↓
Admin replies directly — they're now chatting client-to-human on WhatsApp
        ↓
Bot detects human replied (outgoing message webhook) → stays silent
```

### Step 3: Invoicing & Payment (Simple)

```
Admin sends payment link manually via WhatsApp
  (Stripe link, Xendit link, or bank transfer details)
        ↓
When client pays, admin updates Google Sheets:
  Payment Status → "PAID"
        ↓
n8n detects change → sends WhatsApp confirmation to client automatically
```

### Step 4: Automated Status Tracking

```
Admin updates "Status" column in Google Sheets
  (e.g., "SUBMITTED_TO_MINISTRY")
        ↓
n8n Google Sheets Trigger detects the change
        ↓
n8n sends friendly WhatsApp message to client:
  "Hi Marcus, great news! Your Investor KITAS application
   has been submitted to the Ministry. 🎉"
```

### Step 5: Final Document Delivery

```
Admin uploads final PDF to Google Drive
Admin pastes Drive link in "Document Link" column
Admin changes Status to "COMPLETED"
        ↓
n8n detects Status = COMPLETED + Document Link exists
        ↓
n8n downloads PDF from Google Drive
n8n sends it to client on WhatsApp:
  "🎉 Here is your completed Investor KITAS document.
   Thank you for choosing ILOT!"
```

---

## Technology Stack

| What | Tool | Cost |
|------|------|------|
| Hosting | **Coolify on Hostinger VPS** | $10-13/mo |
| Automation | **n8n** (self-hosted via Coolify) | Free |
| AI | **OpenAI GPT-4o-mini** | ~$2-5/mo |
| Database | **Google Sheets** | Free |
| File Storage | **Google Drive** | Free |
| Client Communication | **WhatsApp Business Cloud API** | Free (1K conversations/mo) |
| Admin Inbox | **Chatwoot** (self-hosted, open-source shared inbox) | Free |
| Admin Notifications | **7 WhatsApp channels** (one per department) | Free |
| **Total** | | **~$30-40/month** (see detailed breakdown below) |

**No Slack ($0 saved but infinite complexity saved).**

---

## n8n Workflows (Only 3)

### Workflow 1: AI Chatbot + Lead Capture (the main one)

**Trigger:** WhatsApp webhook (incoming message)

**Nodes (8 total):**

```
1. [WhatsApp Trigger] → receives message

2. [IF] → skip if no message (status updates)

3. [IF] → skip if bot is paused for this phone
         (check Google Sheets "Conversations" → human_active = true)

4. [AI Agent] → GPT-4o-mini with ILOT system prompt
                Memory: Simple Memory (key=phone number, window=15)

5. [Code] → check if AI collected lead data (###LEAD_DATA### marker)
             Clean response (remove JSON from message sent to client)

6. [HTTP Request] → send WhatsApp reply to client

7. [IF lead captured] →
     [Google Sheets: Append] → save to "Clients" sheet
     [HTTP Request] → send notification to Admin WhatsApp Group
     [Google Sheets: Update] → set human_active=true in "Conversations"
```

**Department Routing — 7 Admin Channels:**

The bot classifies the lead into one of 7 departments, then sends the notification
to ONLY that department's admin. This is a simple Switch node in n8n:

```
Switch node (by $json.department):
  "visa"      → Send WhatsApp to Visa Admin (+62xxx)
  "legal"     → Send WhatsApp to Legal Admin (+62xxx)
  "company"   → Send WhatsApp to Company Admin (+62xxx)
  "tax"       → Send WhatsApp to Tax/Accounting Admin (+62xxx)
  "property"  → Send WhatsApp to Property Admin (+62xxx)
  "hr"        → Send WhatsApp to HR Admin (+62xxx)
  "insurance" → Send WhatsApp to Insurance Admin (+62xxx)
```

Each admin gets a message like:

```
🆕 *New Lead — Visa Department*

👤 Name: {{name}}
🌍 Nationality: {{nationality}}
📋 Service: {{service}}
📱 Phone: {{phone}}
📝 Summary: {{summary}}

💬 Chat with client: https://wa.me/{{phone}}
```

**How to configure the 7 channels:**

| Department | Admin Phone | WhatsApp Group Name |
|------------|-------------|-------------------|
| Visa & Immigration | +62xxx (Visa Lead) | ILOT Visa Leads |
| Legal & Contracts | +62xxx (Legal Lead) | ILOT Legal Leads |
| Company Setup | +62xxx (Company Lead) | ILOT Company Leads |
| Accounting & Tax | +62xxx (Tax Lead) | ILOT Tax Leads |
| Property Advisory | +62xxx (Property Lead) | ILOT Property Leads |
| HR & Payroll | +62xxx (HR Lead) | ILOT HR Leads |
| Insurance | +62xxx (Insurance Lead) | ILOT Insurance Leads |

**Two options for the 7 channels:**

**Option A: Direct WhatsApp messages (simplest)**
- n8n sends a WhatsApp message directly to each department lead's phone number
- No groups needed — each admin gets notified individually
- The Switch node routes by department → different phone number per branch

**Option B: 7 WhatsApp groups (better for teams)**
- Create 7 WhatsApp groups, one per department
- Add the ILOT Business number + relevant team members to each group
- n8n sends the lead notification to the right group
- Multiple people in each department can see the lead
- Note: Requires WhatsApp Cloud API group messaging (available since v21.0)

**Recommendation: Start with Option A** (direct messages to 7 admin phones).
Upgrade to Option B (groups) when teams grow beyond 1 person per department.

### Workflow 2: Status Tracking + Document Delivery

**Trigger:** Google Sheets Trigger (Row Updated, every 1 minute)

**Nodes (6 total):**

```
1. [Google Sheets Trigger] → detects row change in "Clients" sheet

2. [IF] → Status column changed?

3. [Code] → map status to friendly message

4. [IF] → Status = "COMPLETED" AND Document Link not empty?
     YES → [Google Drive: Download file]
         → [HTTP Request: Send document via WhatsApp]
     NO  → continue

5. [HTTP Request] → send status message via WhatsApp

6. [HTTP Request] → send notification to Admin Group
                    "✅ Status update sent to {{name}}"
```

**Status Map:**

```javascript
const statusMessages = {
  'CONTACTED':             'Hi {{name}}, your inquiry about {{service}} has been assigned to a specialist. They will be in touch shortly.',
  'PENDING_DOCUMENTS':     'Hi {{name}}, to proceed with your {{service}}, we need some documents from you. Your specialist will send the list shortly.',
  'DOCUMENTS_RECEIVED':    'Hi {{name}}, we have received your documents for {{service}}. Our team is reviewing them now.',
  'DOCUMENTS_INCOMPLETE':  'Hi {{name}}, some documents for your {{service}} need to be updated. Your specialist will explain what is needed.',
  'PENDING_PAYMENT':       'Hi {{name}}, your documents are approved! An invoice for {{service}} has been sent. Please complete the payment to proceed.',
  'PAID':                  'Hi {{name}}, payment confirmed for {{service}}. Thank you! We are now preparing your application.',
  'DRAFTING':              'Hi {{name}}, our team is preparing your {{service}} application. We will update you once it is ready for review.',
  'INTERNAL_REVIEW':       'Hi {{name}}, your {{service}} application is under internal review by our senior team.',
  'CLIENT_REVIEW':         'Hi {{name}}, a draft for your {{service}} has been sent. Please review and let us know if you approve.',
  'SUBMITTED':             'Hi {{name}}, great news! Your {{service}} application has been officially submitted. 🎉',
  'PROCESSING':            'Hi {{name}}, your {{service}} application is being processed. This typically takes 5-10 business days.',
  'REVISION_NEEDED':       'Hi {{name}}, the authorities have requested some changes to your {{service}} application. Your specialist will handle this.',
  'APPROVED':              'Hi {{name}}, congratulations! Your {{service}} has been APPROVED! 🎉 We are preparing your final documents.',
  'DOCUMENT_READY':        'Hi {{name}}, your {{service}} documents are ready! We will deliver them to you shortly.',
  'COMPLETED':             'Hi {{name}}, your {{service}} case is complete! Your documents are on the way. Thank you for choosing ILOT! 🙏',
};
```

### Workflow 3: Auto-Reset Bot (runs every 30 min)

**Trigger:** Schedule (every 30 minutes)

**Nodes (3 total):**

```
1. [Schedule Trigger] → every 30 minutes

2. [Google Sheets: Get Rows] → where human_active = true
                                AND handoff_time > 2 hours ago

3. [Google Sheets: Update Rows] → set human_active = false
```

This ensures the AI bot resumes if no human replied within 2 hours.

---


---

## API Reference (Verified Against Official Meta Docs v23.0)

All HTTP Request nodes in the workflows above use these exact API calls.
Verified against: https://developers.facebook.com/documentation/business-messaging/whatsapp/reference/whatsapp-business-phone-number/message-api

### Send Text Message (used in Workflow 1 & 2)

```
HTTP Request Node:
  Method: POST
  URL: https://graph.facebook.com/v23.0/{{PHONE_NUMBER_ID}}/messages
  Authentication: Header Auth
    Header Name: Authorization
    Header Value: Bearer {{WHATSAPP_ACCESS_TOKEN}}
  Content-Type: application/json
  Body (JSON):

{
  "messaging_product": "whatsapp",
  "recipient_type": "individual",
  "to": "{{phone}}",
  "type": "text",
  "text": {
    "body": "{{messageText}}"
  }
}
```

### Send Document by URL (used in Workflow 2 — Document Delivery)

```
HTTP Request Node:
  Method: POST
  URL: https://graph.facebook.com/v23.0/{{PHONE_NUMBER_ID}}/messages
  Authentication: Header Auth
    Header Name: Authorization
    Header Value: Bearer {{WHATSAPP_ACCESS_TOKEN}}
  Content-Type: application/json
  Body (JSON):

{
  "messaging_product": "whatsapp",
  "recipient_type": "individual",
  "to": "{{phone}}",
  "type": "document",
  "document": {
    "link": "{{documentDriveUrl}}",
    "caption": "Here is your completed {{service}} document. Thank you for choosing ILOT!"
  }
}
```

Note: The `link` must be a publicly accessible HTTPS URL. For Google Drive files,
use the format: `https://drive.google.com/uc?export=download&id={{FILE_ID}}`
(not the standard Drive viewer URL).

### Send Message to WhatsApp Group (used for Admin Alerts)

```
HTTP Request Node:
  Method: POST
  URL: https://graph.facebook.com/v23.0/{{PHONE_NUMBER_ID}}/messages
  Body (JSON):

{
  "messaging_product": "whatsapp",
  "recipient_type": "individual",
  "to": "{{ADMIN_PHONE_NUMBER}}",
  "type": "text",
  "text": {
    "body": "🆕 New Lead!\n👤 {{name}} ({{nationality}})\n📋 {{service}}\n📱 {{phone}}\n📝 {{summary}}\n\n💬 https://wa.me/{{phone}}"
  }
}
```

Note: WhatsApp Cloud API cannot send to groups directly. Instead, send individual
messages to each admin, or use a WhatsApp group where the business number is a
participant and admins manually check it.

### n8n Node Configuration Notes (from official n8n docs)

**WhatsApp Trigger node:**
- Use n8n's built-in WhatsApp Trigger node (not a generic Webhook)
- Events: Select "Messages" to receive incoming messages
- The trigger auto-handles Meta's webhook verification challenge
- Output structure: `$json.entry[0].changes[0].value.messages[0]`

**AI Agent node:**
- Agent Type: "Tools Agent" (recommended) or "Conversational Agent"
- Prompt setting: Change to **"Define below"** (NOT "Connected Chat Trigger Node")
  This is critical — since we use WhatsApp Trigger, not Chat Trigger
- Connect the user's message via expression: `{{ $json.entry[0].changes[0].value.messages[0].text.body }}`

**Simple Memory node:**
- Session Key: Set to the phone number expression: `{{ $json.entry[0].changes[0].value.messages[0].from }}`
- Context Window Length: 15 (keeps last 15 exchanges in memory)
- This ensures each WhatsApp user has their own conversation memory

**Google Sheets Trigger node:**
- Event: "Row Updated"
- Poll interval: Every 1 minute
- Spreadsheet: Select "ILOT Master Database" 
- Sheet: Select "Clients"
- The trigger returns the full row data when any cell changes

**Google Sheets Append Row node:**
- Operation: "Append Row"
- Mapping: "Map Automatically" or "Map Each Column Manually"
- Column names must match exactly: Date, Phone, Name, Nationality, Service, Department, Summary, Status, Client Folder, Uploaded Docs

**Google Drive Create Folder node:**
- Operation: "Create Folder"
- Folder Name: `{{ $json.name }}_{{ $json.phone }}`
- Parent Folder: Select the department subfolder (visa, legal, etc.)
- The node returns the folder URL which gets saved to Google Sheets


## The AI Agent System Prompt

```
You are the ILOT Legal virtual assistant on WhatsApp. You help
expatriates and investors in Indonesia with legal, visa, and
business services.

YOUR JOB:
1. Greet the client warmly
2. Identify what service they need
3. Collect through natural conversation:
   - Full name
   - Nationality  
   - Which service they need
4. Answer common FAQs
5. Once you have the info, hand off to a human specialist

SERVICES YOU KNOW ABOUT:
- VISA: Investor KITAS (6-10 wks), Working KITAS (6-10 wks),
  Digital Nomad KITAS (6-10 wks), Retirement KITAS (6-10 wks),
  Visit Visa 60/180 days (2-4 wks), Exit Permit (3-7 days)
- COMPANY: PT Local (4-8 wks), PT PMA (6-12 wks),
  NIB/OSS (1-3 wks), Virtual Office
- LEGAL: Contract Drafting, Document Review (3-7 days),
  Shareholder Agreement (1-3 wks), Prenuptial Agreement
- TAX: NPWP Personal/Company (1-2 wks), BKPM Reports,
  Tax Filing, Corporate Audit
- PROPERTY: Due Diligence (1-3 wks), Notary Services
- HR: EOR, Employment Contracts, Recruitment
- INSURANCE: Health, Business, Property

RULES:
- Keep messages SHORT. Max 2-3 sentences. This is WhatsApp.
- Be warm but professional
- Use simple English
- NEVER make up prices. Say "our specialist will provide a quote"
- NEVER make up specific legal advice
- When client says the first message like "I'm interested in X",
  acknowledge it, then ask for their name and nationality

When you have name + nationality + service, add this at the END
of your message (the system will parse it and remove it):

###LEAD_DATA###
{"name":"...","nationality":"...","service":"...","department":"visa|legal|company|tax|property|hr|insurance","summary":"..."}
###END_LEAD_DATA###

Then say: "Thank you! I've notified our [department] team.
A specialist will message you shortly. 🙏"
```

---

## Data Model: Google Sheets + Google Drive

### How Sheets and Drive Connect

Google Sheets is the database. Google Drive is the file system. They connect via **URLs in cells** — each client row in Sheets has columns that hold Google Drive links pointing to their folder and documents.

```
Google Sheets "Clients" row:
┌──────────┬───────────────┬────────────────────────┬──────────────────────┐
│ Name     │ Client Folder │ Uploaded Docs          │ Final Document       │
│ Marcus W │ [Drive link]  │ [Drive link]           │ [Drive link]         │
│          │  ↓            │  ↓                     │  ↓                   │
│          │  Points to →  │  Points to →           │  Points to →         │
│          │  Drive folder │  Drive folder with     │  Single PDF file     │
│          │  for Marcus   │  passport, etc.        │  (the visa/contract) │
└──────────┴───────────────┴────────────────────────┴──────────────────────┘

Google Drive:
ILOT_Clients/
├── visa/
│   └── Marcus_Weber_+4917xxx/      ← "Client Folder" link points here
│       ├── passport_scan.pdf        ← uploaded by client via WhatsApp
│       ├── sponsor_letter.pdf       ← uploaded by client via WhatsApp
│       └── FINAL_Investor_KITAS.pdf ← uploaded by admin, "Final Document" link points here
├── legal/
│   └── Sarah_Jenkins_+6140xxx/
│       ├── contract_draft_v1.pdf
│       └── FINAL_Shareholder_Agreement.pdf
└── company/
    └── ...
```

**The link between them is simple:** n8n creates the Drive folder when a lead is captured, and stores the folder's shareable URL in the "Client Folder" column. When an admin uploads the final document, they paste its Drive link into the "Final Document" column. That's it — no fancy database relations, just URLs in cells.

---

### Sheet 1: "Clients" (The Main Database)

One row per client. This is the single source of truth.

| Col | Column Name | Filled By | Example | Purpose |
|-----|-------------|-----------|---------|---------|
| A | **Date** | Bot (auto) | 2026-04-03 | When lead was captured |
| B | **Phone** | Bot (auto) | +4917612345678 | **Primary key** — unique per client |
| C | **Name** | Bot (auto) | Marcus Weber | From AI conversation |
| D | **Nationality** | Bot (auto) | German | From AI conversation |
| E | **Service** | Bot (auto) | Investor KITAS 2 Years | What they want |
| F | **Department** | Bot (auto) | visa | Which team handles this |
| G | **Summary** | Bot (auto) | German investor, wants 2-year KITAS, urgent | AI's 1-line summary |
| H | **Status** | Admin (manual) | SUBMITTED_TO_MINISTRY | *Changing this triggers WhatsApp notification* |
| I | **Client Folder** | Bot (auto) | https://drive.google.com/drive/folders/1abc... | Link to client's Drive folder |
| J | **Uploaded Docs** | Bot (auto) | https://drive.google.com/drive/folders/1abc.../docs | Subfolder with client-uploaded files |
| K | **Final Document** | Admin (manual) | https://drive.google.com/file/d/1xyz.../view | The final deliverable (visa PDF, contract) |
| L | **Payment Status** | Admin (manual) | PAID | PENDING / PAID / OVERDUE |
| M | **Invoice Amount** | Admin (manual) | 1200 USD | |
| N | **Assigned To** | Admin (manual) | Ari (visa team) | Which admin owns this client |
| O | **Notes** | Admin (manual) | Client needs expedited processing | Free-form notes |

**Status lifecycle (reflects the actual legal process):**

```
NEW_LEAD              Bot captured the lead, awaiting admin pickup
    ↓
CONTACTED             Admin has reached out to the client
    ↓
PENDING_DOCUMENTS     Waiting for client to submit required docs (passport, photos, etc.)
    ↓
DOCUMENTS_RECEIVED    Client submitted docs, admin reviewing for completeness
    ↓
DOCUMENTS_INCOMPLETE  Some docs missing/incorrect → client notified to resubmit
    ↓ (loops back to DOCUMENTS_RECEIVED when fixed)
PENDING_PAYMENT       All docs approved, invoice sent, awaiting payment
    ↓
PAID                  Payment confirmed
    ↓
DRAFTING              Internal team preparing application/contracts/filings
    ↓
INTERNAL_REVIEW       Senior staff or lawyer reviewing the draft
    ↓
CLIENT_REVIEW         Draft sent to client for approval (e.g., contract draft)
    ↓
SUBMITTED             Application submitted to government/ministry/notary
    ↓
PROCESSING            Government/ministry processing (the waiting period)
    ↓
REVISION_NEEDED       Government requested changes → resubmission required
    ↓ (loops back to SUBMITTED)
APPROVED              Application approved by government
    ↓
DOCUMENT_READY        Final documents prepared (visa stamp, signed contract, etc.)
    ↓
COMPLETED             Final documents delivered to client → case closed
```

Side statuses: ON_HOLD, CANCELLED, REFUNDED

**How the lifecycle works in practice:**
1. **Bot** captures lead → fills columns A-J automatically → Status = NEW_LEAD
2. **Admin** picks up client → sets Assigned To → Status = CONTACTED
3. **Admin** tells client what documents are needed → Status = PENDING_DOCUMENTS
4. **Client** sends passport/photos on WhatsApp → n8n saves to Drive → Admin sets DOCUMENTS_RECEIVED
5. **Admin** reviews docs → if incomplete, sets DOCUMENTS_INCOMPLETE (client notified automatically)
6. **Admin** sends invoice → Status = PENDING_PAYMENT → client pays → PAID
7. **Admin/Team** prepares application → DRAFTING → INTERNAL_REVIEW
8. For contracts: sends draft to client → CLIENT_REVIEW → client approves
9. **Admin** submits to government → SUBMITTED → PROCESSING
10. If govt requests changes → REVISION_NEEDED → fix → resubmit → SUBMITTED
11. Government approves → APPROVED → team prepares final docs → DOCUMENT_READY
12. Admin uploads final PDF to Drive → pastes link in col K → Status = COMPLETED
13. n8n detects COMPLETED + doc link → sends final PDF to client on WhatsApp

**Each status change → client gets an automatic WhatsApp notification.**

**Documents tracked per case (multiple files per client folder):**

| Stage | Documents in Drive Folder | Uploaded By |
|-------|--------------------------|-------------|
| PENDING_DOCUMENTS | Checklist PDF (what client needs to provide) | Admin |
| DOCUMENTS_RECEIVED | Passport scan, photos, sponsor letter, etc. | Client (via WhatsApp) |
| PAID | Invoice PDF, payment receipt | System/Admin |
| DRAFTING | Application draft, contract draft | Admin |
| CLIENT_REVIEW | Draft for client approval | Admin |
| SUBMITTED | Submission receipt/proof | Admin |
| APPROVED | Approval letter/notification | Admin |
| COMPLETED | **Final deliverable** (visa PDF, signed contract, etc.) | Admin |

---

### Sheet 2: "Conversations" (Bot State Tracker)

Controls when the AI bot is active vs. silent for each phone number.

| Col | Column Name | Filled By | Example | Purpose |
|-----|-------------|-----------|---------|---------|
| A | **Phone** | Bot (auto) | +4917612345678 | Matches "Clients" sheet |
| B | **Human Active** | Bot (auto) | TRUE | When TRUE, bot stays silent |
| C | **Handoff Time** | Bot (auto) | 2026-04-03T14:30:00Z | When human took over |

**Logic:**
- New conversation → Human Active = FALSE (bot handles it)
- Lead captured → Human Active = TRUE (bot goes silent)
- After 2 hours → Auto-reset to FALSE (bot resumes)

---

### Google Drive Structure (Auto-Created by n8n)

```
ILOT_Clients/                              ← Shared with all admins
├── visa/
│   ├── Marcus_Weber_+4917xxx/             ← Auto-created by n8n
│   │   ├── client_uploads/                ← WhatsApp files saved here
│   │   │   ├── passport_Marcus.pdf
│   │   │   └── sponsor_letter.pdf
│   │   └── FINAL_Investor_KITAS.pdf       ← Admin uploads manually
│   └── Sarah_Chen_+8613xxx/
│       └── ...
├── legal/
├── company/
├── tax/
├── property/
├── hr/
└── insurance/
```

### How Files Flow End-to-End

```
1. Lead captured → n8n creates Drive folder → saves URL to Sheets col I & J
2. Client sends passport on WhatsApp → n8n downloads → uploads to Drive client_uploads/
3. Admin clicks "Client Folder" link in Sheets → opens Drive → sees all files
4. Admin uploads final PDF to Drive folder → pastes file link in Sheets col K
5. Admin sets Status = "COMPLETED" → n8n reads col K → downloads PDF → sends to client on WhatsApp
```

### Why This Works (No Database Needed)

- **URLs are the foreign keys** — a Drive link in a Sheets cell = a DB foreign key, just simpler
- **Phone number is the primary key** — uniquely identifies every client
- **Google Sheets IS the dashboard** — filter by Status, sort by Date, search by Name
- **Google Drive IS the file system** — organized by department, one folder per client

### Setup (5 minutes each)

**Google Sheets:**
1. Create "ILOT Master Database" spreadsheet
2. Add "Clients" tab with columns A-O
3. Add "Conversations" tab with columns A-C
4. Add Data Validation on Status column (dropdown list)
5. Share with admins + n8n Service Account

**Google Drive:**
1. Create "ILOT_Clients" folder
2. Create subfolders: visa, legal, company, tax, property, hr, insurance
3. Share with admins + n8n Service Account
4. n8n auto-creates client folders inside department folders

---

## WhatsApp Setup — Handling 7 Admins

### The Device Limit Problem

WhatsApp Business App has a **device limit**:
- **Standard**: 4 linked devices + 1 phone = **5 total** (not enough for 7 admins)
- **Meta Verified Business Max**: Up to **10 devices** ($349.99/mo!)
- **WhatsApp Cloud API**: **Unlimited agents** — but agents need a shared inbox app

### Recommended Solution: Chatwoot (Free Shared Inbox)

**Chatwoot** is an open-source customer support inbox (like Zendesk, but free).
It connects to WhatsApp Cloud API and gives **unlimited agents** their own login.

```
Client on WhatsApp  →  WhatsApp Cloud API  →  n8n (AI bot)
                                            →  Chatwoot (human inbox)
                                                 ├── Visa admin sees visa chats
                                                 ├── Legal admin sees legal chats
                                                 ├── Company admin sees company chats
                                                 ├── Tax admin sees tax chats
                                                 ├── Property admin sees property chats
                                                 ├── HR admin sees HR chats
                                                 └── Insurance admin sees insurance chats
```

**Why Chatwoot:**
- Open source, free, self-hosted (deploy on the same Coolify/Hostinger VPS)
- Unlimited agents — each of the 7 admins gets their own login
- Built-in WhatsApp Cloud API integration (official)
- Conversation assignment — n8n auto-assigns chats to the right team/agent
- Works on web browser + has mobile app (admins use it from their phones)
- Canned responses, labels, notes, team inboxes
- n8n has native Chatwoot integration

**Chatwoot replaces the need for Slack AND solves the 5-device limit.**

### Setup

**1. Deploy Chatwoot via Coolify (same VPS, one-click):**
```bash
# In Coolify dashboard:
# New Resource → One-Click → Chatwoot
# Set domain: chat.ilot.co.id
# Coolify handles SSL automatically
```

**2. Connect WhatsApp Cloud API to Chatwoot:**
- Chatwoot Settings → Inboxes → New → WhatsApp Cloud
- Enter: Phone Number ID, Business Account ID, API Token
- Set webhook URL in Meta to Chatwoot's webhook endpoint

**3. Create 7 teams in Chatwoot:**
- Settings → Teams → Create: Visa, Legal, Company, Tax, Property, HR, Insurance
- Add the relevant admin(s) to each team

**4. n8n auto-assigns conversations to the right team:**
- After lead capture, n8n calls Chatwoot API to assign the conversation to the correct team
- The right admin sees only their department's conversations

**5. Admin workflow:**
- Admin opens chat.ilot.co.id (or Chatwoot mobile app) 
- Sees only their department's conversations
- Replies directly — message goes to client on WhatsApp
- No device limit — works in any browser

### How the Bot + Chatwoot + n8n Work Together

```
1. Client sends WhatsApp message
2. WhatsApp Cloud API webhook fires
3. BOTH n8n AND Chatwoot receive the message (dual webhook)
4. n8n runs the AI bot → replies to client → captures lead
5. n8n calls Chatwoot API → assigns conversation to correct team
6. Admin sees the conversation in Chatwoot → replies when ready
7. Chatwoot sends reply via WhatsApp Cloud API → client receives it
8. n8n detects admin replied → sets bot to silent
```

### Alternative: Meta Verified (Expensive)

If you don't want Chatwoot, Meta Verified allows more linked devices:

| Plan | Devices | Price/Month |
|------|---------|------------|
| Business Standard | 4 | $14.99 |
| Business Plus | **6** | $44.99 |
| Business Premium | **8** | $119.99 |
| Business Max | **10** | $349.99 |

For 7 admins you'd need **Business Premium ($119.99/mo)** — expensive!
Plus: all admins see ALL conversations (no department filtering).

### Cost Comparison

| Option | Monthly Cost | Agents | Dept Filtering |
|--------|-------------|--------|---------------|
| WA Business App (standard) | Free | 5 max | No |
| Meta Verified Plus (6 devices) | $44.99/mo | 6 max | No |
| Meta Verified Premium (8 devices) | $119.99/mo | 8 max | No |
| Meta Verified Max (10 devices) | $349.99/mo | 10 max | No |
| **Chatwoot (self-hosted)** | **Free** | **Unlimited** | **Yes (7 teams)** |

---

## Hosting: Coolify on Hostinger

```bash
# 1. Buy Hostinger VPS KVM 4 (~$14.49/mo, 4 vCPU, 16GB RAM — runs n8n + Chatwoot)
# 2. SSH in and install Coolify:
curl -fsSL https://cdn.coollabs.io/coolify/install.sh | bash

# 3. Open Coolify: http://your-ip:8000
# 4. One-Click Deploy → n8n
# 5. Set domain: n8n.ilot.co.id
# 6. Done. Auto-SSL included.
```

---

## Website Change (The Only One)

Add the WhatsApp Business phone number to all `wa.me` links:

```
CURRENT (broken — no phone number):
https://wa.me/?text=Hi%20Ilot...

FIX:
https://wa.me/628XXXXXXXXXX?text=Hi%20Ilot...
```

No reference codes needed. The AI understands "I'm interested in Investor KITAS" from the pre-filled text.

---

## Setup (3 Days)

| Day | Task | Time |
|-----|------|------|
| 1 | Hostinger VPS + Coolify + n8n deploy | 30 min |
| 1 | WhatsApp Business API setup (Meta) | 2-3 hrs |
| 1 | Google Sheets + Drive setup | 15 min |
| 2 | Import n8n template #3586, customize prompt | 2 hrs |
| 2 | Build Workflow 2 (status tracking + doc delivery) | 1 hr |
| 2 | Build Workflow 3 (auto-reset) | 15 min |
| 3 | End-to-end testing | 2 hrs |
| 3 | Admin training (show them the Google Sheet) | 30 min |

---

## Detailed Cost Breakdown (All APIs)

### Fixed Monthly Costs

| Service | What For | Monthly Cost |
|---------|----------|-------------|
| **Hostinger VPS KVM 4** | Hosts n8n + Chatwoot + Coolify | **$14.49** |
| **OpenAI GPT-4o-mini** | AI chatbot (~200 conversations/mo) | **~$0.50-2.00** |
| Google Sheets API | Database reads/writes | Free |
| Google Drive API | File storage (15GB free) | Free |
| n8n | Automation engine (self-hosted) | Free |
| Chatwoot | Admin shared inbox (self-hosted) | Free |
| Coolify | Deployment platform | Free |
| **Subtotal (fixed)** | | **~$15-17** |

### Variable Costs (WhatsApp Messages)

| Message Type | When Used | Cost (Indonesia) | Est. Monthly |
|-------------|-----------|-------------------|-------------|
| **Service msgs** | Bot replies within 24hr window | **FREE** | $0 |
| **Utility msgs** | Status notifications | ~Rp 357/msg (~$0.022) | ~$15-22 |
| **Marketing msgs** | Proactive outreach | ~Rp 586/msg (~$0.036) | $0 (not needed) |

### Total Monthly Cost

| Scenario | Cost |
|----------|------|
| **Low** (50 clients/mo) | **~$26/month** |
| **Medium** (200 clients/mo) | **~$48/month** |
| **High** (500 clients/mo) | **~$92/month** |

### vs. Alternatives

| Solution | Monthly Cost | Notes |
|----------|-------------|-------|
| **This solution** | **$26-48** | Self-hosted, unlimited agents |
| Meta Verified Premium | $119.99 + msgs | No dept filtering |
| Respond.io | $79+ | SaaS |
| Wati | $39+ | Limited |
| Trengo | $175 (7 agents) | Per-agent pricing |

---

## What This Solution Removes vs. The Original Proposal

| Removed | Why | Complexity Saved |
|---------|-----|-----------------|
| **Slack** | Admins reply directly on WhatsApp. No bridge needed. | Eliminates the hardest workflow (bidirectional bridge, channel management, anti-loop) |
| **Reference codes** | AI parses natural language from pre-filled messages | No website code changes beyond adding phone number |
| **Stripe integration** | Start with manual payment links. Add Stripe later if needed. | Eliminates payment webhook handling |
| **6 separate workflows** | Consolidated to 3 simple ones | Fewer things to break |
| **Complex dept routing** | One WhatsApp admin group with department tags | No Switch nodes, no channel creation |
| **Custom invoice PDF generation** | Admin sends invoice manually or uses Xendit/Stripe hosted page | No HTML-to-PDF, no file generation |

---

## What Stays

| Kept | Why |
|------|-----|
| **n8n** | The proven automation brain. Huge template library. |
| **GPT-4o-mini** | Cheapest, fastest AI for chatbots. $0.15/1M tokens. |
| **Google Sheets** | Admins know it. Free. n8n has native trigger. |
| **Google Drive** | Free file storage with sharing links. |
| **WhatsApp Business API** | The channel clients already use. |
| **Coolify** | One-click n8n deploy, auto-SSL. |

---

## Proven Patterns Used

This solution follows patterns validated by:

1. **n8n Template #3586** (17K+ uses) — AI WhatsApp chatbot with memory
2. **n8n Template #11648** — Human handoff pattern (boolean flag)
3. **n8n Community pattern** — Google Sheets as database for small teams
4. **WhatsApp Business multi-agent** — Official Meta feature, no hacks
5. **The restaurant bot pattern** (Amit Kumar, Medium) — WhatsApp + n8n + Sheets + AI, no other tools

---

## Summary

**The entire solution is:**

- 1 Hostinger VPS running Coolify + n8n
- 1 WhatsApp Business number (API for bot + App for admins)
- 1 OpenAI API key
- 1 Google Sheet
- 1 Google Drive folder
- 3 n8n workflows (AI chatbot, status tracker, auto-reset)
- Chatwoot shared inbox with 7 teams (one per department, unlimited agents)

**No Slack. No Stripe. No custom dashboards. No reference codes. No complex routing.**

**~$26-48/month. 3-5 days to build. Based on existing templates.**
