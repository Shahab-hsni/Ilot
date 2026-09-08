# Local dev stack

Somewhere to build and test the n8n workflows that is not production. Editing
workflows directly in the production n8n UI is how a "done" report got made for
work that was never published.

## Run order

Run these from the repo root, not from this folder — the compose file's mounts
are resolved relative to itself, but the `node` paths below are not.

```bash
docker compose -f scripts/dev/docker-compose.yml up -d   # n8n :5678, NocoDB :8080, catcher :4000
node scripts/dev/seed-nocodb.mjs                         # tables + sample rows, prints local IDs
docker exec ilot-n8n n8n import:workflow --separate --input=/workflows
node scripts/dev/patch-n8n-local.mjs                     # wire the imported copies to the local stack
```

## Files

| File | Purpose |
|---|---|
| `docker-compose.yml` | The stack itself — n8n, NocoDB, webhook-catcher |
| `local-config.mjs` | URLs, logins, and the WhatsApp HMAC secret shared by the scripts |
| `seed-nocodb.mjs` | Creates the `Agents`, `Clients`, `FAQs` tables and sample rows |
| `patch-n8n-local.mjs` | Points the imported workflows at local IDs and at webhook-catcher |
| `send-inbound.mjs` | Signs and posts `fixtures/whatsapp-inbound.json` at the WhatsApp trigger |
| `webhook-catcher.mjs` | Prints any request it receives; stands in for WhatsApp sends |

## Local IDs never go in the repo

`n8n-workflows/*.json` holds production IDs. `patch-n8n-local.mjs` only writes to
the copies inside n8n, and the compose file mounts `n8n-workflows/` read-only so
an import cannot write back. Local table IDs belong in the local n8n and nowhere
else.

## What cannot run here

- **Meta WhatsApp Cloud API.** Inbound is simulated by the fixture. Outbound is
  replaced with an HTTP Request to webhook-catcher. Activating a workflow that
  contains the WhatsApp *trigger* fails with `Invalid Client ID` — activation
  calls Meta's Graph API to check the app's webhook subscription, so that node
  cannot be activated without a real Meta app.
- **The inbound AI Agent.** Production runs **OpenAI** (`lmChatOpenAi`), so the
  inbound workflow needs an OpenAI key to answer. The assign-agent and
  commitment-gate work does not touch it. (The Gemini / vector-store wiring that
  this note used to describe was only ever in a stale snapshot, now in
  `n8n-workflows/archive/`.)
- **Gmail trigger** for the Commitment Gate. Assign Agent (#5) *is* in the repo
  now — exported from production on 31 Aug as `ilot-assign-agent.json`.

## Chatwoot is gone

A Chatwoot shared inbox ran in this stack while it was evaluated. It worked and
was **not adopted** — the handoff is staffed by one PIC on the company admin
number, so there is no multi-agent routing to solve. Agents are notified by a
WhatsApp UTILITY template instead (`scripts/wa-template.mjs`).

The findings are kept in
[`docs/archive/chatwoot-evaluation.md`](../../docs/archive/chatwoot-evaluation.md),
including the one that outlives the decision: **a Cloud API number cannot also be
used in the WhatsApp Business app.** Recover the stack from git history if the
team ever outgrows a single PIC.

## The draft / activeVersion trap

n8n keeps a draft (top-level `nodes`) and a published snapshot (`activeVersion`),
and it runs `activeVersion`. `PATCH /rest/workflows/<id>` returns `200` and
changes only the draft. Publish with `POST /rest/workflows/<id>/activate`
(body `{"versionId": "<current versionId>"}`), then read the workflow back and
check `activeVersion` — never `nodes`.
