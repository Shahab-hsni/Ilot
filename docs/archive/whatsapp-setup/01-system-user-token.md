# Creating a Non-Expiring System User Access Token (Meta WhatsApp Cloud API)

> **Why this is step #1 of Phase 3.** The token visible at `WhatsApp → API Setup`
> is a temporary user token that expires in **24 hours**. n8n's webhook would go
> dark every day at the same time, breaking the bot. You need a **System User**
> token with the expiration set to **Never**.
>
> Source of truth: `docs/NEXT_STEPS.md § 1.4` (live-verified 4 May 2026).
> Meta docs: <https://developers.facebook.com/docs/development/create-an-app/app-dashboard/system-users/>
> Meta business help: <https://www.facebook.com/business/help/503306463479099>

---

## Before you start — collect these four IDs

You'll paste them into n8n in the next runbook. Write them down now:

| Field | Where | Your value |
|---|---|---|
| **Phone Number ID** | WhatsApp → API Setup (already known) | `1063131786890917` |
| **WhatsApp Business Account (WABA) ID** | WhatsApp → API Setup | — |
| **App ID** | App Settings → Basic (top of page) | — |
| **Meta Business Portfolio (Business Manager) ID** | business.facebook.com → Settings → Business Info | — |

And one thing to create during this runbook:

| Field | Where | Your value |
|---|---|---|
| **System User Access Token (no expiration)** | created in § 4 below | — |

All five go into a password manager. The System User token especially — Meta shows it **exactly once** and you cannot recover it later. If you lose it, you regenerate a new one (old one stops working).

---

## 1. Open the System Users page (the canonical path has changed)

The path in older tutorials (`business.facebook.com/settings/system-users`) now 302-redirects to a login wall. The live canonical URL is:

**<https://business.facebook.com/latest/settings/system_users>**

If you're logged into multiple Meta accounts/portfolios in the browser, confirm the top-left dropdown shows the **ILOT Business Portfolio** (not your personal one).

You should see a page with **Users → System users** in the left rail, and "+ Add" button top-right.

---

## 2. Create the System User

1. Click **+ Add** (top-right).
2. **Name:** `n8n-whatsapp-bot` (anything descriptive — only visible internally).
3. **Role:** **Admin** (System User admins can generate tokens; Employee cannot).
4. Click **Create**.

You'll now see the new system user listed. Click it to open the user detail page.

---

## 3. Assign the WhatsApp Account (WABA) to the System User

This is the step people miss. A System User can only generate tokens scoped to **assets explicitly assigned to it**. By default, the new user owns nothing.

1. On the system user detail page, click **Add Assets**.
2. Asset category: **WhatsApp accounts**.
3. Select the ILOT WABA (the one with phone number `+1 555-631-8680` Test Number under it for now).
4. Toggle **Full control** → ON.
5. **Save Changes**.

If the WABA doesn't appear in the list, your Meta admin in Indonesia has not added it to the Business Portfolio yet. That's a prerequisite — ping them.

---

## 4. Generate the token

Still on the system user detail page:

1. Click **Generate New Token**.
2. **App:** select the Meta App that owns the WhatsApp product (the one with App ID you noted above; if unsure, the only app under this portfolio).
3. **Token expiration:** pick **Never**.
4. **Scopes** (permissions) — tick **exactly these two, nothing else**:
   - `whatsapp_business_messaging` — lets the token send/receive messages
   - `whatsapp_business_management` — lets the token manage phone numbers / templates
5. Click **Generate**.

Meta shows the token **once** in a modal with a **Copy** button. Copy it immediately into:
- Your password manager (1Password / Bitwarden) — **source of truth**.
- A scratch note in VS Code — for pasting into n8n in the next runbook.

**Do not close that modal until you've pasted the token somewhere safe.** Meta does not reveal it again. If you accidentally close it: go back, click **Generate New Token** again — the old token silently becomes invalid (any service using it breaks).

---

## 5. If Meta removed the "Never" option

Meta has been tightening token policies. If the **Token Expiration** dropdown only shows 60 days and no "Never" option when you read this:

- Pick 60 days, generate, store normally.
- Add a reminder in your calendar to rotate the token every **50 days** (leaves 10-day safety margin).
- Later, add an n8n Cron workflow that calls the Graph API to regenerate the System User token automatically and updates the n8n credential. (Not blocking.)

---

## 6. Sanity-check the token before moving on

From a terminal on your laptop, with the token pasted in place of `<PASTE_TOKEN>`:

```bash
curl -s "https://graph.facebook.com/v23.0/me?access_token=<PASTE_TOKEN>" | jq .
```

Expected output — an object with `id` (the system user's numeric ID) and `name: "n8n-whatsapp-bot"`. If you see an error like `"Invalid OAuth access token"`, the token is wrong (probably a copy/paste whitespace issue — regenerate).

Also test it can see the WABA:

```bash
curl -s "https://graph.facebook.com/v23.0/<WABA_ID>?access_token=<PASTE_TOKEN>" | jq .
```

Should return an object with `id`, `name`, etc. If you get `"(#10) Application does not have permission for this action"`, the WABA is not assigned to the system user (go back to § 3).

---

## 7. Store the four IDs alongside the token

At this point you should have all five values filled in:

```text
PHONE_NUMBER_ID          = 1063131786890917
WABA_ID                  = <from WhatsApp → API Setup>
APP_ID                   = <from App Settings → Basic>
BUSINESS_PORTFOLIO_ID    = <from business.facebook.com → Settings → Business Info>
SYSTEM_USER_ACCESS_TOKEN = EAAGZ... (long string, starts with EAA)
```

Put them in 1Password as a single secure note titled `ILOT – Meta WhatsApp credentials`. You will paste the **token** + **WABA_ID** into n8n's WhatsApp OAuth credential in the next runbook (`02-n8n-whatsapp-trigger.md`).

---

## Common gotchas

| Symptom | Cause | Fix |
|---|---|---|
| "This action cannot be performed because you do not have sufficient permissions" | You're not Admin on the Business Portfolio | Ask Indonesia team to promote you |
| WABA not listed in § 3 "Add Assets" dropdown | WABA lives in a different portfolio | Ask them to claim it, or migrate it |
| Token works for 24h then stops | You copied the temporary token from `API Setup`, not the System User token | Regenerate from System Users page |
| `(#10) Application does not have permission for this action` | Scope missing or WABA not assigned | Re-check § 3 and § 4 scopes |
| Token leaks accidentally (committed to git, pasted in Slack) | Meta will detect via scanning and auto-revoke, or a bad actor uses it | Regenerate immediately — all old copies die instantly |

---

## What happens next

The token you just generated is the thing n8n uses to talk to WhatsApp on behalf of ILOT. The next runbook (`02-n8n-whatsapp-trigger.md`) walks through:
1. Opening n8n at `https://n8n.ilotlegal.com` and creating the owner account
2. Setting the 8 critical env vars (`N8N_ENCRYPTION_KEY` one-time generated, etc.)
3. Creating the WhatsApp OAuth API credential in n8n and pasting the token + WABA ID
4. Adding a WhatsApp Trigger node → getting its Production Webhook URL
5. Pasting that URL + a verify token into Meta app dashboard → WhatsApp → Configuration → Webhook → Verify
6. Subscribing to the `messages` field
7. Smoke test: WhatsApp your test number (from a whitelisted phone) and see the trigger fire in n8n's Executions log

Total time: ~15 minutes of clicks.
