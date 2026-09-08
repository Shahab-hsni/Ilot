# Archived workflow snapshots

These two files have **no counterpart in production**. Read against
`n8n.ilotlegal.com` on 31 August 2026 via the public API, production has exactly five
active workflows:

```
EHTyQZSnZMZsespF  Ilot - Inbound Whatsapp      14 nodes
Ez08kr0HLdziPPwy  Ilot - Assign Agent (#5)      9 nodes
Lgrc2W90RxRo0EPG  Ilot - Commitment Gate (#4)  13 nodes
fbNF72OFmS0rRtuv  Ilot - Calendar Check (sub)   4 nodes
KB1esFv6zhbDHTkK  Ilot - Calendar Book (sub)    7 nodes
```

Neither of these is among them.

| File | Why it is here |
|---|---|
| `ilot-faq-reindex.json` | No production workflow reindexes FAQs. Production reads the FAQ table live instead — the `Search FAQs` **toolCode** node in the inbound workflow queries NocoDB on every message, so there is no index to rebuild |
| `ilot-outbound-status-updates.json` | No production workflow receives NocoDB status-change webhooks |

They are kept rather than deleted because they may describe intended work, and because
`docs/human-agent-handoff.md` refers to them. **Do not treat either as a description of
the current system.**

## What was wrong with the parent directory

The previous snapshots were not merely stale, they were a **different lineage**. The old
`ilot-inbound-whatsapp.json` had 12 nodes, Google Gemini, and an in-memory vector store
with Gemini embeddings. Production has 14 nodes, **OpenAI**, and no vector store anywhere.
Three production workflows had no file at all.

Everything in the parent directory is now the published `activeVersion` read from
production, with provenance recorded in each file's `meta` block.

## Secrets

Production workflows can carry credentials **inline in Code and toolCode nodes**, where a
credential-block scan does not see them. `Search FAQs` held a NocoDB personal access token
as a JavaScript literal; it is replaced with `__REDACTED_SEE_PRODUCTION_N8N__` in the
committed snapshot. Check for this whenever you re-export — a token in a Code node is
invisible in the n8n UI's credential list.
