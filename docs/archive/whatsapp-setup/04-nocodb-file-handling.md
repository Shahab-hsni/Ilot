# Layer 3.5 — File handling with NocoDB Attachment columns

> Two flows to build:
>
> 1. **Client → Admin (inbound file):** a WhatsApp message of type `document`
>    / `image` / `audio` arrives → n8n downloads the binary from Meta →
>    uploads it to NocoDB → attaches the metadata to the matching `Clients`
>    row's `Client Uploads` column.
>
> 2. **Admin → Client (outbound final doc):** an admin drags a PDF into the
>    `Final Document` cell of a `Clients` row and sets Status = `COMPLETED`
>    → NocoDB fires a webhook → n8n extracts the attachment URL → sends it
>    on WhatsApp via `WhatsApp Business Cloud → Media: Upload` + `Send
>    message (document)`.
>
> Total time: **~40 min**. Non-trivial but self-contained.

---

## Part 0 — Confirm NocoDB persistent storage (5 min)

**You must do this FIRST.** Without it, every Coolify redeploy or container
restart wipes all uploaded attachments. NocoDB's default on Docker is local
filesystem at `/usr/app/data/nc`.

### 0.1 Check the Coolify volume mount

1. Coolify → your NocoDB application → **Persistent Storage** tab.
2. You should see at least one volume entry — typically:

   ```
   Name:             nocodb-data (or similar)
   Source Path:      (Coolify-managed — starts with /var/lib/docker/volumes/…)
   Destination Path: /usr/app/data
   ```

3. If **no volume is mounted**, add one now:
   - **+ Add Volume**
   - **Name:** `nocodb-data`
   - **Destination Path:** `/usr/app/data`
   - Leave Source Path empty (Docker-managed).
   - Save → redeploy NocoDB.

4. After a redeploy with a fresh volume, any attachments you uploaded
   previously are **gone**. Luckily at this point you have no real data yet.

### 0.2 (Optional, recommended for production) Switch to S3

Local filesystem storage has two downsides:
- Backups depend on your Coolify backup job including this volume.
- It doesn't scale horizontally.

To use S3-compatible storage (Hetzner Storage Box, Cloudflare R2, MinIO,
AWS S3), set these env vars on the NocoDB Coolify app → Environment
Variables tab, then redeploy:

```
NC_S3_BUCKET_NAME=ilot-nocodb-attachments
NC_S3_REGION=us-east-1          # or your provider's region
NC_S3_ACCESS_KEY=<your key>
NC_S3_ACCESS_SECRET=<your secret>
NC_S3_ENDPOINT=https://s3.your-provider.com   # optional — omit for real AWS
```

**Skip this for MVP.** Come back to it once traffic justifies the setup time.

---

## Part A — Add the attachment columns (2 min)

1. Open `Clients` table in NocoDB.
2. **+ Add Column** → name `Client Uploads` → **Type:** `Attachment` →
   **Allow Multiple:** ON → Save.
3. **+ Add Column** → name `Final Document` → **Type:** `Attachment` →
   **Allow Multiple:** OFF (one file per case) → Save.

### Drop the old URL columns

If your schema still has `Client Folder` and/or `Final Document URL`
columns from earlier, you can delete them — the Attachment column
supersedes both.

---

## Part B — Flow 1: Capture inbound files (Client → Admin) (15 min)

### B.1 — Detect media messages in the trigger payload

Meta's WhatsApp payload for a document looks like:

```json
{
  "messages": [{
    "from": "64272687087",
    "id": "wamid.HBgL...",
    "timestamp": "1778459907",
    "type": "document",
    "document": {
      "caption": "Passport scan",
      "filename": "passport.pdf",
      "mime_type": "application/pdf",
      "sha256": "abc…",
      "id": "1234567890"   // ← the MEDIA ID
    }
  }]
}
```

