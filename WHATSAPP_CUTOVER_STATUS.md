# WhatsApp Number Cutover — Status & Handover

> **Last updated:** 18 August 2026
> **Goal:** move the WhatsApp bot + website from the Meta **sandbox test number**
> to the real Indonesian business number **+62 819-9480-0946**.
> **Current state:** ⚠️ **NOT LIVE — blocked on one item** (a WABA-scoped System User token).
> The website has been deliberately reverted to the old working number so customers
> are not sent to a dead line.

If you read nothing else, read [The One Blocker](#the-one-blocker) and
[Exact steps to finish](#exact-steps-to-finish).

---

## TL;DR

| | Item | State |
|---|---|---|
| 1 | Phone number OTP verification | ✅ **Done** (18 Aug) — was the 22-day stall |
| 2 | n8n workflows repointed to new number | ✅ **Done & published** (6 nodes, 3 workflows) |
| 3 | Website env var + redeploy mechanism | ✅ **Proven working** (done, then intentionally reverted) |
| 4 | **Number registration on WhatsApp network** | ❌ **NOT DONE** — this is why it doesn't work |
| 5 | n8n credential scoped to correct WABA | ❌ **NOT DONE** — wrong WABA |
| 6 | Webhook re-subscription under new WABA | ❌ Not done (do after 4 & 5) |
| 7 | Website pointing at new number | ↩️ **Reverted on purpose** — flip LAST, after 4–6 verified |

Items **4 and 5 are the same blocker**: both need one System User token.

---

## The one blocker

**Nothing else can proceed until a WABA-scoped System User token exists.**

The n8n credential `o6dqNLf1TgJgnOIW` is currently scoped to the **Test** WABA
(`1642983990345181`), but the new number lives in WABA `881512055018127`. That same
token is also required to *register* the number. So one action unblocks both.

**What to do (needs a human in Business Settings):**

1. <https://business.facebook.com/latest/settings/system_users>
2. Create or select a system user (e.g. `n8n-whatsapp-bot`), role **Admin**
3. **Add Assets** → WhatsApp Accounts → **`Ilot Legal` (`881512055018127`)** → full control
4. **Generate New Token** → select App `977601884782973` →
   scopes **`whatsapp_business_messaging`** + **`whatsapp_business_management`** →
   **Token expiration: Never**
5. Store it in 1Password (`ILOT — Meta WhatsApp credentials`). Meta will not show it again.

---

## Why the WhatsApp link was broken

Clicking WhatsApp on the site produced *"this number isn't on WhatsApp"*.

**Root cause: the number is verified but never *registered*.** These are two distinct steps
and they are easy to conflate:

| Step | What it proves / does | Status |
|---|---|---|
| **OTP verification** | you control the SIM | ✅ done 18 Aug (`Unverified` → `Pending`) |
| **Registration** (`POST /{phone-number-id}/register`) | **activates the number for Cloud API and creates the WhatsApp identity** | ❌ never done |

Passing the OTP moved the status to `Pending`. That is **only the display-name review** —
it does **not** mean registration happened, and it does **not** block registration.
A number can sit verified-but-unregistered indefinitely: visible in the Meta console,
absent from the WhatsApp network.

There is **no button** for registration in WhatsApp Manager. It is API-only, and the API
call needs the token above.

### The `wa.me` probe — cheapest live/dead test

Open `https://wa.me/<digits>` and read the page text:

| Number | Page shows | Meaning |
|---|---|---|
| `6282339941015` (old) | **“Ilot Legal Admin”** — a resolved profile name | ✅ live on WhatsApp |
| `6281994800946` (new) | “Chat on WhatsApp with +62 819-9480-0946” — raw digits echoed | ❌ not on the network |

**Use this as the go/no-go gate before ever pointing the website at a number.**

---

## Key IDs (all verified live on 18 Aug 2026)

| Thing | Value |
|---|---|
| Meta App ID | `977601884782973` |
| Business portfolio (BID) | `1078466952016668` |
| Business portfolio legal name | PT INTERNATIONAL LIVING ONE TOUCH |
| **Target WABA** — “Ilot Legal” | **`881512055018127`** |
| **New number** | **+62 819-9480-0946** (Indonesia) |
| **New Phone Number ID** | **`1231024886758816`** |
| Old sandbox number | +1 555-631-8680 (“Test Number”) |
| Old sandbox Phone Number ID | `1063131786890917` |
| Sandbox’s WABA (“Test WhatsApp Business Account”) | `1642983990345181` |
| Website’s current live number | +62 823-3994-1015 → `6282339941015` |
| n8n WhatsApp API credential (send) | `o6dqNLf1TgJgnOIW` — “WhatsApp account” |
| n8n WhatsApp OAuth credential (trigger) | `vAFJXGxZw8i6HQ7P` — “WhatsApp OAuth account” |
| Coolify app (frontend) | `nuy3v2h400jw7272uhdo19cp` |

> ⚠️ `docs/whatsapp-setup/STATUS.md` (14 May) lists a “Prod WABA `786260250486628`
> (Ilot Property Legal — Offline)”. Business Settings on 18 Aug shows only **three**
> WhatsApp accounts: `Ilot Legal` (`881512055018127`), `Test WhatsApp Business Account`,
> and `Ilot Legal Admin` (WhatsApp Business App). That older ID was **not** re-confirmed —
> treat it as stale until verified.

---

## What was actually done on 18 Aug 2026

### 1. Diagnosed the “verification taking forever” stall ✅

The Meta developer-app use-case page (`wa-configurations-v2`) that everyone was staring at
is a **static checklist with fake time estimates** — it shows no real state. The real state
lives on `business.facebook.com`.

Findings:

- **Phone number OTP had never been entered.** The number sat `Unverified` since
  **27 Jul 2026** — 22 days — with a live self-service `Send verification code` button.
  Nothing was queued at Meta. This was the stall.
- **Business Verification was REJECTED, not pending.** Security Center reads verbatim:
  *“Your submission has been rejected. You can upload new documents or submit your original
  ones for another review.”* Status `Couldn't be verified`. No reviewer is coming back.
- The WABA panel separately shows `Account status: Review in Progress` (display-name review,
  a *different* pipeline). Reading only that panel is what created the illusion of a stall.
- **No payment method** on the WABA.
- The developer-app “1 required action” is Marketing API welcome spam — a red herring.

### 2. Completed the phone number OTP ✅

Drove the flow in the browser: `Send verification code` → method chooser (**Text message**)
→ `Next` → Meta confirmed **“Code sent successfully.”** → code entered by the user.

**Result, verified on a fresh page load:** status `Unverified` → **`Pending`**, and the
`Phone number verification required` banner + `Send verification code` button are **gone**.

### 3. Repointed all n8n workflows to the new number ✅

Swapped `phoneNumberId` `1063131786890917` → `1231024886758816` in **6 nodes** across
**3 workflows** (not 5 — `Ops Alert: No Agent` also carried the sandbox ID):

| Workflow | ID | Nodes changed |
|---|---|---|
| Ilot - Inbound Whatsapp | `EHTyQZSnZMZsespF` | `Send message`, `Send commitment ask` |
| Ilot - Commitment Gate (#4) | `Lgrc2W90RxRo0EPG` | `WhatsApp: Resend Please` |
| Ilot - Assign Agent (#5) | `Ez08kr0HLdziPPwy` | `Notify Agent (WhatsApp)`, `Confirm to Customer`, `Ops Alert: No Agent` |

Untouched (no WhatsApp nodes): `Ilot - Calendar Check (sub)` `fbNF72OFmS0rRtuv`,
`Ilot - Calendar Book (sub)` `KB1esFv6zhbDHTkK`.

**Verified:** 0 sandbox references and 6 new-number references in **both** the draft and
the **published** version of every workflow.

> **⚠️ n8n 2.10.2 uses draft/publish versioning — this nearly caused a false “done”.**
> `PATCH /rest/workflows/<id>` returns `200` but edits **only the draft**. Production runs
> `activeVersion`. The first patch looked successful while production still ran the
> **11 June** version with the sandbox number. Publishing is
> `POST /rest/workflows/<id>/activate` with `{"versionId": "<draft versionId>", "versionName": "..."}`.
> **Always verify against `activeVersion`, never `nodes`.**

### 4. Proved the website cutover works, then reverted it ↩️

- Set Coolify `NEXT_PUBLIC_WA_NUMBER` = `6281994800946`, redeployed (Finished, ~4 min).
- Verified live HTML: **9** `wa.me/6281994800946` links on `/`, **3** on `/contact`, zero
  references to the old number, HTTP 200.
- Then the *“number isn’t on WhatsApp”* error surfaced → root-caused to missing registration.
- **Reverted** to `6282339941015` and redeployed. Verified live: 9 links on `/`, 3 on
  `/contact`, zero `6281994800946`, HTTP 200.

So the mechanism is proven end-to-end; only the *timing* was wrong. Flip it **last**.

> **Incident, for transparency:** while editing the Coolify env var, keystrokes **appended**
> instead of replacing (Alpine.js intercepts `Cmd+A` on that masked field), and a corrupted
> value `NEXT_PUBLIC_WA_NUMBER=628233994101566228811999944880000994466` was **saved to
> production** for ~2 minutes before being caught on a fresh-page-load check. Repaired via
> **Developer view** (raw textarea) + Livewire submit. All 14 environment variables were
> then audited — every other value byte-identical.
>
> **Lesson for editing Coolify env vars programmatically:** use `Developer view` and the raw
> `variables` textarea, guard that exactly one line differs, and verify in a **brand-new
> tab** (the edited tab's client state lies). The per-row `Update` button can report success
> while saving the old value.

---

## Exact steps to finish

Ordered. Do not reorder — the public link flips **last**.

1. **Mint the System User token** — see [The One Blocker](#the-one-blocker).

2. **Choose and save a 6-digit PIN.** Needed for registration and any future
   re-registration. Store in 1Password.

3. **Register the number** (this is the step that fixes “not on WhatsApp”):
   ```bash
   curl -X POST "https://graph.facebook.com/v25.0/1231024886758816/register" \
     -H "Authorization: Bearer $WA_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"messaging_product":"whatsapp","pin":"<YOUR_6_DIGIT_PIN>"}'
   ```
   Expect `{"success": true}`.

4. **Verify with the `wa.me` probe.** Open <https://wa.me/6281994800946>. It must now show a
   **profile name**, not the raw digits. **Do not continue until this passes.**

5. **Update the n8n credential** `o6dqNLf1TgJgnOIW`:
   - `businessAccountId` → `881512055018127`
   - `accessToken` → the new System User token

6. **Re-subscribe the webhook.** Webhook subscriptions are **per-WABA** — if this is skipped,
   inbound messages go **silently dead with no error**. In the Meta app’s WhatsApp
   configuration, set the callback URL to n8n’s production webhook for the
   `WhatsApp Trigger` (webhookId `5753081f-2357-4dc2-8f77-9a02ee3a8bd7`) and subscribe the
   **`messages`** field under WABA `881512055018127`.

7. **End-to-end test:** send a real WhatsApp message to +62 819-9480-0946 →
   `Ilot - Inbound Whatsapp` execution appears green in n8n → bot replies.

8. **Only now flip the website:** Coolify → `NEXT_PUBLIC_WA_NUMBER` = `6281994800946` →
   **Redeploy** (not Restart — `NEXT_PUBLIC_*` is inlined at build time) → confirm live HTML.

---

## Known outstanding issues (not blocking the cutover)

- **`Ops Alert: No Agent` has a placeholder recipient.** In `Ilot - Assign Agent (#5)`,
  `recipientPhoneNumber` is the literal string `REPLACE_WITH_OPS_FALLBACK_NUMBER`.
  **This node has never worked.** Needs a real ops number.
- **Business Verification rejected** → caps messaging at **250 unique recipients / 24 h**.
  Needs fresh documents resubmitted in Security Center. The bot still functions.
- **No payment method** on the WABA → **replies only within the 24-hour customer service
  window**; no business-initiated or template sends outside it. The inbound-lead flow
  still works.
- **Display name review** for “Ilot Legal” is `Pending` (requested 27 Jul). Affects only
  which name customers see, not the ability to send.
- **`docs/whatsapp-setup/STATUS.md` is stale** (14 May) — its architecture diagram still
  shows the sandbox number as the frontend target, and its “Prod WABA” ID is unconfirmed.

---

## Rollback

Local backups of all 5 workflows as they existed **before** any edits:

```
~/ilot-wa-cutover/backup/n8n_workflows_20260818_142956.json   # all 5, raw API responses
~/ilot-wa-cutover/backup/pristine/<workflowId>.json           # per-workflow, pretty-printed
```

To roll back a workflow: `PATCH /rest/workflows/<id>` with the pristine
`name`/`nodes`/`connections`/`settings`, then **publish** via
`POST /rest/workflows/<id>/activate` (see the versioning warning above) — otherwise
production keeps running the old published version.

To roll back the website: set `NEXT_PUBLIC_WA_NUMBER` = `6282339941015` and **Redeploy**.

---

## Useful links

| What | URL |
|---|---|
| Phone numbers (per-number status, OTP banner) | `https://business.facebook.com/latest/whatsapp_manager/phone_numbers/?business_id=1078466952016668&asset_id=881512055018127` |
| Activity log (timeline of what was submitted when) | `https://business.facebook.com/latest/whatsapp_manager/activity_log/?business_id=1078466952016668&asset_id=881512055018127` |
| Business Verification status | `https://business.facebook.com/latest/settings/security_center?business_id=1078466952016668` |
| WhatsApp accounts (WABA list + IDs) | `https://business.facebook.com/latest/settings/whatsapp_account?business_id=1078466952016668` |
| System Users (mint the token here) | `https://business.facebook.com/latest/settings/system_users` |
| n8n | <https://n8n.ilotlegal.com> |
| Coolify — frontend env vars | `https://coolify.ilotlegal.com/project/hvmnimvtxek8978h1jcwkx6p/environment/bc05sfgqi7hlmw84g0i95pdq/application/nuy3v2h400jw7272uhdo19cp/environment-variables` |

**Do not diagnose from** the developer-app use-case page
(`developers.facebook.com/apps/977601884782973/use_cases/customize/wa-configurations-v2/…`) —
it renders a static checklist and tells you nothing about real state.
