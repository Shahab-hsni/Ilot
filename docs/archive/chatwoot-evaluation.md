# Chatwoot Evaluation — Can It Replace the Handoff Design?

> **ARCHIVED 31 August 2026. NOT ADOPTED.**
>
> Chatwoot was evaluated on the local stack, it worked, and it was then dropped — because the
> client staffs the handoff with **one PIC on the company admin number**:
>
> > Nama: Debia · No. WA: +62 823-3994-1015 · Semua bidang
>
> A shared inbox exists to solve problems that do not arise there: no routing between several
> agents, and no personal number to leak, since `6282339941015` is Ilot's own former business
> number (its profile still reads "Ilot Legal Admin"). The one argument left standing was the
> audit trail, and that alone did not justify rewiring `ilot-inbound-whatsapp.json`, the only
> part of the system currently proven to work end to end.
>
> Notification went to a **WhatsApp UTILITY template with a dynamic URL button** instead — see
> `scripts/wa-template.mjs`. That is also what `next-steps.md` originally planned, and that
> document had already put Chatwoot "deliberately out of scope for v1".
>
> **Read this again if the team grows past one PIC**, or if the audit trail becomes a
> requirement. The findings below are measured, not estimated, and four of them outlive the
> decision:
>
> 1. **A Cloud API number cannot also be used in the WhatsApp Business app** — verified against
>    Meta's docs. This is why "let the admins use WhatsApp Business" is not available, and it
>    contradicts an assumption still written into `next-steps.md`.
> 2. **The `-ce` image ships no `enterprise/` directory yet contains the WhatsApp Cloud API
>    channel and agent bots**, so "is it free" is settled by construction, not by a pricing page.
> 3. **Chatwoot does not stop the bot after handoff**, in two separate ways. Any future adoption
>    has to gate the bot itself.
> 4. **Three traps** cost an hour each: `ENABLE_ACCOUNT_SIGNUP` is a database row that answers
>    404, webhooks to private IPs are refused by `ssrf_filter`, and bot tokens are barred from
>    admin endpoints.
>
> Everything below is the evaluation as written on the day, left unedited apart from this header.
> The local stack it describes (`scripts/dev/docker-compose.yml`, `chatwoot-setup.mjs`,
> `send-chatwoot-inbound.mjs`, `ilot-chatwoot-agent-bot.json`) **no longer exists** — recover it
> from git history if it is ever needed again.

---

## Why this was run

Two facts closed off the original plan:

1. **A Cloud API number cannot also be used in the WhatsApp Business app.** Verified against
   Meta's own documentation: after migration the number cannot be used in the Business app
   unless it is deregistered from Cloud API, which would take the bot and the n8n integration
   down with it. So "let the admins handle chats in WhatsApp Business" is not available.
   `+62 819-9480-0946` is `platform_type: CLOUD_API`.
2. **Mattermost was dropped by the client**, so the notify-then-relay design lost its channel.

What remains architecturally correct for "several humans handle one business number with a bot
in front" is a shared inbox on top of the Cloud API number. Chatwoot was the candidate because
the stack is already self-hosted on Coolify.

## Verdict on each assumption

| # | Assumption | Verdict | How it was established |
|---|---|---|---|
| 1 | WhatsApp channel is in Community edition | ✅ **Confirmed** | Ran the `-ce` image, which ships with no `enterprise/` directory at all, yet contains `app/models/channel/whatsapp.rb` and `app/services/whatsapp/providers/whatsapp_cloud_service.rb` |
| 2 | Agent bots exist in Community and attach to an inbox | ✅ **Confirmed** | Created via `POST /api/v1/accounts/1/agent_bots` and attached with `set_agent_bot`, on the `-ce` image. The `agent_bots` table is in the schema |
| 3 | Handoff stops the bot | ⚠️ **No — the bot has to stop itself, in two places** | Measured. Chatwoot webhooks the bot on every message whatever the status, and does not move a conversation out of `pending` when a human replies. Both cases fixed in the workflow and re-verified |
| 4 | Teams cover department routing | ✅ **Confirmed** | `visa` and `company-setup` conversations were each assigned to the matching team by the bot |
| 5 | It fits in available resources | ✅ **Confirmed, after a resize** | ~1.05 GB for Chatwoot's four services; ~2.1 GB for the whole seven-container stack at idle |