Types we care about: `document`, `image`, `audio`, `video`, `sticker`. Type
`text` is the normal conversation path — skip it here.

### B.2 — Add the media branch to the workflow

Your workflow currently has `On messages → AI Agent → parseLeadData → …`.

We'll add a **Switch node** right after the trigger that routes text
messages to the AI Agent (existing path) and media messages to a new
file-handling branch:

```
[On messages]
     │
     ▼
[Switch: by messages[0].type]
     ├── "text"        ──► [AI Agent] ──► … (existing pipeline)
     ├── "document" \
     ├── "image"     ──► [File handling branch ▼]
     ├── "audio"     /
     └── "video"    /
```

### Steps:

1. Click the arrow from `On messages` to `AI Agent` → delete.
2. Click `+` after `On messages` → **Switch** node.
3. Switch config:
   - **Mode:** `Rules`
   - **Output Routes:** 2
   - Route 1:
     - **Rule:** `{{ $json.messages[0].type }}` **equals** `text`
     - **Output:** 0 (top)
   - Route 2:
     - **Rule:** `{{ $json.messages[0].type }}` **is in** (use "Any of")
       `document`, `image`, `audio`, `video`, `sticker`
     - **Output:** 1 (bottom)
   - **Fallback output:** `-1` (no default — unknown types just drop)
4. Connect Switch's output 0 → AI Agent (existing).
5. On Switch's output 1, click `+` → add file-handling nodes below.

### B.3 — Download the file from Meta

1. Click `+` on Switch output 1 → **WhatsApp Business Cloud** → under
   Actions → **Media → Download**.
2. Config:
   - **Credential:** `Ilot — Test WABA (API)` (the Access-Token credential
     you made in Layer 1; note: NOT the OAuth2 credential used for the
     Trigger).
   - **Media ID** — click the expression toggle, paste:
     ```
     {{ $json.messages[0].document?.id ?? $json.messages[0].image?.id ?? $json.messages[0].audio?.id ?? $json.messages[0].video?.id ?? $json.messages[0].sticker?.id }}
     ```
     (Picks whichever media type is present.)
3. The node returns an item whose `binary.data` contains the file bytes
   and whose JSON has MIME type + filename (Meta calls it `file_name`
   sometimes).

### B.4 — Upload to NocoDB storage

NocoDB's Create-Row node **doesn't handle binary multipart uploads**.
So we use a plain **HTTP Request** node with multipart form data:

