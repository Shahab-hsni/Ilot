/**
 * About page.
 *
 * ⚠️ PLACEHOLDER CONTENT — the body copy (story, principles, stats, who-we-help,
 * the founder quote) is a sensible draft for client review. Replace anything marked
 * `PLACEHOLDER` once the client supplies their real history, numbers, names, and wording.
 * Structure, layout, and styling are final.
 *
 * Layout is intentionally varied (no card-grid monotony): centered hero → image/text
 * story → inline stat band → numbered principles list → "who we help" gridline matrix
 * → founder pull-quote → CTA. It does NOT re-list the service categories (those live on
 * the home hero) — this page is about the people and the philosophy, not the catalogue.
 */
import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { WhatsAppCTA } from '@/components/ui/WhatsAppCTA'
import { RevealGroup, RevealItem } from '@/components/ui/Reveal'

export const metadata: Metadata = {
  title: 'About',
  description:
    'Ilot (International Living One Touch) is a legal, immigration, and corporate services firm helping global investors and expatriates establish and protect their interests across Indonesia.',
}

// PLACEHOLDER — replace with the client's real figures.
const STATS = [
  { value: '110+', label: 'Clients served' },
  { value: '100+', label: 'Services delivered' },
  { value: '7', label: 'Practice areas' },
  { value: '34', label: 'Provinces covered' },
]

// PLACEHOLDER — principle names/descriptions are open to the client.
const PRINCIPLES = [
  {
    title: 'Integrity & compliance',
    desc: 'Every engagement runs strictly within Indonesian law. We protect your interests by never cutting corners on yours.',
  },
  {
    title: 'Absolute transparency',
    desc: 'Clear scopes, upfront pricing, honest timelines. No black boxes, so you always know exactly where things stand.',
  },
  {
    title: 'Deep local expertise',
    desc: 'We navigate the agencies, regulations, and jurisdictions of Indonesia so the complexity never lands on you.',
  },
  {
    title: 'One-touch efficiency',
    desc: 'A single secure point of contact carries your request from first message to final document.',
  },
  {
    title: 'Client-first, always',
    desc: 'We treat your goals, and your peace of mind, as the measure of our own success.',
  },
]

// PLACEHOLDER — who the client serves; adjust the audiences and copy as needed.
const AUDIENCES = [
  {
    tag: 'Invest',
    title: 'Global investors',
    desc: 'Structuring, protecting, and growing capital across Indonesia with full legal cover.',
  },
  {
    tag: 'Build',
    title: 'Entrepreneurs & founders',
    desc: 'Standing up PT and PMA companies and staying compliant from day one.',
  },
  {
    tag: 'Settle',
    title: 'Expatriates & families',
    desc: 'Visas, residency, and the paperwork of a new life, all handled so you can settle in.',
  },
  {
    tag: 'Work',
    title: 'Remote workers & nomads',
    desc: 'The right permits to live and work legally, without the bureaucratic guesswork.',
  },
]

