'use client'

import { useState, useMemo, useEffect, useRef, createContext, useContext } from 'react'
import { LayoutGrid, List } from 'lucide-react'
import { ServiceCard } from './ServiceCard'
import { ServiceRow, ServiceListHeader } from './ServiceRow'
import { ServiceSearch } from './ServiceSearch'
import type { SubCategoryWithServices } from '@/lib/db/types'

type ServiceView = 'cards' | 'list'
const VIEW_STORAGE_KEY = 'ilot:service-view'

// ── Shared search context ──────────────────────────────────────
interface SearchCtx {
  query: string
  setQuery: (q: string) => void
  totalResults: number
  inputRef: React.RefObject<HTMLInputElement | null>
}

const SearchContext = createContext<SearchCtx>({
  query: '',
  setQuery: () => {},
  totalResults: 0,
  inputRef: { current: null },
})

export function useServiceSearch() {
  return useContext(SearchContext)
}

// ── Provider wrapping hero + content ───────────────────────────
interface CategoryServicesProviderProps {
  subCategories: SubCategoryWithServices[]
  children: React.ReactNode
}

export function CategoryServicesProvider({ subCategories, children }: CategoryServicesProviderProps) {
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const totalResults = useMemo(() => {
    const q = query.toLowerCase().trim()
    if (!q) return subCategories.reduce((sum, sc) => sum + sc.services.length, 0)
    return subCategories.reduce((sum, sc) => {
      if (sc.name.toLowerCase().includes(q)) return sum + sc.services.length
      return sum + sc.services.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.description?.toLowerCase().includes(q) ||
          s.target_client?.toLowerCase().includes(q) ||
          s.key_deliverables?.toLowerCase().includes(q)
      ).length
    }, 0)
  }, [query, subCategories])

  return (
    <SearchContext.Provider value={{ query, setQuery, totalResults, inputRef }}>
      {children}
    </SearchContext.Provider>
  )
}

// ── Service list (consumes search context) ─────────────────────
interface CategoryServicesProps {
  subCategories: SubCategoryWithServices[]
  categorySlug: string
  accentColor?: string
  tintColor?: string
}

export function CategoryServices({ subCategories, categorySlug, accentColor, tintColor }: CategoryServicesProps) {
  const { query } = useServiceSearch()

  // View toggle — remembered across visits. Starts 'cards' to match SSR, then
  // hydrates from localStorage so there's no flash of the wrong layout mismatch.
  const [view, setView] = useState<ServiceView>('cards')
  useEffect(() => {
    const saved = localStorage.getItem(VIEW_STORAGE_KEY)
    if (saved === 'cards' || saved === 'list') setView(saved)
  }, [])
  const changeView = (next: ServiceView) => {
    setView(next)
    localStorage.setItem(VIEW_STORAGE_KEY, next)
  }

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim()
    if (!q) return subCategories

    return subCategories
      .map((sc) => {
        if (sc.name.toLowerCase().includes(q)) return sc
        const matchingServices = sc.services.filter(
          (s) =>
            s.name.toLowerCase().includes(q) ||
            s.description?.toLowerCase().includes(q) ||
            s.target_client?.toLowerCase().includes(q) ||
            s.key_deliverables?.toLowerCase().includes(q)
        )
        return { ...sc, services: matchingServices }
      })
      .filter((sc) => sc.services.length > 0)
  }, [query, subCategories])

  const sidebarItems = filtered.map((sc) => ({ id: sc.slug, name: sc.name }))

  // Intersection observer for sidebar active state
  const [activeId, setActiveId] = useState<string>(subCategories[0]?.slug ?? '')
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.find((e) => e.isIntersecting)
        if (visible) setActiveId(visible.target.id)
      },
      { rootMargin: '-20% 0px -70% 0px' }
    )
    filtered.forEach(({ slug }) => {
      const el = document.getElementById(slug)
      if (el) observer.observe(el)
    })
    return () => observer.disconnect()
  }, [filtered])

  return (
    <div>
      {/* Search + view toggle — scrolls with page */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <div className="min-w-0 flex-1 max-w-[220px]">
          <ServiceSearch />
        </div>
        <ViewToggle view={view} onChange={changeView} accentColor={accentColor} tintColor={tintColor} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-12">
        {/* Sidebar — sticky nav only */}
        <nav className="hidden md:block sticky top-24 self-start max-h-[calc(100vh-8rem)] overflow-y-auto pr-2 scrollbar-thin">
          <ul className="space-y-1">
            {sidebarItems.map(({ id, name }) => (
              <li key={id}>
                <a
                  href={`#${id}`}
                  className={`block text-sm px-3 py-2 rounded-lg transition-all ${
                    activeId === id
                      ? 'font-semibold'
                      : 'text-muted hover:text-foreground hover:bg-surface'
                  }`}
                  style={activeId === id ? {
                    backgroundColor: tintColor ?? 'rgba(245,178,26,0.1)',
                    color: accentColor ?? '#F5B21A',
                  } : undefined}
                >
                  {name}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        {/* Services grouped by sub-category */}
        <div className="space-y-16">
          {filtered.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-muted text-lg">No services match &ldquo;{query}&rdquo;</p>
            </div>
          ) : (
            filtered.map((sc, idx) => (
              <section key={sc.id} id={sc.slug}>
                {idx > 0 && (
                  <div className="mb-16 flex items-center gap-4">
                    <div className="flex-1 h-px bg-gray-200" />
                    <span className="text-xs font-medium text-gray-400 uppercase tracking-widest shrink-0">
                      {sc.name}
                    </span>
                    <div className="flex-1 h-px bg-gray-200" />
                  </div>
                )}
                <h2 className="text-2xl font-bold text-foreground mb-6">
                  {sc.name}
                </h2>
                {view === 'cards' ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {sc.services.map((service) => (
                      <ServiceCard
                        key={service.slug}
                        service={service}
                        categorySlug={categorySlug}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="max-w-6xl overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
                    <ServiceListHeader />
                    <div className="divide-y divide-gray-100">
                      {sc.services.map((service) => (
                        <ServiceRow
                          key={service.slug}
                          service={service}
                          categorySlug={categorySlug}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </section>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

// ── Cards / List view toggle ───────────────────────────────────
interface ViewToggleProps {
  view: ServiceView
  onChange: (v: ServiceView) => void
  accentColor?: string
  tintColor?: string
}

function ViewToggle({ view, onChange, accentColor, tintColor }: ViewToggleProps) {
  const options: { value: ServiceView; Icon: typeof LayoutGrid; label: string }[] = [
    { value: 'cards', Icon: LayoutGrid, label: 'Card view' },
    { value: 'list', Icon: List, label: 'List view' },
  ]

  return (
    <div className="flex items-center gap-1 rounded-full border border-gray-200 bg-white p-1 shrink-0">
      {options.map(({ value, Icon, label }) => {
        const isActive = view === value
        return (
          <button
            key={value}
            type="button"
            onClick={() => onChange(value)}
            aria-pressed={isActive}
            aria-label={label}
            title={label}
            className={`cursor-pointer flex items-center justify-center w-9 h-9 rounded-full transition-colors ${
              isActive ? 'font-semibold' : 'text-muted hover:text-foreground'
            }`}
            style={
              isActive
                ? { backgroundColor: tintColor ?? 'rgba(245,178,26,0.12)', color: accentColor ?? '#F5B21A' }
                : undefined
            }
          >
            <Icon className="w-4 h-4" strokeWidth={2} />
          </button>
        )
      })}
    </div>
  )
}
