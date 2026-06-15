import Link from 'next/link'
import Image from 'next/image'
import { WhatsAppCTA } from '@/components/ui/WhatsAppCTA'
import { Clock, Timer, Users, Package, Info, Wallet, FileDown } from 'lucide-react'
import { getCategoryColor } from '@/lib/category-colors'
import { firstWords } from '@/lib/text'
import { toGoogleDocsPdfUrl } from '@/lib/google-docs'
import type { ServiceWithCategory } from '@/lib/db/types'

interface ServiceDetailProps {
  service: ServiceWithCategory
}

export function ServiceDetail({ service }: ServiceDetailProps) {
  const deliverables = service.key_deliverables
    ?.split(',')
    .map((d) => d.trim())
    .filter(Boolean)

  const colors = getCategoryColor(service.category.slug)

  // Google Docs URL → direct PDF export URL. null when no docs URL or input
  // isn't a Google Docs link; in that case we hide the download button.
  const pdfUrl = toGoogleDocsPdfUrl(service.required_docs_url)

  return (
    <article>
      {/* Hero banner — category coverImage when uploaded, else brand gradient */}
      <section className="relative overflow-hidden">
        {service.category.image_url ? (
          <>
            <Image src={service.category.image_url} alt={service.category.name} fill className="object-cover" sizes="100vw" priority />
            <div className="absolute inset-0" style={{ backgroundColor: colors.accent, opacity: 0.8 }} />
          </>
        ) : (
          <div className="absolute inset-0" style={{ backgroundImage: `linear-gradient(135deg, ${colors.accent}, ${colors.mid})` }} />
        )}

        <div className="relative z-10 pt-14 pb-10 max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="text-sm mb-8 flex items-center gap-2 flex-wrap">
            <Link href="/" className="text-white/60 hover:text-white transition-colors">Home</Link>
            <span className="text-white/30">›</span>
            <Link
              href={`/${service.category.slug}`}
              className="text-white/60 hover:text-white transition-colors"
            >
              {service.category.name}
            </Link>
            {service.sub_category && (
              <>
                <span className="text-white/30">›</span>
                <Link
                  href={`/${service.category.slug}#${service.sub_category.slug}`}
                  className="text-white/60 hover:text-white transition-colors"
                >
                  {service.sub_category.name}
                </Link>
              </>
            )}
            <span className="text-white/30">›</span>
            <span className="text-white font-medium">{service.name}</span>
          </nav>

          {service.target_client && (
            <span
              title={service.target_client}
              className="inline-block max-w-full truncate px-4 py-1.5 rounded-full text-xs font-medium bg-white/15 text-white backdrop-blur-sm mb-5"
            >
              {firstWords(service.target_client)}
            </span>
          )}
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white tracking-tight leading-[1.1]">
            {service.name}
          </h1>
        </div>
      </section>

      {/* Content section */}
      <section className="pt-12 pb-20 bg-white">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-8 mb-8">
            <div className="max-w-2xl">
              {service.description && (
                <p className="text-lg text-gray-500 leading-relaxed max-w-xl">
                  {service.description}
                </p>
              )}
            </div>

            {/* CTA card */}
            <div
              className="rounded-3xl p-8 lg:min-w-[320px] flex flex-col gap-6 shrink-0 border"
              style={{
                backgroundColor: colors.tint,
                borderColor: `${colors.mid}20`,
              }}
            >
              <div className="flex items-start gap-3">
                <Wallet className="w-5 h-5 mt-1 shrink-0" style={{ color: colors.mid }} strokeWidth={1.5} />
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted mb-1">Price</p>
                  {service.price ? (
                    <p className="text-[15px] text-[#0B0B1A] font-semibold leading-snug">{service.price}</p>
                  ) : (
                    <p className="text-[15px] text-[#0B0B1A] font-medium italic leading-snug">
                      Contact us for pricing
                    </p>
                  )}
                </div>
              </div>
              {service.estimated_timeline && (
                <div className="flex items-start gap-3">
                  <Clock className="w-5 h-5 mt-1 shrink-0" style={{ color: colors.mid }} strokeWidth={1.5} />
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted mb-1">Timeline</p>
                    <p className="text-[15px] text-[#0B0B1A] font-semibold leading-snug">{service.estimated_timeline}</p>
                  </div>
                </div>
              )}
              {service.real_time_work && (
                <div className="flex items-start gap-3">
                  <Timer className="w-5 h-5 mt-1 shrink-0" style={{ color: colors.mid }} strokeWidth={1.5} />
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted mb-1">Real-Time Work</p>
                    <p className="text-[15px] text-[#0B0B1A] font-semibold leading-snug">{service.real_time_work}</p>
                  </div>
                </div>
              )}
              {service.target_client && (
                <div className="flex items-start gap-3">
                  <Users className="w-5 h-5 mt-1 shrink-0" style={{ color: colors.mid }} strokeWidth={1.5} />
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted mb-1">Who it&apos;s for</p>
                    <p className="text-[15px] text-[#0B0B1A] font-semibold leading-snug">{service.target_client}</p>
                  </div>
                </div>
              )}
              {deliverables && deliverables.length > 0 && (
                <div className="flex items-start gap-3">
                  <Package className="w-5 h-5 mt-1 shrink-0" style={{ color: colors.mid }} strokeWidth={1.5} />
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted mb-2">What you get</p>
                    <div className="flex flex-wrap gap-2">
                      {deliverables.map((item) => (
                        <span key={item} className="text-[13px] text-[#0B0B1A] font-medium bg-white px-3 py-1.5 rounded-full">
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              <div className="pt-3 border-t flex flex-col gap-3" style={{ borderColor: `${colors.mid}20` }}>
                <WhatsAppCTA
                  serviceName={service.name}
                  customMessage={service.whatsapp_message ?? undefined}
                  size="lg"
                  label="Get Started on WhatsApp"
                  className="w-full justify-center"
                />
                {pdfUrl && (
                  <a
                    href={pdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 w-full px-5 py-3 rounded-full text-[14px] font-medium bg-white text-[#0B0B1A] border hover:bg-gray-50 transition-colors"
                    style={{ borderColor: `${colors.mid}30` }}
                  >
                    <FileDown className="w-4 h-4" strokeWidth={1.75} />
                    Download Required Documents (PDF)
                  </a>
                )}
              </div>
            </div>
          </div>

          {service.note && (
            <div className="flex items-start gap-3 rounded-2xl border border-gray-200 bg-gray-50 px-5 py-4">
              <Info className="w-4 h-4 mt-0.5 shrink-0 text-gray-400" strokeWidth={1.5} />
              <p className="text-sm text-gray-500 leading-relaxed">{service.note}</p>
            </div>
          )}
        </div>
      </section>
    </article>
  )
}
