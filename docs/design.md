# Ilot — Design System

The de-facto design system for the Ilot marketing site, **derived from the code** (not a separate
spec the code must follow). When code and this doc disagree, the code in `src/app/globals.css` and the
shared components is the source of truth — update this doc to match.

Scope: the public marketing site (`src/app/(marketing)/**`). Sanity Studio uses its own UI.

---

## 1. Design tokens

Defined once in [`src/app/globals.css`](../src/app/globals.css) under `@theme`, consumed everywhere as
Tailwind utilities (e.g. `bg-surface`, `text-accent`, `rounded-card`).

| Token | Value | Tailwind class | Use |
|---|---|---|---|
| `--color-background` | `#FFFFFF` | `bg-background` | Default page background |
| `--color-surface` | `#F4F4F0` | `bg-surface` | Section wash / alternating bands, inset tiles |
| `--color-foreground` | `#0B0B1A` | `text-foreground` | Primary text, dark headings |
| `--color-accent` | `#F5B21A` | `text-accent` / `bg-accent` | Brand gold — CTAs, highlights, accents |
| `--color-muted` | `#64748b` | `text-muted` | Secondary/body text |
| `--color-dark` | `#0a0a14` | `bg-dark` | Dark sections (footer, CTA banner, stats band) |
| `--radius-card` | `2rem` | `rounded-card` | Canonical card radius (= `rounded-[2rem]`) |
| `--max-width-site` | `1800px` | `max-w-site` | Outer shell width (`.container-site`) |

Greys: use Tailwind's scale (`gray-100` borders, `gray-300`/`gray-400` muted text on dark, `gray-500`
secondary). `#1b1f27` appears as an alternate dark panel (CTA banner) — prefer `bg-dark` for new work.

---

## 2. Typography

Fonts loaded in [`src/app/layout.tsx`](../src/app/layout.tsx) via `next/font/google`:

- **Inter** → `--font-inter`, exposed as `font-sans` (the body default). All UI text.
- **Caveat** → `--font-caveat`, the `.font-caveat` utility (also seen as `font-[Caveat]`). Decorative
  accent only — currently the handwritten testimonial signatures. Do not use for body or headings.

Scale & weights (observed conventions):

- **Hero headings (canonical):** the page-level `<h1>` is **exactly**
  `style={{ fontSize: 'clamp(2.75rem, 4.5vw, 5.5rem)' }}` with `leading-[1.1] tracking-tight font-bold`.
  Use this same value on every hero (home, About, etc.) — do **not** invent a larger clamp.
- Secondary big headings (e.g. the "everything you need" overlay) use `clamp(2rem, 3.5vw, 4rem)`.
- **Section H2**: `text-2xl md:text-4xl` … up to `md:text-6xl` for big editorial headings, `font-bold`
  (or `font-medium` for the lighter editorial style in Testimonials/Insights), `tracking-tight`.
- **Card H3**: `text-base md:text-2xl font-bold` (feature cards) or `text-lg md:text-xl font-bold`.
- **Body**: `text-sm md:text-base` / `md:text-lg`, `leading-relaxed`, `text-muted` or `text-gray-600`.
- Headings are `text-foreground`; bold emphasis inside lighter headings uses `font-bold` on a `<span>`.

---

## 3. Layout & spacing

**Standard section container** (use this for every new section — see
[the homepage sections](../src/components/home)):

```tsx
<section className="py-12 md:py-24 bg-…">
  <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
    …
  </div>
</section>
```

- **Max width:** `max-w-[1400px]` for content sections. (`.container-site` / `max-w-site` = 1800px is
  the outer navbar/footer shell only.) Don't mix two `max-w-*` utilities on one element.
- **Horizontal padding:** always `px-4 sm:px-6 lg:px-8`.
- **Vertical rhythm:** `py-12 md:py-24` standard; `md:py-28`/`md:py-32` for more breathing room on
  editorial sections. Mobile stays at `py-12`.
- **Grid gaps:** `gap-4 md:gap-6` for card grids; `gap-3` for tight mobile grids.
- **Alternating backgrounds:** white ↔ `bg-surface` (`#F4F4F0`) ↔ `bg-dark` to separate sections.

---

## 4. Color usage & the category system

Each of the 7 service pillars has its own identity in
[`src/lib/category-colors.ts`](../src/lib/category-colors.ts): `{ accent, tint, mid }`.

- `accent` — dark saturated hue (hero overlays, the `w-1.5 h-6` accent bar, borders).
- `tint` — very light wash (e.g. service-detail CTA card background).
- `mid` — medium shade for links/text on light backgrounds.

Use `getCategoryColor(slug)` and apply via inline `style` (the hexes are dynamic, not Tailwind classes).
The recurring **accent-bar + heading** motif:

```tsx
<span className="w-1.5 h-6 rounded-full" style={{ backgroundColor: colors.accent }} />
<h3 className="text-lg md:text-xl font-bold text-foreground">{name}</h3>
```

---

## 5. Components & patterns

**Radius / no sharp corners.** Every box, panel, image frame, tile, and matrix has rounded corners —
**there are no sharp-edged boxes anywhere on the site.** Use `rounded-2xl`/`rounded-3xl` (≈ `rounded-card`,
2rem) for panels and cards; smaller elements use `rounded-2xl`/`rounded-full` (pills/avatars). When you
build a **gridline matrix** (borders between cells rather than separate cards), you must still round the
outer frame: put `rounded-3xl overflow-hidden border border-gray-200` on the container and `border-b
border-r border-gray-200` on the cells — the `overflow-hidden` clips the internal gridlines to the
rounded frame. Never leave a bare `border-t border-l` matrix with square outer corners.

