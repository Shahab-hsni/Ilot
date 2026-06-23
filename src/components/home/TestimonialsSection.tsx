const TESTIMONIALS = [
  {
    quote:
      'I had an excellent experience with the team for my Bali working visa. They were professional, knowledgeable, and incredibly responsive, guiding me through every step and explaining each requirement clearly. What could have been stressful was made simple, and my approval came through smoothly. Highly recommended.',
    name: 'Nathan Measuria',
    role: 'Verified Client',
  },
  {
    quote:
      'I was looking for a serious, reliable company to handle my working visa, and I was lucky to find this team. They supported me through every stage and turned what I expected to be complicated into a genuinely easy, straightforward process. I could not recommend their services more highly.',
    name: 'Mathieu Diefenbach',
    role: 'Verified Client',
  },
  {
    quote:
      'From start to finish, the team made the whole process effortless. They were responsive, transparent, and clearly knew exactly what they were doing. Every question I had was answered quickly, and every detail handled with care. I always felt in good hands, and I would recommend them without hesitation.',
    name: 'Shahab Hosseini',
    role: 'Verified Client',
  },
]

import { RevealGroup, RevealItem } from '@/components/ui/Reveal'

// Initials from a display name, e.g. "Sarah Jenkins" → "SJ", "Marcus V." → "MV"
function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('')
}

export function TestimonialsSection() {
  return (
    <section className="py-12 md:py-32 bg-[#F8F9FA]">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
        <RevealGroup className="mb-8 md:mb-16 text-left">
          <RevealItem>
            <h2 className="text-2xl md:text-6xl font-medium text-[#0B0B1A] tracking-tight leading-[1.1]">
              Don&apos;t take our word for it!<br />
              Hear it from our partners.
            </h2>
          </RevealItem>
        </RevealGroup>

        <RevealGroup className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
          {TESTIMONIALS.map(({ quote, name, role }) => (
            <RevealItem key={name} className="bg-white p-5 md:p-10 rounded-2xl md:rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col h-full">
              <div
                className="flex items-center justify-center w-10 h-10 md:w-12 md:h-12 rounded-full mb-4 md:mb-8 text-white font-bold text-sm md:text-base"
                style={{ backgroundImage: 'linear-gradient(135deg, #09314e, #e6b630)' }}
                aria-hidden
              >
                {initials(name)}
              </div>
              <p className="text-[#0B0B1A] text-xs md:text-[15px] leading-relaxed mb-6 md:mb-12 flex-grow">
                &ldquo;{quote}&rdquo;
              </p>
              <div className="mt-auto">
                <h4 className="font-[Caveat] text-2xl md:text-3xl text-[#0B0B1A] mb-1">{name}</h4>
                <p className="text-[10px] md:text-xs text-gray-500">{role}</p>
              </div>
            </RevealItem>
          ))}
        </RevealGroup>
      </div>
    </section>
  )
}
