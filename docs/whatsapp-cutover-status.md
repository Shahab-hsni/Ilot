# WhatsApp Number Cutover — Status & Handover

> **Last updated:** 19 August 2026
> **Goal:** move the WhatsApp bot + website from the Meta **sandbox test number**
> to the real Indonesian business number **+62 819-9480-0946**.
> **Current state:** ✅ **LIVE AND COMPLETE.** The number is registered on the WhatsApp
> network, the bot replies end-to-end, and the public website points at the new number.

If you read nothing else, read [What actually unblocked this](#what-actually-unblocked-this) —
the previous version of this document named the wrong blocker.

---

## TL;DR

| | Item | State |
|---|---|---|
| 1 | Phone number OTP verification | ✅ Done (18 Aug) — was the 22-day stall |
| 2 | n8n workflows repointed to new number | ✅ Done & published (6 nodes, 3 workflows) |
| 3 | Website env var + redeploy mechanism | ✅ Proven working |
| 4 | **Number registration on WhatsApp network** | ✅ **Done (19 Aug)** — `{"success": true}` |
| 5 | **n8n credential scoped to correct WABA** | ✅ **Done (19 Aug)** |
| 6 | **Webhook subscription under new WABA** | ✅ **Done (19 Aug)** — was empty |
| 7 | **Website pointing at new number** | ✅ **Done (19 Aug)** — 9 links `/`, 3 `/contact` |

**Verified live:** inbound WhatsApp message → bot replied in 5 s (n8n execution `456`,
`status: success`). `wa.me/6281994800946` resolves the profile name **“Ilot Legal”**.

---

## What actually unblocked this

**The previous version of this document was wrong about the blocker, and the correction
matters more than anything else here.**

It claimed: *“Nothing else can proceed until a WABA-scoped System User token exists”* and
listed business verification under *“not blocking the cutover.”* Both were false.

### The token blocker did not exist

The existing token (`META_TOKEN_ILOT`, a non-expiring **SYSTEM_USER** token on app
`977601884782973`) **already had full access** to WABA `881512055018127`. Proven by
`debug_token` (`whatsapp_business_messaging` + `whatsapp_business_management`,
`expires_at: 0`) and by successfully reading the target WABA’s phone numbers and templates.
**No new token was ever minted.** Skip steps 1 of the old “exact steps” entirely.

### Business verification *was* blocking registration — indirectly

`POST /register` initially failed with:

```
Phone Link to WABA Failed - Unverified WABA: You cannot proceed with this
operation since your WhatsApp Business account is not verified.
```

This reads like “pass business verification first”, which would mean waiting days on a
**rejected** application. That interpretation is wrong.

`GET /{phone-number-id}?fields=health_status` on the **BUSINESS** entity gave the real cause:

```
131000  Your business profile is incomplete. The following fields are
        required: Legal Name, Country, and Website.
```

The business portfolio had **no legal name** (console showed `No name`) and **no website**.
Filling those two fields was the entire fix:

| | Before | After |
|---|---|---|
| Legal business name | *(empty)* | `PT INTERNATIONAL LIVING ONE TOUCH` |
| Business website | *(empty)* | `https://ilotlegal.com` |
| BUSINESS entity `health_status` | `BLOCKED` | `LIMITED` |
| Error `131000` | present | **cleared** |
| `POST /register` | “Unverified WABA” | **`{"success": true}`** |

Registration succeeded on the **first attempt** immediately afterwards, with the pre-existing
token. Edit the fields at
`https://business.facebook.com/latest/settings/business_info?business_id=1078466952016668`
→ **Business details → Edit**.

> **Corollary worth acting on:** those empty fields are very likely *why business verification
> was rejected* — a reviewer had no company name or website to match the Indonesian documents
> against. Resubmitting now that they are populated has a materially better chance.

### Lesson: a validation error is not a green light

An early probe sent `POST /register` with a deliberately-invalid 2-character PIN and got
`(#100) Param pin must be 6 characters long`. That was read as “permissions are fine, the
call will work.” **It only proves the parameter check ran.** Meta validates arguments
*before* evaluating WABA eligibility, so the real blocker was still hidden. Always test with
a valid payload before declaring a path clear.

---

## Why the WhatsApp link was broken

Clicking WhatsApp on the site produced *“this number isn’t on WhatsApp.”*

**Root cause: the number was verified but never *registered*.** Two distinct steps, easily
conflated:

| Step | What it proves / does | Status |
|---|---|---|
| **OTP verification** | you control the SIM | ✅ done 18 Aug (`Unverified` → `Pending`) |
| **Registration** (`POST /{phone-number-id}/register`) | **activates the number for Cloud API and creates the WhatsApp identity** | ✅ done 19 Aug |

Passing the OTP moved status to `Pending`, which is **only the display-name review** — it does
not mean registration happened and does not block it. A number can sit verified-but-unregistered
indefinitely: visible in the Meta console, absent from the WhatsApp network.

There is **no button** for registration in WhatsApp Manager. It is API-only:

```bash
curl -X POST "https://graph.facebook.com/v25.0/1231024886758816/register" \
  -H "Authorization: Bearer $META_TOKEN_ILOT" \
  -H "Content-Type: application/json" \
  -d '{"messaging_product":"whatsapp","pin":"<6-DIGIT-PIN>"}'
```

**Number state after registration:**

| Field | Before | After |
|---|---|---|
| `status` | `PENDING` | **`CONNECTED`** |
| `platform_type` | `NOT_APPLICABLE` | **`CLOUD_API`** |
| `quality_rating` | `UNKNOWN` | **`GREEN`** |
| `is_pin_enabled` | `false` | **`true`** |
| `health_status` error `141000` | present | **cleared** |

### The `wa.me` probe — cheapest live/dead test

Open `https://wa.me/<digits>` and read the page text:

| Number | Page shows | Meaning |
|---|---|---|
| `6281994800946` (new) — **before** | “Chat on WhatsApp with +62 819-9480-0946” — raw digits | ❌ not on network |
| `6281994800946` (new) — **after** | **“Ilot Legal”** — resolved profile name | ✅ live |

**Use this as the go/no-go gate before ever pointing the website at a number.**

---

## Key IDs

| Thing | Value |
|---|---|
| Meta App ID | `977601884782973` |
| Business portfolio (BID) | `1078466952016668` |
| Business portfolio legal name | `PT INTERNATIONAL LIVING ONE TOUCH` (set 19 Aug) |
| Business website | `https://ilotlegal.com` (set 19 Aug) |
| **Target WABA** — “Ilot Legal” | **`881512055018127`** |
| **New number** | **+62 819-9480-0946** → `6281994800946` |
| **New Phone Number ID** | **`1231024886758816`** |
| Registration PIN | `199111` → **store in 1Password**, needed for any re-registration |
| Old sandbox Phone Number ID | `1063131786890917` |
| Sandbox WABA (“Test WhatsApp Business Account”) | `1642983990345181` |
| Previous website number (rollback target) | +62 823-3994-1015 → `6282339941015` |
| n8n WhatsApp API credential (send) | `o6dqNLf1TgJgnOIW` — “WhatsApp account” |
| n8n WhatsApp OAuth credential (trigger) | `vAFJXGxZw8i6HQ7P` — “WhatsApp OAuth account” |
| n8n trigger webhookId | `5753081f-2357-4dc2-8f77-9a02ee3a8bd7` |
| Coolify app (frontend) | `nuy3v2h400jw7272uhdo19cp` |
| Graph API version | `v25.0` |

> **Correction:** the previous version flagged prod WABA `786260250486628` as “stale, not
> re-confirmed.” It is **live** — it is the WABA holding `+62 823-3994-1015`, the number the
> website used until 19 Aug.

---

## What was done on 19 August 2026

### 1. Filled the business profile → unblocked registration ✅

See [What actually unblocked this](#what-actually-unblocked-this). Legal name + website set
via Business Settings; error `131000` cleared; BUSINESS entity `BLOCKED` → `LIMITED`.

### 2. Registered the number ✅

`POST /v25.0/1231024886758816/register` → `{"success": true}`. PIN `199111`.
Confirmed `CONNECTED` / `CLOUD_API` / `GREEN`, and `wa.me` now resolves “Ilot Legal”.

### 3. Subscribed the app to the target WABA ✅

`GET /v25.0/881512055018127/subscribed_apps` returned **`{"data": []}`** — **zero apps**.
Inbound messages would have gone **silently dead with no error**. Fixed with
`POST /v25.0/881512055018127/subscribed_apps`; now returns app `977601884782973` (“Ilot-legal”).

### 4. Repointed the n8n send credential ✅

Credential `o6dqNLf1TgJgnOIW` had `businessAccountId` = **`1642983990345181`** (the *Test*
WABA). Every send would have failed with 401 even with the number live. Changed to
**`881512055018127`** and set `accessToken` to the verified token.

> The 18 Aug node-parameter sweep changed `phoneNumberId` in the workflow nodes but **never
> touched the credential**, which is why the cutover would still have failed.

### 5. Flipped the website ✅

Coolify `NEXT_PUBLIC_WA_NUMBER`: `6282339941015` → **`6281994800946`**, then **Redeploy**.

**Verified on fresh fetches:**

| Page | HTTP | new number | old number |
|---|---|---|---|
| `/` | 200 | **9** | 0 |
| `/contact` | 200 | **3** | 0 |

### 6. End-to-end test passed ✅

Real inbound message → bot replied in 5 s. n8n execution `456`, workflow `EHTyQZSnZMZsespF`,
`status: success`. The WhatsApp thread shows *“This business is now using a secure service
from Meta to manage this chat”* — confirming Cloud API, not the consumer app.

---

## Editing Coolify env vars safely

`NEXT_PUBLIC_*` is inlined at **build time** — **Redeploy**, never Restart. Saving alone
changes nothing.

**The per-row value input lies.** It rendered `62812XXXXXXX` (the `.env.example` placeholder)
while the stored value was really `6282339941015`. Do not trust it, and do not diagnose from it.

> **Prior incident (18 Aug):** keystrokes **appended** instead of replacing (Alpine.js
> intercepts `Cmd+A` on that masked field) and a corrupted
> `NEXT_PUBLIC_WA_NUMBER=628233994101566228811999944880000994466` reached production for
> ~2 minutes.

**Procedure that works:**

1. **Environment Variables → `Developer view`** → read the raw `variables` textarea (this
   shows true values).
2. Change exactly one line. **Guard before submitting:** identical line count, identical key
   set and order, exactly one differing line, every other value byte-identical.
3. Set `.value`, dispatch `input` + `change` (Livewire/Alpine ignore silent mutations), then
   **Save All Environment Variables**.
4. **Verify in a brand-new tab** — the edited tab’s client state lies. Re-read the textarea
   and confirm the new value’s exact length (13 chars for the number: catches appended digits).
5. **Redeploy**, then confirm the live HTML.

---

## Live status, re-read 31 August 2026

Read from production without extracting the Meta token: a throwaway n8n workflow used credential
`o6dqNLf1TgJgnOIW` through an HTTP Request node with
`authentication: predefinedCredentialType` / `nodeCredentialType: whatsAppApi`, which makes n8n
inject the bearer itself. Created, called, and deleted in one pass. `GET /api/v1/credentials/<id>`
is still 405, so this is the way to use that token without reading it.

```
number   +62 819-9480-0946   CONNECTED / CLOUD_API / GREEN
can_send_message: BLOCKED

  PHONE_NUMBER  LIMITED    138024  SIP not enabled (WhatsApp Business calling — irrelevant here)
  WABA          BLOCKED    141006  error with the payment method
  BUSINESS      LIMITED    141010  business verification not passed
  APP           AVAILABLE  138025  no SIP server configured (irrelevant here)

templates: hello_world  APPROVED  UTILITY  en_US   ← Meta's sample, nothing custom
```

**The payment method was never added.** The client reported the number as "verified and
registered on Cloud API", which is true and visible above — but that is a different thing from
billing, the same conflation as OTP-verification vs registration earlier in this document.
`141006` blocks **business-initiated** conversations only; service-window replies still work,
which is why the inbound bot is unaffected.

Nothing custom is registered as a template yet, so the agent-notification template still has to
be submitted. **Submission does not require billing** — only sending does.

## Known outstanding issues (none block the bot)

- **Business Verification still `Rejected`** → caps messaging at **250 unique recipients /
  24 h**. Now worth resubmitting: the missing legal name + website were almost certainly the
  cause. **3 attempts per portfolio** — do not resubmit without checking the documents match
  `PT INTERNATIONAL LIVING ONE TOUCH` exactly.
- **No payment method** on the WABA (`health_status` error `141006`) → replies only inside the
  **24-hour customer service window**; no business-initiated or template sends outside it.
  The inbound-lead flow is unaffected (proven by the live test).
- **Display name review** for “Ilot Legal” is `Pending` (requested 27 Jul). Affects only which
  name customers see, not the ability to send.
- **`Ops Alert: No Agent` has a placeholder recipient.** In `Ilot - Assign Agent (#5)`,
  `recipientPhoneNumber` is the literal string `REPLACE_WITH_OPS_FALLBACK_NUMBER`.
  **This node has never worked.** Pre-existing, unrelated to the cutover.
- **Secrets in the build env:** `SANITY_API_WRITE_TOKEN` and `SANITY_API_READ_TOKEN` are
  present and **identical** 180-char values, so the build carries write access. Worth review.
- **`docs/archive/whatsapp-setup/status.md` is stale** (14 May) — different lineage; this file is the
  source of truth.

---

## Gotchas that cost real time

1. **n8n draft/publish versioning.** `PATCH /rest/workflows/<id>` returns `200` but edits
   **only the draft**; production runs `activeVersion`. Publish with
   `POST /rest/workflows/<id>/activate` and `{"versionId": "...", "versionName": "..."}`.
   **Verify against `activeVersion`, never `nodes`.**
2. **n8n secrets are unreadable via the public API.** `GET /api/v1/credentials/<id>` → **405**.
   Credential values require a logged-in UI session (`/rest/credentials/<id>?includeData=true`).
   Do **not** probe with `PATCH {}` — writing to a production credential to discover method
   support is unsafe.
3. **`__n8n_BLANK_VALUE_<uuid>` is a redaction sentinel, not a wiped value.** The same UUID
   appears for every password-type field across all credentials. Compare against a known-good
   credential before concluding data loss.
4. **Do not diagnose from the developer-app use-case page**
   (`developers.facebook.com/apps/.../wa-configurations-v2/…`) — a static checklist with fake
   time estimates that shows no real state. Real state is on `business.facebook.com`.
5. **`health_status` is the highest-signal Meta endpoint.** It reports errors per entity
   (BUSINESS / WABA / phone number) and is what exposed `131000`. Query it first:
   `GET /v25.0/{phone-number-id}?fields=health_status`.

---

## Rollback

**Website:** set `NEXT_PUBLIC_WA_NUMBER` = `6282339941015` and **Redeploy** (validated —
this exact revert was performed on 18 Aug).

**Webhook subscription:** `DELETE /v25.0/881512055018127/subscribed_apps`.

**n8n workflows** — pristine pre-edit backups:

```
~/ilot-wa-cutover/backup/n8n_workflows_20260818_142956.json   # all 5, raw API responses
~/ilot-wa-cutover/backup/pristine/<workflowId>.json           # per-workflow, pretty-printed
```

Restore with `PATCH /rest/workflows/<id>`, then **publish** via
`POST /rest/workflows/<id>/activate` — otherwise production keeps running the old version.

**Registration cannot be meaningfully rolled back**, nor should it be: the number is now a
live WhatsApp identity.

---

## Useful links

| What | URL |
|---|---|
| **Business info (legal name + website — the fix)** | `https://business.facebook.com/latest/settings/business_info?business_id=1078466952016668` |
| Phone numbers (per-number status, OTP banner) | `https://business.facebook.com/latest/whatsapp_manager/phone_numbers/?business_id=1078466952016668&asset_id=881512055018127` |
| Activity log (timeline of submissions) | `https://business.facebook.com/latest/whatsapp_manager/activity_log/?business_id=1078466952016668&asset_id=881512055018127` |
| Business Verification status | `https://business.facebook.com/latest/settings/security_center?business_id=1078466952016668` |
| WhatsApp accounts (WABA list + IDs) | `https://business.facebook.com/latest/settings/whatsapp_account?business_id=1078466952016668` |
| n8n | <https://n8n.ilotlegal.com> |
| Coolify — frontend env vars | `https://coolify.ilotlegal.com/project/hvmnimvtxek8978h1jcwkx6p/environment/bc05sfgqi7hlmw84g0i95pdq/application/nuy3v2h400jw7272uhdo19cp/environment-variables` |
