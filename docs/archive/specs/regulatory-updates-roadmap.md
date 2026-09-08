# Regulatory Updates — Multi-Phase Roadmap

> **Status:** Phase A shipped (2026-04-27). Phases B–D scoped from memory of original brainstorm; refine before turning any phase into a real implementation plan.

## Background

Regulatory Updates is a content type for surfacing Indonesian legal/regulatory changes that affect Ilot's services. Each update can reference one or more services, has a severity level (info / warning / critical), and an effective date.

**Lifecycle model the admin follows:**
- Update is *news* — it announces that a rule changed.
- Service page reflects the *current state of the world* — the admin updates service fields when the rule takes effect.
- Updates stay published indefinitely; they get **deactivated** (toggled `isActive: false`) when no longer newsworthy, not deleted. URLs remain live for SEO/archival.

---

## Phase A — Foundation ✅ SHIPPED

Plan: `docs/superpowers/plans/2026-04-27-regulatory-updates-phase-a.md`

Delivered:
- `update` Sanity schema (title, slug, summary, body, severity, effectiveDate, publishedAt, affectedServices[], sourceUrl, isActive)
- `lastVerifiedAt` field on Service
- `/updates` listing page with severity-coloured cards
- `/updates/[slug]` detail page reusing PostBody
- `UpdatesBanner` component on service detail pages — uses GROQ back-reference (`^._id in affectedServices[]._ref`) to show up to 3 recent updates per service inline
- Studio sidebar entry "Regulatory Updates" sorted newest-first

---

## Phase B — Make it useful to clients

**Goal:** Help clients find updates relevant to *them*, in the language they read.

### B1. Filtering on `/updates`
- Filter by severity (info / warning / critical)
- Filter by category (Visa & Immigration, Company Setup, etc.)
- Filter by individual service (multi-select)
- URL-driven filters so links are shareable
- Counts in filter chips

### B2. Indonesian locale (`id`)
Currently the frontend reads only `.en` from localized fields. Phase B turns this on:
- Render `title.id`, `summary.id`, `body.id` when locale = `id`
- Locale switcher on `/updates` and `/updates/[slug]`
- Fallback to `en` when `id` is empty
- Apply same to service pages and blog posts (cross-feature work — may belong in a separate "i18n" plan)

### B3. Notification subscriptions
- Capture email + selected services on a "Get notified" form on `/updates`
- Store subscriptions in Supabase
- When a `critical` or `warning` update is published, send an email digest to subscribers whose selected services intersect with `affectedServices`
- Use existing email provider (decide: Resend / SendGrid / similar)
- Optional: WhatsApp broadcast for `critical` only — needs WA Business API setup

### B4. Auto-bump `lastVerifiedAt`
- When an update is published referencing a service, bump that service's `lastVerifiedAt` to the publish date
- Implement via Sanity webhook → Next.js route handler → `writeClient.patch(...)` on each affected service
- Visible benefit: service pages show "Last verified: X days ago" — credibility signal for clients

---

## Phase C — Editorial workflow

**Goal:** Scale the team's ability to publish updates without engineering involvement.

### C1. Scheduled publishing
- Allow `publishedAt` to be in the future
- Update GROQ queries to filter `publishedAt <= now()` (already done in Phase A queries, just needs verification)
- ISR revalidation respects scheduled dates (consider on-demand revalidation via Sanity webhook)

### C2. Approval workflow
- Sanity Studio plugin or custom workflow: draft → review → publish
- Reviewer field on the document
- Block direct publish without reviewer sign-off (governance for sensitive critical updates)

### C3. "Superseded by" reference
- New field: `supersededBy` → reference to another `update` doc
- When set, the old update's detail page shows a banner: "This update has been superseded by [link]"
- `UpdatesBanner` on service pages skips superseded updates automatically
- Admin uses this instead of just deactivating, when the new update directly replaces the old one

### C4. Auto-archival hint
- Soft signal in Studio when `publishedAt` is older than 6 months and `isActive` is still true: prompt admin to review/deactivate
- Implemented as a Studio document badge, not enforced — admin decides

---

## Phase D — Reach

**Goal:** Get updates in front of people who aren't already on the site.

### D1. RSS feed
- `/updates/rss.xml` route
- Standard RSS 2.0 format with item per active update
- Lets clients/partners subscribe via RSS readers, lets us syndicate to legal news aggregators

### D2. Homepage widget
- Surface the most recent `critical` update (if any from last 30 days) on the homepage
- Compact banner above the fold or in the hero area
- Click-through to `/updates/[slug]`

### D3. Newsletter integration
- Monthly digest email of all updates published that month
- Built on top of Phase B3's subscription infra
- Optionally a public landing page for the newsletter

### D4. Social share metadata
- Per-update Open Graph image (auto-generated with severity colour + title)
- Twitter Card metadata
- LinkedIn-friendly preview (legal audience uses LinkedIn heavily)

---

## Decision log / open questions

- **Email provider for B3:** TBD. Resend is simplest with Next.js; SendGrid has better deliverability for transactional+marketing mix.
- **Locale switcher behaviour (B2):** Per-page session vs. cookie-persisted vs. URL prefix (`/id/updates`). Recommend URL prefix for SEO.
- **WhatsApp broadcast (B3):** Requires WA Business API account + Meta verification. May be Phase D rather than B if approval lead time is long.
- **Pricing/severity rules:** Should a `critical` update auto-trigger any frontend behaviour beyond the banner (toast, modal)? Discuss before B3.

---

## How to use this doc

When you're ready to ship a phase:
1. Pick the phase (or a subset of items within it)
2. Refine scope with me (I'll point at this doc and confirm specifics)
3. Use `superpowers:writing-plans` skill to turn it into a real implementation plan in `docs/superpowers/plans/`
4. Execute via `superpowers:subagent-driven-development`

Items can be cherry-picked across phases — the phase grouping is a suggestion based on perceived value/cost, not a rigid sequence.
