'use client'

import { useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { ArrowRight, ChevronDown, ChevronUp } from 'lucide-react'
import { WhatsAppCTA } from '@/components/ui/WhatsAppCTA'
import { getCategoryColor } from '@/lib/category-colors'
import { firstWords } from '@/lib/text'
import { RevealGroup, RevealItem } from '@/components/ui/Reveal'

interface FeaturedService {
  slug: string
  name: string
  description: string | null
  target_client: string | null
  estimated_timeline: string | null
  whatsapp_message: string | null
  categorySlug: string
  categoryName: string
}

interface ServiceGroup {
  id: string
  title: string
  /** Short label for the tab pill; falls back to title. */
  tabLabel?: string
  description: string
  categorySlug: string
  services: FeaturedService[]
}

interface FeaturedServicesProps {
  groups: ServiceGroup[]
}

const INITIAL_VISIBLE = 4

/* ─── Compact swipeable card for mobile ─── */
function MobileServiceCard({ service, colors }: { service: FeaturedService; colors: { mid: string } }) {
  return (
    <Link
      href={`/${service.categorySlug}/${service.slug}`}
      className="bg-white border border-gray-100 rounded-2xl p-4 flex flex-col h-full"
    >
      {service.target_client && (
        <span
          title={service.target_client}
          className="block bg-white border border-gray-200 px-2 py-0.5 rounded-full text-[10px] font-medium text-gray-500 self-start mb-2 truncate max-w-full"
        >
          {firstWords(service.target_client)}
        </span>
      )}
      <h4 className="text-[14px] font-semibold text-foreground leading-snug mb-1.5 line-clamp-2">
        {service.name}
      </h4>
      {service.estimated_timeline && (
        <div className="text-[11px] mt-auto pt-2">
          <p className="font-semibold text-foreground">Timeline</p>
          <p className="text-muted truncate">{service.estimated_timeline}</p>
        </div>
      )}
      <span className="text-[11px] font-medium mt-2" style={{ color: colors.mid }}>
        Learn more →
      </span>
    </Link>
  )
}

/* ─── Desktop card (same as ServiceCard) ─── */
function DesktopServiceCard({ service }: { service: FeaturedService }) {
  return (
    <div className="bg-background border border-surface rounded-card p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col h-full">
      {service.target_client && (
        <span
          title={service.target_client}
          className="inline-block max-w-full truncate bg-white border border-gray-200 px-3 py-1 rounded-full text-xs font-medium text-gray-600 shadow-sm self-start mb-4"
        >
          {firstWords(service.target_client)}
        </span>
      )}
      <Link
        href={`/${service.categorySlug}/${service.slug}`}
        className="text-lg font-bold text-foreground hover:text-accent transition-colors leading-snug mb-3"
      >
        {service.name}
      </Link>
      {service.description && (
        <p className="text-sm text-muted leading-relaxed mb-4 line-clamp-3">
          {service.description}
        </p>
      )}
      <div className="mt-auto pt-4 border-t border-surface flex items-center justify-between">
        {service.estimated_timeline && (
          <p className="text-xs text-muted">
            <span className="font-semibold text-foreground">Timeline:</span>{' '}
            {service.estimated_timeline}
          </p>
        )}
        <WhatsAppCTA
          serviceName={service.name}
          customMessage={service.whatsapp_message ?? undefined}
          variant="ghost"
          size="sm"
          label="Enquire"
        />
      </div>
    </div>
  )
}

/* ─── Active tab's panel: intro row + card grids + show more ─── */
function GroupPanel({ group }: { group: ServiceGroup }) {
  const [expanded, setExpanded] = useState(false)
  const colors = getCategoryColor(group.categorySlug)
  const hasMore = group.services.length > INITIAL_VISIBLE
  const visible = expanded ? group.services : group.services.slice(0, INITIAL_VISIBLE)

  return (
    <div>
      {/* Intro row */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-5 md:mb-8">
        <p className="text-sm md:text-base text-muted leading-relaxed max-w-2xl">
          {group.description}
        </p>
        <Link
          href={`/${group.categorySlug}`}
          className="text-xs md:text-sm font-semibold flex items-center gap-1 shrink-0 transition-colors hover:opacity-80"
          style={{ color: colors.mid }}
        >
          View all <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Mobile: 2-column grid */}
      <RevealGroup className="grid grid-cols-2 gap-3 pb-4 md:hidden" stagger={0.07}>
        {group.services.map((service) => (
          <RevealItem key={service.slug} className="h-full">
            <MobileServiceCard service={service} colors={colors} />
          </RevealItem>
        ))}
      </RevealGroup>

      {/* Desktop: grid with show more */}
      <RevealGroup className="hidden md:grid grid-cols-2 lg:grid-cols-3 gap-4" stagger={0.08}>
        {visible.map((service) => (
          <RevealItem key={service.slug} className="h-full">
            <DesktopServiceCard service={service} />
          </RevealItem>
        ))}
      </RevealGroup>

      {/* Show more / less — desktop only */}
      {hasMore && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-6 mx-auto hidden md:flex cursor-pointer items-center gap-1.5 text-sm font-medium text-muted hover:text-foreground transition-colors"
        >
          {expanded ? (
            <>Show less <ChevronUp className="w-4 h-4" /></>
          ) : (
            <>Show {group.services.length - INITIAL_VISIBLE} more services <ChevronDown className="w-4 h-4" /></>
          )}
        </button>
      )}
    </div>
  )
}

