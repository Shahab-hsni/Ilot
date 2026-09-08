# Ilot Legal

Marketing site for Ilot Legal — service catalogue, blog, regulatory updates, and the WhatsApp
enquiry funnel. Content is authored in Sanity Studio, which is mounted inside this app at
`/studio`.

## Stack

Next.js 15 (App Router) · React 19 · Sanity CMS · Tailwind CSS v4 · Vitest.
Deployed as a standalone Docker image to Coolify on a Hostinger VPS.

Node 20 is required (`.nvmrc`, and `engines` pins `>=20.19.0 <21`) — it matches the Dockerfile,
and Node 21+ will not install cleanly.

## Getting started

```bash
nvm use                 # Node 20
npm install
cp .env.example .env.local   # then fill in the values
npm run dev             # http://localhost:3003
```

Port 3003, not the Next default — 3000 is taken by another project on the same machine.

Every variable in `.env.example` is commented with what it's for and where to get it. The site
renders without most of them; the ones that gate real behaviour are the Sanity project vars
(no content without them) and `GSHEET_WEBHOOK_URL` / `GSHEET_SECRET` (without which the survey
intake silently stores nothing).

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Dev server on :3003 |
| `npm run build` / `npm start` | Production build (standalone output) and serve |
| `npm test` / `npm run test:watch` | Vitest |
| `npm run lint` | ESLint |
| `npm run import:sanity:dry` | Preview a content import — **always run this first** |
| `npm run import:sanity` | Import `docs/seed-data/raw.json` into Sanity |
| `npm run cleanup:sanity:dry` / `npm run cleanup:sanity` | Remove orphaned Sanity docs — **always run after an import** |
| `npm run fix:sanity` | Unset null object fields and resolve slug conflicts |

The import and cleanup scripts read `.env.local` directly via `tsx --env-file`, so they need a
`SANITY_API_WRITE_TOKEN` in it. Why cleanup is not optional: `createOrReplace` upserts by exact
`_id`, so renaming anything leaves the old document behind, still active and still showing up in
queries. `CLAUDE.md` has the full workflow and the `_id` format.

## Local bot stack

The n8n workflows in `n8n-workflows/` are developed against a local Docker stack, never edited in
production. See [`scripts/dev/README.md`](scripts/dev/README.md).

## Docs

| | |
|---|---|
| [`docs/design.md`](docs/design.md) | Design tokens, components, motion — derived from the code |
| [`docs/deploy-coolify.md`](docs/deploy-coolify.md) | Deployment runbook |
| [`docs/human-agent-handoff.md`](docs/human-agent-handoff.md) | Agent handoff — **open production defect** |
| [`docs/whatsapp-cutover-status.md`](docs/whatsapp-cutover-status.md) | WhatsApp number cutover (complete) |
| [`docs/commitment-gate-flow.md`](docs/commitment-gate-flow.md) | Commitment gate, end to end |
| [`docs/client/editing-content.md`](docs/client/editing-content.md) | Written for the client — how to edit content in Studio |
| [`docs/archive/`](docs/archive/) | Historical only. Does not describe the current system. |
