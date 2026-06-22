import Link from 'next/link'
import { Clock } from 'lucide-react'
import { WhatsAppCTA } from '@/components/ui/WhatsAppCTA'
import type { Service } from '@/lib/db/types'

interface ServiceRowProps {
  service: Service
  categorySlug: string
}

/**
 * One row in the list ("table") view.
 *
 * Responsive strategy:
 * - mobile: name + description, with who-it's-for / timeline shown inline below
 * - tablet (md): adds a Timeline column on the right
 * - desktop (lg): adds a Who-it's-for column — full table, aligned to
 *   {@link ServiceListHeader}
 */
export function ServiceRow({ service, categorySlug }: ServiceRowProps) {
  return (
    <div className="group flex items-center gap-4 px-4 py-4 transition-colors hover:bg-[#F8F9FA] md:gap-5 md:px-5">
      {/* Service name + description (+ inline meta on small screens) */}
      <div className="min-w-0 flex-1">
        <Link
          href={`/${categorySlug}/${service.slug}`}
          className="font-semibold leading-snug text-foreground transition-colors line-clamp-1 group-hover:text-accent"
        >
          {service.name}
        </Link>
        {service.description && (
          <p className="mt-0.5 line-clamp-1 text-xs text-muted">{service.description}</p>
        )}

        {/* Inline meta — only where the dedicated columns are hidden */}
        {(service.target_client || service.estimated_timeline) && (
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted lg:hidden">
            {service.target_client && <span>{service.target_client}</span>}
            {service.estimated_timeline && (
              <span className="flex items-center gap-1 md:hidden">
                <Clock className="h-3 w-3 shrink-0" strokeWidth={1.75} aria-hidden="true" />
                {service.estimated_timeline}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Who it's for — desktop only */}
      <div
        className="hidden w-44 shrink-0 truncate text-sm text-muted lg:block"
        title={service.target_client ?? undefined}
      >
        {service.target_client ?? '—'}
      </div>

      {/* Timeline — tablet and up */}
      <div className="hidden w-32 shrink-0 items-center gap-1.5 text-xs text-muted md:flex">
        {service.estimated_timeline ? (
          <>
            <Clock className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} aria-hidden="true" />
            <span className="truncate">{service.estimated_timeline}</span>
          </>
        ) : (
          <span>—</span>
        )}
      </div>

      {/* Enquire */}
      <div className="flex shrink-0 justify-end md:w-28">
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

/** Column header row for the list view; widths mirror {@link ServiceRow}. Desktop only. */
export function ServiceListHeader() {
  return (
    <div className="hidden items-center gap-5 border-b border-gray-100 bg-[#F8F9FA] px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400 lg:flex">
      <span className="min-w-0 flex-1">Service</span>
      <span className="w-44 shrink-0">Who it&apos;s for</span>
      <span className="w-32 shrink-0">Timeline</span>
      <span className="w-28 shrink-0" />
    </div>
  )
}
