# Archive

Historical record. **Nothing in this folder describes how the project works today** — it is kept
because it explains why things ended up the way they did, and because some of it contains
credentials-adjacent setup detail that would be painful to reconstruct.

Do not follow any runbook in here without checking it against the active docs first.

| Archived | What it was | Read instead |
|---|---|---|
| `next-steps.md` | MVP build plan, verified against Meta/Coolify docs on 4 May 2026. Carried out. | [`../human-agent-handoff.md`](../human-agent-handoff.md) for the current state |
| `ilot-simple-bot-solution.md` | Architecture argument for WhatsApp + n8n + Sheets over a Slack bridge. The decision it argues for is the one that shipped. | — |
| `whatsapp-setup/` | Five setup runbooks, last touched 14 May 2026. `status.md` already marked itself superseded for anything number- or WABA-related. | [`../whatsapp-cutover-status.md`](../whatsapp-cutover-status.md) |
| `plans/`, `specs/` | Phase plans and specs from April–May 2026 for the Sanity migration, blog, and regulatory updates. All landed. | The code, plus [`../design.md`](../design.md) |
| `seed-data-services.json` | Earlier shape of the service catalogue. | [`../seed-data/raw.json`](../seed-data/raw.json), the file the importer reads |
| `proposal-one-touch-digital-ecosystem.{docx,pdf}` | Client-facing proposal. | — |

Where the archived text disagrees with the repo as it stands, the repo is right. Known drift:

- A `supabase/` folder that no longer exists. Its one live file is now
  `docs/seed-data/legacy-categories.sql`.
- `src/lib/supabase/`, `src/sanity/lib/writeClient.ts`, `src/sanity/lib/image.ts` and
  `scripts/lib/normalize.ts` — all deleted as unreachable.
- `docs/seed-data-raw.json`, now `docs/seed-data/raw.json`.
- Uppercase doc filenames (`DESIGN.md`, `NEXT_STEPS.md`, and so on). Everything under `docs/`
  is kebab-case now.