Assumption 1 is the one that changed shape. It was going to be inferred from the pricing page's
list of Enterprise features. Running the **`-ce`** image instead makes it structural: the
enterprise code is not in the image, so anything that works is Community by construction.

## The one thing Chatwoot does not do for you

**Chatwoot posts an agent-bot webhook for every incoming message on an inbox that has a bot
attached, whatever the conversation's status.** Handing a conversation to a human does not
silence the bot.

Measured. A conversation was handed over (status `pending` → `open`, team assigned), then the
customer sent another message. The bot fired and answered over the top of the human:

```
[customer]  I am ready to proceed with a PT PMA company setup
[system]    Assigned to company-setup by Ilot n8n bot
[system]    Conversation was reopened by Ilot n8n bot
[customer]  Any update on my application?
[agent/bot] Thanks for reaching out about legal. Could you tell me a bit more...   ← wrong
```

This is exactly the defect the `takeover` boolean was going to prevent. Chatwoot carries the
state — `conversation.status` is in the webhook payload — but does not enforce it. **The bot
must gate itself.**

The fix is one condition on the `Customer Message?` node, requiring
`conversation.status == "pending"`. `pending` means bot-managed; `open` means a person owns it.
With the gate in place the same test produced no bot reply.

### And that gate alone is not enough either

A second, worse case: **a human agent simply replying does not take the conversation over.**
Chatwoot leaves the status at `pending` when an agent writes into a pending conversation, so the
gate above still passes and the bot answers straight over the human:

```
[customer]  Question about KITAS renewal
[agent/bot] Thanks for reaching out about visa. Could you tell me a bit more...
[human]     Hi, this is Dewi from Ilot Legal. I can help with your renewal.
[customer]  Yes please, my permit expires next month
[agent/bot] Thanks for reaching out about visa. Could you tell me a bit more...   ← wrong
```

Relying on the agent to click something first is not a fix; it is the same class of problem as
the `department` free-text join, where the failure is invisible and looks like normal operation.

Three routes were checked before settling:

| Route | Verdict |
|---|---|
| Bot reads the conversation history and notices a human turn | ❌ `GET /conversations/{id}/messages` → 401, not authorized for bots |
| A Chatwoot automation rule flips the status when an agent replies | ❌ Rule conditions are `content, status, message_type, assignee_id, team_id, inbox_id, …` — no `sender_type`, so it cannot tell a human's outgoing message from the bot's own |
| **The bot reacts to the human's message event** | ✅ **This works** |

Chatwoot sends the agent bot a webhook for the human's reply too: `message_type: outgoing`,
`sender.type: "user"`. The bot's own replies carry `sender.type: "agent_bot"`, so the two are
distinguishable and the bot does not trigger on itself. The `Human Took Over?` branch watches for
that event and calls `toggle_status` → `open`.

Verified end to end: customer asks → bot answers, `pending`; a human replies and clicks nothing
else → status becomes `open`; the customer writes again → **no bot reply**.

So the takeover flag does not disappear, it moves: from a NocoDB column plus an IF node, to two
branches inside the bot. Cheaper, but not free, and easy to delete by accident. Both nodes carry
notes in the workflow saying so.

## What the defect list looks like after this

From the seven-row table in `human-agent-handoff.md`:

| Current defect | Under Chatwoot |
|---|---|
| `Agents` table has 0 rows | Gone — Teams and assignment replace it |
| Least-loaded picker, free-text `department` join that fails silently | Gone — but see the note below on where the free-text join reappears |
| `Ops Alert: No Agent` sends to `REPLACE_WITH_OPS_FALLBACK_NUMBER` | Gone — no WhatsApp notification to staff at all |
| `Notify Agent (WhatsApp)` cannot work (24h window + template) | Gone — agents are notified inside Chatwoot |
| Agent replies from a personal phone, no audit trail, number leaks | Gone — replies go out through the Cloud API number, and Chatwoot stores the thread |
| No AI takeover flag | **Not gone.** Moves into the bot as one condition |

The department string is still a free-text join, just between the bot's classification and the
Chatwoot team name instead of between two NocoDB columns. It is normalised (`trim` +
`toLowerCase`) on both sides, and an unmapped department now **throws** instead of failing down
a branch that looks healthy. That was the specific trap called out in the handoff document.

