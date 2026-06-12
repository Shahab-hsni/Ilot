import { RevealGroup, RevealItem } from '@/components/ui/Reveal'
import { StepIcon, StepConnector, type StepVariant } from '@/components/home/StepIcon'

const STEPS: Array<{
  variant: StepVariant
  bg: string
  n: number
  title: string
  desc: string
}> = [
  {
    variant: 'selection',
    bg: 'bg-blue-50',
    n: 1,
    title: 'Selection',
    desc: 'Identify your specific corporate or legal need within the ILOT Digital Headquarters.',
  },
  {
    variant: 'initiation',
    bg: 'bg-fuchsia-50',
    n: 2,
    title: 'One-Touch Initiation',
    desc: 'Trigger a secure WhatsApp connection with a pre-filled service reference. No forms required.',
  },
  {
    variant: 'expert',
    bg: 'bg-orange-50',
    n: 3,
    title: 'Expert Handling',
    desc: 'Professional consultants and legal experts take over, gathering data and filing documents on your behalf.',
  },
  {
    variant: 'fulfillment',
    bg: 'bg-emerald-50',
    n: 4,
    title: 'Fulfillment',
    desc: 'Receive your official permits, finalized contracts, or comprehensive reports directly in the secure chat.',
  },
]

export function ProcessSteps() {
  return (
    <section className="py-12 md:py-32 bg-white">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
        <RevealGroup className="text-center mb-10 md:mb-24 flex flex-col items-center">
          <RevealItem>
            <h2 className="text-2xl md:text-6xl font-bold text-[#0B0B1A] mb-3 md:mb-6 tracking-tight">
              A clean path in <span className="italic">four steps.</span>
            </h2>
          </RevealItem>
          <RevealItem>
            <p className="text-gray-500 text-sm md:text-lg max-w-2xl mx-auto italic">
              A clean, professional path from inquiry to result. We demystify the process so you can focus on your business.
            </p>
          </RevealItem>
        </RevealGroup>

        <div className="relative">
          {/* Continuous horizontal line, drawn in as the section scrolls into view */}
          <StepConnector className="absolute top-[104px] left-0 right-0 h-[1px] hidden md:block" />

          <RevealGroup className="grid grid-cols-2 md:grid-cols-4 gap-x-4 md:gap-x-8 gap-y-6 md:gap-y-16">
            {STEPS.map(({ variant, bg, n, title, desc }) => (
              <RevealItem key={n} className="relative flex flex-col text-left">
                <div className="mb-4 md:mb-12 inline-flex self-start">
                  <StepIcon variant={variant} bg={bg} n={n} />
                </div>
                <h3 className="text-sm md:text-xl font-bold text-[#0B0B1A] mb-1.5 md:mb-3">{title}</h3>
                <p className="text-gray-500 text-xs md:text-sm leading-relaxed pr-0 md:pr-4">{desc}</p>
              </RevealItem>
            ))}
          </RevealGroup>
        </div>
      </div>
    </section>
  )
}
