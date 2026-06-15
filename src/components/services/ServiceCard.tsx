import Link from 'next/link'
import { WhatsAppCTA } from '@/components/ui/WhatsAppCTA'
import { firstWords } from '@/lib/text'
import type { Service } from '@/lib/db/types'

interface ServiceCardProps {
  service: Service
  categorySlug: string
}

export function ServiceCard({ service, categorySlug }: ServiceCardProps) {
  return (
    <div className="bg-background border border-surface rounded-card p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col h-full">
      {/* Badge — truncated to one line; full text on hover via title */}
      {service.target_client && (
        <span
          title={service.target_client}
          className="inline-block max-w-full truncate bg-white border border-gray-200 px-3 py-1 rounded-full text-xs font-medium text-gray-600 shadow-sm self-start mb-4"
        >
          {firstWords(service.target_client)}
        </span>
      )}

      {/* Title */}
      <Link
        href={`/${categorySlug}/${service.slug}`}
        className="text-lg font-bold text-foreground hover:text-accent transition-colors leading-snug mb-3"
      >
        {service.name}
      </Link>

      {/* Description */}
      {service.description && (
        <p className="text-sm text-muted leading-relaxed mb-4 line-clamp-3">
          {service.description}
        </p>
      )}

      {/* Spacer to push footer down */}
      <div className="mt-auto pt-4 border-t border-surface flex items-center justify-between">
        {/* Timeline */}
        {service.estimated_timeline && (
          <p className="text-xs text-muted">
            <span className="font-semibold text-foreground">Timeline:</span>{' '}
            {service.estimated_timeline}
          </p>
        )}

        {/* CTA */}
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