export function FeaturedServices({ groups }: FeaturedServicesProps) {
  const [activeId, setActiveId] = useState(groups[0]?.id)
  const reduce = useReducedMotion()

  const active = groups.find((g) => g.id === activeId) ?? groups[0]
  if (!active) return null

  return (
    <section className="py-12 md:py-20 bg-[#F8F9FA] overflow-hidden">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <RevealGroup className="text-center mb-7 md:mb-10">
          <RevealItem>
            <h2 className="text-2xl md:text-5xl font-bold text-foreground tracking-tight">
              Popular <span className="italic">services.</span>
            </h2>
          </RevealItem>
          <RevealItem>
            <p className="text-gray-500 text-sm md:text-lg mt-3 max-w-xl mx-auto italic hidden md:block">
              Explore the services our clients request most, from visa applications to company setup and compliance.
            </p>
          </RevealItem>
        </RevealGroup>

        {/* Category tabs */}
        <RevealGroup className="mb-7 md:mb-10">
          <RevealItem>
            <div
              role="tablist"
              aria-label="Service categories"
              className="flex gap-2 md:gap-3 overflow-x-auto scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0 md:justify-center"
            >
              {groups.map((group) => {
                const isActive = group.id === activeId
                return (
                  <button
                    key={group.id}
                    role="tab"
                    aria-selected={isActive}
                    aria-controls={`panel-${group.id}`}
                    onClick={() => setActiveId(group.id)}
                    className={`cursor-pointer shrink-0 inline-flex items-center gap-2 rounded-full px-4 py-2.5 md:px-6 md:py-3 text-xs md:text-sm font-semibold whitespace-nowrap transition-colors duration-200 ${
                      isActive
                        ? 'bg-foreground text-white shadow-md'
                        : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-300 hover:text-foreground'
                    }`}
                  >
                    {group.tabLabel ?? group.title}
                    <span
                      className={`rounded-full px-1.5 py-0.5 text-[10px] md:text-xs tabular-nums ${
                        isActive ? 'bg-white/15 text-white' : 'bg-[#F4F4F0] text-gray-500'
                      }`}
                    >
                      {group.services.length}
                    </span>
                  </button>
                )
              })}
            </div>
          </RevealItem>
        </RevealGroup>

        {/* Active panel — remounts per tab so reveal + show-more state reset */}
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={active.id}
            id={`panel-${active.id}`}
            role="tabpanel"
            initial={reduce ? false : { opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? undefined : { opacity: 0, y: -10 }}
            transition={{ duration: 0.3, ease: [0.22, 0.61, 0.36, 1] }}
          >
            <GroupPanel group={active} />
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  )
}