## What was built

All of it local, all of it in this repo.

| File | What it is |
|---|---|
| `scripts/dev/docker-compose.yml` | Chatwoot web, Sidekiq worker, pgvector Postgres, Redis. Host port **3010** |
| `scripts/dev/chatwoot-setup.mjs` | Account, admin, teams, agents, agent bot, API-channel inbox. Idempotent |
| `scripts/dev/send-chatwoot-inbound.mjs` | Sends a customer message, and can continue an existing conversation |
| `scripts/dev/patch-n8n-local.mjs` | Now also injects the Chatwoot base URL, account id, bot token, and the department → team map |
| `n8n-workflows/ilot-chatwoot-agent-bot.json` | **Proposal, not an export.** n8n as the front-line bot |

The inbox is an **API channel**, not a WhatsApp channel. A WhatsApp inbox validates its token
and phone number ID against the Graph API, which cannot work locally — the same wall the n8n
WhatsApp trigger hits with `Invalid Client ID`. From the agent bot's side the payload is the
same shape.

## Traps found along the way

Each of these cost real time and none are documented where you would look first.

### `ENABLE_ACCOUNT_SIGNUP` is a database row, not an environment variable

The env var is read **only** when `rails db:chatwoot_prepare` first seeds `installation_configs`.
After that the DB row wins and editing compose does nothing. Worse, with signup off,
`POST /api/v1/accounts` answers **404**, not 403 — the controller raises `RoutingError` — so it
reads as a wrong endpoint rather than a disabled feature. To change it on an existing volume:

```
docker exec ilot-chatwoot bundle exec rails runner \
  "InstallationConfig.find_by(name: 'ENABLE_ACCOUNT_SIGNUP').update!(value: 'api_only'); GlobalConfig.clear_cache"
```

Use `api_only`, not `true`: it returns auth tokens directly instead of requiring an emailed
confirmation link, which a scripted setup cannot click.

### The installation wizard is gated on Redis, not the database

Creating the account over the API does not dismiss it. `/` keeps redirecting to
`/installation/onboarding` until a **Redis** key is cleared:

```
docker exec ilot-chatwoot-redis redis-cli DEL alfred:CHATWOOT_INSTALLATION_ONBOARDING
```

The wizard only creates an account plus a super admin, which `chatwoot-setup.mjs` has already
done, so it is pure friction on a scripted install. The script now clears the key itself.

### Chatwoot refuses to call a webhook on a private IP

```
Invalid webhook URL http://n8n:5678/webhook/chatwoot-agent-bot :
Hostname 'n8n' has no public ip addresses
```

This is the `ssrf_filter` gem, reached through `lib/safe_fetch.rb`. Every hostname on a compose
network resolves to a private address, so without `SAFE_FETCH_ALLOW_PRIVATE_NETWORK=true` the
agent bot never fires.

**This matters in production too.** Two Coolify services talking over the internal network hit
the same wall. Prefer giving Chatwoot the public n8n hostname there — the flag weakens SSRF
protection for every outbound fetch, not just this one.

### Adding an agent is two steps, and the second one is easy to miss

Creating the user and adding them to a team grants **nothing**. An agent who is not a member of
the inbox sees zero conversations — `all_count: 0` — and every write answers 401, even though
their token authenticates fine and `GET /api/v1/profile` returns 200. Membership is what grants
access:

```
POST /api/v1/accounts/{acct}/inbox_members   {"inbox_id": 1, "user_ids": [2, 3, 4]}
```

Teams are for routing; inbox membership is for access. Both are needed.

Locally there is a third step: Chatwoot creates agents unconfirmed with a random password and
emails an invite, which cannot be clicked without SMTP. `chatwoot-setup.mjs` confirms them and
sets a known password so a human takeover can actually be tested.

### An agent bot token is rejected by admin endpoints

```
GET /api/v1/accounts/1/teams
-> 401 {"error":"Access to this endpoint is not authorized for bots"}
```

A bot may assign a team and change conversation status, but may not enumerate teams. So the
department → team map cannot be discovered at run time; it is injected by
`patch-n8n-local.mjs`, the same way NocoDB table ids are.