export default function AboutPage() {
  return (
    <>
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="bg-surface">
        <RevealGroup className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-32">
          <RevealItem>
            <nav className="text-sm mb-8 flex items-center gap-2 text-muted">
              <Link href="/" className="hover:text-foreground transition-colors">Home</Link>
              <span className="text-muted/40">›</span>
              <span className="text-foreground font-medium">About</span>
            </nav>
          </RevealItem>
          <RevealItem>
            <p className="text-accent font-bold text-sm md:text-base mb-5">
              International Living · One Touch
            </p>
          </RevealItem>
          <RevealItem>
            {/* PLACEHOLDER headline */}
            <h1
              className="font-bold text-foreground tracking-tight leading-[1.1] max-w-5xl"
              style={{ fontSize: 'clamp(2.75rem, 4.5vw, 5.5rem)' }}
            >
              We make Indonesia feel like home,{' '}
              <span className="text-muted">legally, financially, and professionally.</span>
            </h1>
          </RevealItem>
          <RevealItem>
            <p className="text-muted text-base md:text-xl leading-relaxed max-w-2xl mt-8 mb-10">
              {/* PLACEHOLDER intro */}
              Ilot helps global investors, founders, and expatriates establish and protect
              what matters most across Indonesia, replacing fragmented agencies and opaque
              processes with a single, managed, elite experience.
            </p>
          </RevealItem>
          <RevealItem>
            <WhatsAppCTA size="lg" label="Talk to our team" />
          </RevealItem>
        </RevealGroup>
      </section>

      {/* ── Story (image / text split) ──────────────────────────────────── */}
      <section className="py-20 md:py-32 bg-white">
        <RevealGroup className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-20 items-center">
          <RevealItem className="order-2 md:order-1">
            <h2 className="text-3xl md:text-5xl font-bold text-foreground tracking-tight mb-6">
              Why we exist
            </h2>
            {/* PLACEHOLDER — replace with the client's real story and history. */}
            <div className="space-y-5 text-muted text-base md:text-lg leading-relaxed">
              <p>
                Setting up a business, securing residency, or protecting an investment in a
                new country should never mean fighting bureaucracy alone. We built Ilot to
                remove that friction entirely.
              </p>
              <p>
                Our team brings together legal practitioners, immigration specialists, and
                corporate consultants who understand both the letter of Indonesian regulation
                and the reality of doing business here, and translate it into clear,
                confident steps.
              </p>
              <p className="text-foreground font-medium">
                One partner. One conversation. Every detail handled.
              </p>
            </div>
          </RevealItem>
          <RevealItem className="order-1 md:order-2 w-full aspect-[4/3] rounded-3xl overflow-hidden relative bg-surface">
            <Image
              src="/About_Ilot.webp"
              alt="About Ilot"
              fill
              className="object-contain p-10"
              sizes="(max-width: 768px) 100vw, 50vw"
            />
          </RevealItem>
        </RevealGroup>
      </section>

      {/* ── Stats band (inline, divided — not boxed) ────────────────────── */}
      <section className="bg-dark text-white">
        <RevealGroup className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-14 md:py-20 grid grid-cols-2 md:grid-cols-4 gap-y-10 md:divide-x divide-white/10">
          {STATS.map(({ value, label }) => (
            <RevealItem key={label} className="md:px-8 first:md:pl-0">
              <p className="text-4xl md:text-6xl font-bold tracking-tight mb-2">{value}</p>
              <p className="text-sm md:text-base text-gray-400">{label}</p>
            </RevealItem>
          ))}
        </RevealGroup>
      </section>

      {/* ── Principles (numbered editorial list) ────────────────────────── */}
      <section className="py-20 md:py-32 bg-white">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
          <RevealGroup className="mb-12 md:mb-20 max-w-3xl">
            <RevealItem>
              <h2 className="text-3xl md:text-6xl font-bold text-foreground tracking-tight mb-5">
                What we stand for
              </h2>
            </RevealItem>
            <RevealItem>
              <p className="text-muted text-base md:text-xl leading-relaxed">
                The principles behind every engagement, and the reason clients trust us with
                what matters most.
              </p>
            </RevealItem>
          </RevealGroup>

          <RevealGroup className="border-t border-gray-200">
            {PRINCIPLES.map((p, i) => (
              <RevealItem
                key={p.title}
                className="grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-8 py-7 md:py-10 border-b border-gray-200 items-baseline"
              >
                <span className="md:col-span-2 text-3xl md:text-5xl font-bold text-gray-200 leading-none">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <h3 className="md:col-span-4 text-xl md:text-2xl font-bold text-foreground">
                  {p.title}
                </h3>
                <p className="md:col-span-6 text-muted text-base md:text-lg leading-relaxed">
                  {p.desc}
                </p>
              </RevealItem>
            ))}
          </RevealGroup>
        </div>
      </section>

      {/* ── Who we help (gridline matrix — no card boxes) ───────────────── */}
      <section className="py-20 md:py-32 bg-surface">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
          <RevealGroup className="mb-12 md:mb-16 max-w-3xl">
            <RevealItem>
              <h2 className="text-3xl md:text-6xl font-bold text-foreground tracking-tight mb-5">
                Who we help
              </h2>
            </RevealItem>
            <RevealItem>
              <p className="text-muted text-base md:text-xl leading-relaxed">
                Whatever brought you to Indonesia, our job is to make staying and
                succeeding effortless.
              </p>
            </RevealItem>
          </RevealGroup>

          <RevealGroup className="grid grid-cols-1 sm:grid-cols-2 rounded-3xl overflow-hidden border border-gray-200 bg-white">
            {AUDIENCES.map(({ tag, title, desc }) => (
              <RevealItem
                key={title}
                className="border-b border-r border-gray-200 p-8 md:p-12"
              >
                <span className="text-xs font-bold uppercase tracking-[0.2em] text-accent">
                  {tag}
                </span>
                <h3 className="text-2xl md:text-3xl font-bold text-foreground mt-4 mb-3">
                  {title}
                </h3>
                <p className="text-muted text-base md:text-lg leading-relaxed">{desc}</p>
              </RevealItem>
            ))}
          </RevealGroup>
        </div>
      </section>

      {/* ── Founder pull-quote ──────────────────────────────────────────── */}
      <section className="py-20 md:py-32 bg-white">
        <RevealGroup className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <RevealItem>
            {/* PLACEHOLDER quote */}
            <blockquote
              className="font-medium text-foreground leading-[1.2] tracking-tight"
              style={{ fontSize: 'clamp(1.75rem, 3.5vw, 3.25rem)' }}
            >
              “We started Ilot because moving your life or business to a new country
              shouldn't feel like a fight. Our job is to make the complex feel effortless.”
            </blockquote>
          </RevealItem>
          <RevealItem>
            {/* PLACEHOLDER attribution */}
            <p className="mt-8 text-muted">
              <span className="font-bold text-foreground">Faizah Khoiroh Hazmi</span> · Managing Director
            </p>
          </RevealItem>
        </RevealGroup>
      </section>

      {/* ── CTA ─────────────────────────────────────────────────────────── */}
      <section className="pb-20 md:pb-32 bg-white">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
          <RevealGroup className="bg-dark rounded-3xl md:rounded-[2.5rem] p-10 md:p-20 text-center flex flex-col items-center">
            <RevealItem>
              <h2 className="text-2xl md:text-5xl font-bold text-white mb-4 md:mb-6 tracking-tight max-w-3xl">
                Let’s build your future in Indonesia
              </h2>
            </RevealItem>
            <RevealItem>
              <p className="text-gray-300 text-sm md:text-lg max-w-2xl mx-auto mb-8 md:mb-10 leading-relaxed">
                Tell us what you need. We’ll respond within one business day and guide you
                from the very first step.
              </p>
            </RevealItem>
            <RevealItem className="flex justify-center">
              <WhatsAppCTA size="lg" label="Get in touch" />
            </RevealItem>
          </RevealGroup>
        </div>
      </section>
    </>
  )
}