1. `+` after WhatsApp Download → **HTTP Request**.
2. Config:
   - **Method:** `POST`
   - **URL:**
     ```
     https://nocodb.ilotlegal.com/api/v2/storage/upload?path=client-uploads/{{ $('WhatsApp Trigger').first().json.messages[0].from }}
     ```
     *(The `?path=` query string tells NocoDB where to bucket the file.
     Using the user's phone number as the folder keeps uploads organised.)*
   - **Authentication:** `Generic Credential Type` → `Header Auth`
   - Headers → add: `xc-token` : `{{ $credentials.nocodbToken }}`
     — **OR easier**: open the n8n HTTP Request's **Send Headers** section,
     add header `xc-token` with the raw token value pasted (less safe; OK
     for dev; switch to credential reuse later).
   - **Send Body:** ON
   - **Body Content Type:** `Form-Data Multipart`
   - Add a **Body Parameter**:
     - **Name:** `file`
     - **Parameter Type:** `n8n Binary File`
     - **Binary Property Name:** `data` (matches the WhatsApp Download's
       output)
3. Name the node: `uploadToNocoDBStorage`.

**Expected response body:** an array of one object matching the
`AttachmentRes` schema:
```json
[{
  "path": "download/noco/.../somefile.pdf",
  "title": "passport.pdf",
  "mimetype": "application/pdf",
  "size": 123456,
  "signedPath": "dltemp/…"
}]
```

### B.5 — Find the Clients row by phone + append the file

1. `+` after HTTP Request → **NocoDB** → Operation: **Get Many** (find rows).
2. Config:
   - Credential: `Ilot — NocoDB`
   - Project: `ILOT Master Database`
   - Table: `Clients`
   - **Where:** `(Phone,eq,{{ $('WhatsApp Trigger').first().json.messages[0].from }})`
   - **Limit:** `1`
3. Name: `findClientRow`.

4. `+` after `findClientRow` → **Code** node. Name: `buildUpdatedAttachmentList`.
5. JavaScript:

```javascript
// Merge the freshly-uploaded file's attachment metadata into the existing
// Client Uploads array on the found row.
const existing = $json['Client Uploads'] ?? []; // may be null if no prior files
const newFile = $('uploadToNocoDBStorage').first().json[0]; // array-of-one

// NocoDB attachment cell value is an array of these objects
const attachment = {
  path: newFile.path,
  title: newFile.title,
  mimetype: newFile.mimetype,
  size: newFile.size
};

const updated = [...existing, attachment];

return { json: {
  rowId: $json.Id,            // NocoDB's internal primary key for the row
  clientUploads: updated
}};
```

6. `+` after Code → **NocoDB** → Operation: **Update**.
7. Config:
   - Credential: `Ilot — NocoDB`
   - Project/Table: same as before
   - **Row ID:** `{{ $json.rowId }}`
   - **Fields:**
     - `Client Uploads` : `{{ $json.clientUploads }}` (expression —
       JSON array)
8. Name: `appendToClientUploads`.

### B.6 — Acknowledge the upload to the user

The user should get a short confirmation so they know the doc arrived.

1. `+` after `appendToClientUploads` → **WhatsApp Business Cloud** →
   **Message → Send**.
2. Reuse the same Access-Token credential.
3. **Phone Number ID:** `1063131786890917`
4. **To:** `{{ $('WhatsApp Trigger').first().json.messages[0].from }}`
5. **Text Body:** (literal)
   ```
   Got it — we've saved your document. Our specialist will review it and get back to you soon.
   ```

### B.7 — Smoke test

1. Save workflow, keep **Active**.
2. From your whitelisted phone, WhatsApp the test number with a **PDF
   attachment** (and optionally a caption).
3. Expected:
   - Bot replies: *"Got it — we've saved your document…"*
   - NocoDB → Clients → your row → `Client Uploads` column now has one
     file entry. Click it → NocoDB opens a preview.
4. n8n Executions → walk through the nodes:
   `Switch` went to route 1 → `Download` returned binary → `HTTP upload`
   returned the attachment path → `findClientRow` found the row → `Update`
   wrote the Client Uploads array → final Send acknowledged.

---

## Part C — Flow 2: Admin sends final document (Admin → Client) (15 min)

### C.1 — NocoDB webhook configuration

1. NocoDB → `Clients` table → click the ⋯ menu (or the little icon next
   to the table name) → **Webhooks** → **+ Add Webhook**.
2. Name: `notify-client-on-completion`.
3. **Event:** `After Update`.
4. **Condition** (this is the key to prevent noisy firings):
   - `Status` **is** `COMPLETED`
   - **AND** `Final Document` **is** **not null**
5. **URL:** we'll fill this in a moment from n8n.
6. **Method:** `POST`.
7. **Body:** `Handlebars` template (NocoDB's default) —
   ```json
   {
     "rowId": "{{data.Id}}",
     "phone": "{{data.Phone}}",
     "name": "{{data.Name}}",
     "service": "{{data.Service}}",
     "finalDocument": {{{data.FinalDocument}}}
   }
   ```
   *(NocoDB's template engine uses `{{{ }}}` triple-braces to inject the
   attachment JSON array verbatim — don't change to double-braces.)*
8. Save — you'll come back to paste the URL.

### C.2 — Create the n8n webhook workflow

In n8n:

1. Top-left → **+ New Workflow**. Name: `Ilot — Outbound Final Document`.
2. Add a **Webhook** trigger:
   - **HTTP Method:** `POST`
   - **Path:** `ilot-final-doc`
   - **Authentication:** `None` (for MVP; tighten later with HMAC + a
     shared secret header check).
   - **Response Mode:** `Immediately` with default response.
3. Copy the **Production URL** shown in the node (e.g.
   `https://n8n.ilotlegal.com/webhook/ilot-final-doc`).
4. Go back to NocoDB → paste the URL into the webhook's URL field → Save.

### C.3 — Send the file via WhatsApp

After the Webhook trigger:

1. `+` → **WhatsApp Business Cloud** → **Message → Send**.
2. Config:
   - Credential: `Ilot — Test WABA (API)`
   - **Phone Number ID:** `1063131786890917`
   - **To:** `{{ $json.body.phone }}`
   - **Message Type:** `Document` (the node has a dropdown — pick
     `document`, not `text`)
   - **Media Type:** `Link` (send-by-URL path — Meta downloads the file
     itself; no pre-upload needed)
   - **Link:** `{{ $json.body.finalDocument[0].signedUrl ?? ('https://nocodb.ilotlegal.com/' + $json.body.finalDocument[0].signedPath) }}`
     — *signedUrl* is present when NocoDB is using S3; *signedPath* is
     relative when using local filesystem — this expression handles both.
   - **Filename:** `{{ $json.body.finalDocument[0].title }}`
   - **Caption:**
     ```
     Here is your completed {{ $json.body.service }} document. Thank you for choosing Ilot 🙏
     ```
3. Save workflow. **Activate**.

### C.4 — Smoke test

1. NocoDB → Clients → any row (e.g. the one you just created).
2. Drag a PDF into the `Final Document` cell.
3. Change `Status` to `COMPLETED`.
4. Wait ~5 seconds.
5. The phone on that row should receive the PDF as a WhatsApp message
   with the caption.

### C.5 — Common issue: Meta can't fetch the file

If Meta rejects the document with something like `Media upload failed —
URL returns 404 / 401 / took too long`:

- NocoDB's attachment URL might be behind auth if you've configured it
  that way. Confirm you can `curl -I` the URL from your laptop **without
  authentication** — Meta's fetch goes anonymous.
- Some self-hosted NocoDB setups return relative paths like
  `download/noco/…` instead of absolute URLs. Check the webhook payload's
  `finalDocument[0]` shape in your Executions log — if it only has `path`
  without `signedUrl`, you need a pre-step to generate a signed URL via:
  ```
  GET https://nocodb.ilotlegal.com/api/v2/downloadAttachment/{modelId}/{columnId}/{rowId}
    xc-token: <token>
  ```
  which returns a shorter-lived signed URL. This gets fiddly; come back
  to me if you hit it.

---

## Part D — Safety and production hardening (skip for MVP)

A few things worth noting for when you go live (not blocking):

1. **Rate-limit on attachment column.** Meta can deliver up to 16MB
   documents and 5MB images. NocoDB's default upload limit is 50MB.
   Fine for MVP.
2. **HMAC webhook verification.** NocoDB can sign webhooks with HMAC;
   n8n's Webhook node supports verifying. Essential before going public.
3. **Backup strategy.** Coolify's backup job must include
   `/usr/app/data` (or your S3 bucket) — otherwise attachments are lost.
4. **Virus scanning.** Incoming client files are currently untrusted.
   For a legal firm handling passports, a ClamAV step before the NocoDB
   upload is worth adding later.

---

## What's next (back to the main line)

- **Layer 4 — admin routing.** When a lead is captured (Layer 3's `true`
  branch), also notify the right ILOT department admin on WhatsApp.
- **Layer 5 — `human_active` silence flag.** Bot goes quiet once an admin
  joins the chat.

Both are ~15 min each.