### When the bot webhook fails, Chatwoot fails open

With a broken `outgoing_url` the conversation was force-opened and logged:

> `Conversation was marked open by system due to an error with the agent bot.`

Worth knowing, and the right default for a legal firm: a broken bot yields a conversation
waiting for a human, not a silently dropped lead. This is strictly better than the current
design, where a failure takes the false branch and notifies nobody.

### The public contacts endpoint mints a new identity each call

`POST /public/api/v1/inboxes/{identifier}/contacts` returns a **fresh** `source_id` every time,
even for the same `identifier`. A follow-up message sent through a new `source_id` answers 404
against the earlier conversation. `send-chatwoot-inbound.mjs` looks the contact up and reuses
its existing `source_id`.

## Resources

Measured at idle, after the tests, on Colima:

| Container | Memory |
|---|---|
| `ilot-chatwoot` (Rails) | 412 MB |
| `ilot-chatwoot-worker` (Sidekiq) | 540 MB |
| `ilot-chatwoot-postgres` | 93 MB |
| `ilot-chatwoot-redis` | 5 MB |
| `ilot-n8n` | 464 MB |
| `ilot-nocodb` | 562 MB |
| `ilot-webhook-catcher` | 59 MB |
| **Total** | **~2.1 GB** |

The Colima VM was raised from 2 CPU / 4 GB to **4 CPU / 8 GB** before starting. Whether 4 GB
would have been enough was not tested — idle sits at 2.1 GB, which leaves little headroom for
Rails boot. The 2-CPU limit was the more likely problem.

## Reproducing it

```bash
docker compose -f scripts/dev/docker-compose.yml up -d
docker compose -f scripts/dev/docker-compose.yml run --rm --no-deps chatwoot-web \
  bundle exec rails db:chatwoot_prepare
node scripts/dev/chatwoot-setup.mjs           # prints local ids and the admin token
docker exec ilot-n8n n8n import:workflow --separate --input=/workflows
node scripts/dev/patch-n8n-local.mjs
CHATWOOT_API_TOKEN=<admin token> node scripts/dev/send-chatwoot-inbound.mjs "I want a KITAS"
```

Publish the workflow with `POST /rest/workflows/<id>/activate` and check `activeVersion`, never
`nodes`. Dashboard at <http://localhost:3010>.

## Not proven here — do not claim it

- **A real WhatsApp message reaching Chatwoot.** The API channel matches the shape only.
- **Whether n8n and Chatwoot can both subscribe to WABA `881512055018127`,** or whether Chatwoot
  must own the webhook exclusively. The migration sketch below assumes exclusive, and this needs
  confirming first — getting it wrong takes production inbound down.
- **Bot answer quality.** Classification is keyword-based locally. In production that node is
  where the AI Agent goes — and note that production runs **OpenAI**, not Gemini: the Gemini
  wiring only ever existed in the stale repo snapshot, which has since been replaced.
- **Chatwoot under real load**, and whether the assignment behaviour holds with several agents
  actually logged in.
- **Whether `roles & permissions` being Enterprise-only matters.** Community has the built-in
  agent/administrator roles; custom roles are paid. For a legal firm's client conversations,
  check this before rollout.

## If this is a go, what it costs

The work is the inbound rewiring, and it touches the one part of the system that currently
works end to end:

1. Chatwoot takes the Cloud API webhook for the WABA; n8n stops receiving Meta webhooks directly.
2. `WhatsApp Trigger` in `ilot-inbound-whatsapp.json` is replaced by the agent-bot webhook.
   Plan this against the **refreshed** 14-node OpenAI snapshot — the 12-node Gemini file this
   was originally sketched against was a different lineage and is now in `archive/`.
3. `Send message` is replaced by a Chatwoot message API call.
4. `ilot-outbound-status-updates.json` is repointed the same way.
5. The commitment gate keeps writing `Clients` in NocoDB — that state is separate from the
   conversation and does not move.
6. The `Agents` table is retired. `Clients.takeover` is not needed; the gate lives in the bot.

Plan it separately. `Ez08kr0HLdziPPwy` is no longer a blocker: it was exported on 31 Aug and is
in the repo as `n8n-workflows/ilot-assign-agent.json`, the published `activeVersion`.
