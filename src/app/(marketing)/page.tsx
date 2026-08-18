import { getCategories } from '@/lib/db/categories'
import { getFeaturedServices } from '@/lib/db/services'
import { getPosts } from '@/lib/db/posts'
import { HeroCircle } from '@/components/home/HeroCircle'
import { PartnerBar } from '@/components/home/PartnerBar'
import { AboutSection } from '@/components/home/AboutSection'
import { FeaturedServices } from '@/components/home/FeaturedServices'
import { WhyUsBento } from '@/components/home/WhyUsBento'
import { ProcessSteps } from '@/components/home/ProcessSteps'
import { TestimonialsSection } from '@/components/home/TestimonialsSection'
import { LatestInsights } from '@/components/home/LatestInsights'
import { MeetingsEmbed } from '@/components/home/MeetingsEmbed'
import { CTABanner } from '@/components/home/CTABanner'
import SurveyIntakeGate from '@/components/home/SurveyIntakeGate'

// ISR: revalidate hourly so newly published posts surface on the home page.
export const revalidate = 3600

// Featured services config: groups → slugs from the database
const FEATURED_GROUPS = [
  {
    id: 'visa',
    title: 'Visa & Stay Permit Services',
    tabLabel: 'Visa & Stay Permits',
    description:
      'We help foreigners obtain and maintain legal stay permits in Indonesia, including applications, extensions, and supporting documents.',
    categorySlug: 'visa',
    slugs: [
      'investor-kitas-2-years',
      'visa-on-arrival-e-voa-extension',
      'entertainment-kitas',
    ],
  },
  {
    id: 'hr',
    title: 'Human Resource Services',
    tabLabel: 'Human Resources',
    description:
      'We support businesses with recruitment and day-to-day HR operations, from sourcing staff to fully managed HR administration.',
    categorySlug: 'hr-payroll',
    slugs: [
      'staff-recruitment-umk-salary',
      'professional-recruitment-gaji-rp-5jt',
      'hr-admin-managed-services',
    ],
  },
  {
    id: 'accounting-tax',
    title: 'Accounting & Tax Services',
    tabLabel: 'Accounting & Tax',
    description:
      'We keep individuals and companies tax-compliant in Indonesia, from periodic and annual returns to ongoing tax consultancy.',
    categorySlug: 'accounting-tax',
    slugs: [
      'period-tax-returns',
      'annual-tax-return',
      'tax-consultancy-service',
    ],
  },
]

export default async function HomePage() {
  const [categories, featuredRaw, allPosts] = await Promise.all([
    getCategories(),
    getFeaturedServices(FEATURED_GROUPS.flatMap((g) => g.slugs)),
    getPosts(),
  ])

  const latestPosts = allPosts.slice(0, 3)

  const cards = categories.map((cat) => ({
    slug: cat.slug,
    name: cat.name,
    icon: cat.icon_name ?? 'Star',
    imageUrl: cat.image_url ?? undefined,
    colorAccent: cat.color_accent ?? undefined,
  }))

  // Build a slug→service map for fast lookup
  const serviceMap = new Map(featuredRaw.map((s) => [s.slug, s]))

  // Assemble groups preserving the defined order
  const groups = FEATURED_GROUPS.map((g) => ({
    id: g.id,
    title: g.title,
    tabLabel: g.tabLabel,
    description: g.description,
    categorySlug: g.categorySlug,
    services: g.slugs
      .map((slug) => {
        const s = serviceMap.get(slug)
        if (!s) return null
        return {
          slug: s.slug,
          name: s.name,
          description: s.description,
          target_client: s.target_client,
          estimated_timeline: s.estimated_timeline,
          whatsapp_message: s.whatsapp_message,
          categorySlug: s.category.slug,
          categoryName: s.category.name,
        }
      })
      .filter(Boolean) as any[],
  })).filter((g) => g.services.length > 0)

  return (
    <>
      <HeroCircle cards={cards} />
      <PartnerBar />
      <AboutSection />
      <FeaturedServices groups={groups} />
      <WhyUsBento />
      <ProcessSteps />
      <TestimonialsSection />
      <LatestInsights posts={latestPosts} />
      <MeetingsEmbed />
      <CTABanner />
      {/*
        Renders nothing unless the visitor arrived on
        `/?survey_intake_form=true`, and only then does it fetch the modal's
        chunk. Import it statically — the dynamic() call lives inside the gate
        (a Client Component), because dynamic(..., { ssr: false }) placed
        directly in a Server Component never mounts at all.

        Removing this line is what makes the survey silently stop appearing:
        there is no error, the param is simply never read.
      */}
      <SurveyIntakeGate />
    </>
  )
}
