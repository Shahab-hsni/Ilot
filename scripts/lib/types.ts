export interface ParsedService {
  slug: string
  name: { en: string }
  description: { en: string } | null
  targetClient: { en: string } | null
  keyDeliverables: { en: string } | null
  estimatedTimeline: { en: string } | null
  realTimeWork: { en: string } | null
  note: { en: string } | null
  whatsappMessage: { en: string }   // always present — generated if not manually set
  price: string | null               // free-text — empty means "Contact us for pricing"
  requiredDocsUrl: string | null     // Google Docs URL; site converts to ?export=pdf
  sortOrder: number
}

export interface ParsedSubCategory {
  slug: string
  name: { en: string }
  sortOrder: number
  services: ParsedService[]
}

export interface ParsedCategory {
  slug: string
  name: { en: string }
  tagline: { en: string } | null
  iconName: string | null
  accentColor: string | null
  sortOrder: number
  comingSoon: boolean
  subCategories: ParsedSubCategory[]
}

/** Shape of each row in docs/seed-data/raw.json (new unified snake_case format) */
export interface ClientDataRow {
  category_name: string
  category_slug: string
  category_tagline: string
  category_sort_order: number | string
  /** When true, this row is a category-only placeholder. sub_category and
   *  service fields will be empty and should not produce sub-cat/service docs. */
  category_coming_soon?: boolean
  sub_category_name: string
  sub_category_slug: string
  sub_category_sort_order: number | string
  service_name: string
  service_slug: string
  service_sort_order: number | string
  description: string
  target_client: string
  key_deliverables: string
  estimated_timeline: string
  real_time_work: string
  note: string
  whatsapp_message?: string   // optional — auto-generated from service name if blank
  price?: string              // optional — free-text
  required_docs_url?: string  // optional — Google Docs URL
}

export interface SeedSqlSubCategory {
  slug: string
  name: string
  sortOrder: number
}

export interface SeedSqlCategory {
  slug: string
  name: string
  tagline: string | null
  iconName: string | null
  sortOrder: number
  subCategorySlugs: SeedSqlSubCategory[]
}