**Cards** — the house style:
`rounded-3xl` (or `rounded-2xl md:rounded-3xl`), `border border-gray-100`,
`shadow-[0_8px_30px_rgb(0,0,0,0.04)]`, padding `p-5 md:p-8`. On grids add `h-full` so cells match height.

**Image-background cards** (bento): a `relative overflow-hidden group` card with `next/image fill`
`object-cover` (+ `group-hover:scale-105`), an overlay, and text in a `relative z-10` layer.
⚠️ The clipping element must be `position: relative` for `overflow-hidden`+rounding to clip absolutely
positioned children — see Gotchas.

**Primary CTA** — [`WhatsAppCTA`](../src/components/ui/WhatsAppCTA.tsx). Always the conversion action.
- `variant`: `primary` (`bg-accent text-foreground`, default) | `ghost` (outlined accent).
- `size`: `sm` | `md` | `lg`. Pill shape (`rounded-full`).
- Pass `serviceName`/`customMessage` to pre-fill the WhatsApp message; `label` for the button text.

**Buttons / links:** pill CTAs are `rounded-full`. Text links use `text-muted hover:text-foreground
transition-colors`; "more" links pair a label with a `lucide` `ArrowRight` that nudges on hover
(`group-hover:translate-x-1`).

**Section headers:** lead with the **heading** — pill badges and uppercase "eyebrow" labels were
intentionally removed from the homepage. Keep headers clean; if a kicker is truly needed, a single
small `uppercase tracking-[0.2em] text-accent` line is the lightest acceptable form (used sparingly).

**Service-card pills** are the one retained pill: the `target_client` badge inside service cards.

---

## 6. Motion

Built on `framer-motion`. Two layers:

**Scroll-reveal stagger** — [`src/components/ui/Reveal.tsx`](../src/components/ui/Reveal.tsx):
- `<RevealGroup>` wraps a block and orchestrates `staggerChildren` (default `0.12s`), firing once when
  scrolled into view (`viewport={{ once: true }}`).
- `<RevealItem>` is each cascading element: fade + 26px rise, `duration 0.6`.
- Apply to a heading group and to each card grid so children cascade in sequence.

**On-load entrances** (hero only, [`HeroCircle.tsx`](../src/components/home/HeroCircle.tsx)):
- Hero text staggers headline → description → CTA (`staggerChildren 0.14`, item fade + 22px rise).
- The 7 hero cards **fade-in-down** (`y: -28` desktop / `-20` mobile), staggered by `index * 0.09`/`0.07`.

**Shared easing:** `cubic-bezier(0.22, 0.61, 0.36, 1)` (`[0.22, 0.61, 0.36, 1]`). Reuse it for consistency.

**Reduced motion:** always respected. `Reveal` and the hero check `useReducedMotion()` and render
static (no transform) when the user opts out. Any new animation must do the same.

---

## 7. Imagery & icons

- **Logos** live in [`public/logos/`](../public/logos): `Ilot-Logo.svg` (navy — for light backgrounds,
  e.g. navbar), `Ilot-Logo-Light.svg` (for dark backgrounds, e.g. footer), plus `Logomark` variants
  (icon-only).
- **No external image hosts.** Unsplash was removed; do not reintroduce remote stock images. Allowed
  remote host (see [`next.config.ts`](../next.config.ts)): `cdn.sanity.io`.
- **Category / service heroes:** render the client-uploaded Sanity `coverImage` (`image_url`) when
  present, otherwise fall back to a **brand gradient** `linear-gradient(135deg, accent, mid)`. Never a
  blank or stock fallback.
- **Local section art:** `public/bento/*.webp`, `public/About_Ilot.webp`.
- **Icons:** [`lucide-react`](https://lucide.dev) only, typically `strokeWidth={1.5}`–`1.75`.

---

## 8. Building a new section or page — recipe

1. `<section className="py-12 md:py-24 bg-{white|surface|dark}">` with the standard
   `max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8` inner container.
2. Wrap the header block and each card grid in `<RevealGroup>`; make each animatable element a
   `<RevealItem>` so they cascade.
3. Use the house card style; add `h-full` on grid items.
4. End conversion-oriented pages/sections with a `<WhatsAppCTA>` (often on a `bg-dark` rounded panel).
5. Pull real data (categories/services) from Sanity via the `src/lib/db/*` helpers rather than
   hardcoding, so names/slugs/links stay accurate.

[`src/app/(marketing)/about/page.tsx`](<../src/app/(marketing)/about/page.tsx>) is a complete worked example
of all of the above.

---

## 9. Gotchas

- **Rounded image cards need `relative`.** `overflow-hidden` + `rounded-*` only clip absolutely
  positioned children (`next/image fill`, overlays) when the clipping element is itself a containing
  block — give it `position: relative`. (This caused the hero cards to render with sharp corners.)
- **Don't stack `max-w-*` utilities** on one element — they fight; the cascade winner is unpredictable.
- **Sanity empty object fields** (`localizedString`/`localizedText`) must be **absent**, not `null` —
  see [`CLAUDE.md`](../CLAUDE.md). Run `npm run fix:sanity` if Studio shows "Invalid property value".
- **GROQ ↔ types:** projections rename camelCase Sanity fields → snake_case to match
  [`src/lib/db/types.ts`](../src/lib/db/types.ts). Update both together.
- **Dev port is 3003** (3000 is taken by another project).

---

_Keep this doc honest: when you change a token, the card style, or the motion system, update the matching
section here so it stays the real reference rather than aspirational._
