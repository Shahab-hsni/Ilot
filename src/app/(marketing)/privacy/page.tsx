import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description:
    'How International Living One Touch (ILOT) collects, uses, transfers, and protects your personal data.',
}

type Block =
  | { type: 'p'; text: string }
  | { type: 'subheading'; text: string }
  | { type: 'ul'; items: (string | { label: string; text: string })[] }
  | { type: 'dl'; items: { term: string; text: string }[] }
  | { type: 'contact' }

interface Section {
  id: string
  n: number
  title: string
  blocks: Block[]
}

const INTRO = [
  'International Living One Touch ("us", "we", or "our") operates the website and provides immigration, business setup, and corporate administration services. This page informs you of our formal policies regarding the collection, use, and disclosure of personal data when you use our Service and the choices you have associated with that data.',
  'We use your data to provide, maintain, and improve the quality of our Service. By accessing or using the Service, you explicitly agree to the collection, transfer, processing, and use of your information in strict accordance with this Privacy Policy. Unless otherwise defined herein, all terms used in this Privacy Policy hold the same meanings as outlined in our Terms and Conditions.',
]

const SECTIONS: Section[] = [
  {
    id: 'collection',
    n: 1,
    title: 'Information Collection and Use',
    blocks: [
      {
        type: 'p',
        text: 'To provide comprehensive corporate, immigration, and business consultancy services, we collect several different types of information for various operational and legal purposes.',
      },
      { type: 'subheading', text: 'A. Personal Data' },
      {
        type: 'p',
        text: 'While using our Service, we may ask you to provide us with certain personally identifiable information that can be used to contact, identify, or legally represent you ("Personal Data"). Personally identifiable information includes, but is not limited to:',
      },
      {
        type: 'ul',
        items: [
          {
            label: 'Identity & Contact Details',
            text: 'First name, last name, phone number, and email address.',
          },
          {
            label: 'Address & Location',
            text: 'Full physical address, State, Province, ZIP/Postal code, and City.',
          },
          {
            label: 'Corporate & Legal Documentation',
            text: 'Passports, company establishment deeds, corporate tax structures, and business credentials necessary for processing immigration or corporate setup.',
          },
          { label: 'Digital Footprint', text: 'Cookies and Usage Data.' },
        ],
      },
      { type: 'subheading', text: 'B. Usage Data' },
      {
        type: 'p',
        text: 'We automatically collect information that your browser sends whenever you visit our website ("Usage Data"). This Usage Data includes:',
      },
      {
        type: 'ul',
        items: [
          'Your computer’s Internet Protocol address (IP address), browser type, browser version, and specific pages of our website that you visit.',
          'The time and date of your visit, the unique time spent on those pages, unique device identifiers, and other technical diagnostic data.',
        ],
      },
      { type: 'subheading', text: 'C. Tracking & Cookies Data' },
      {
        type: 'p',
        text: 'We use cookies and similar advanced tracking technologies (such as beacons, tags, and scripts) to safely track user activity on our platform and hold vital session information to optimize your security.',
      },
      {
        type: 'p',
        text: 'Cookies are files with a small amount of data which may include an anonymous unique identifier sent to your browser from a website and safely stored on your physical device. You can instruct your browser to refuse all cookies or to indicate when a cookie is being sent. However, if you do not accept cookies, certain critical portions of our legal and corporate service platform may become inaccessible.',
      },
      { type: 'p', text: 'Examples of cookies we use:' },
      {
        type: 'dl',
        items: [
          {
            term: 'Session Cookies',
            text: 'Used exclusively to operate, protect, and maintain our active Service.',
          },
          {
            term: 'Preference Cookies',
            text: 'Used to safely remember your language preferences, service selections, and various localized settings.',
          },
          {
            term: 'Security Cookies',
            text: 'Used strictly for advanced security purposes, user verification, and fraud prevention.',
          },
        ],
      },
    ],
  },
  {
    id: 'use',
    n: 2,
    title: 'Detailed Use of Data',
    blocks: [
      {
        type: 'p',
        text: 'International Living One Touch utilizes the collected data for robust operational, administrative, and legal purposes:',
      },
      {
        type: 'ul',
        items: [
          'To deliver, verify, and maintain the integrity of our digital and offline Services.',
          'To formally notify you about regulatory alterations, system updates, or changes to our Service.',
          'To securely manage client portfolios, immigration tracks, and business registrations.',
          'To provide efficient, responsive customer care and administrative support.',
          'To gather technical data and analysis so that we can consistently monitor and improve our website’s user experience.',
          'To proactively detect, isolate, prevent, and address technical or cybersecurity vulnerabilities.',
        ],
      },
    ],
  },
  {
    id: 'transfer',
    n: 3,
    title: 'Transfer and Processing of Data',
    blocks: [
      {
        type: 'p',
        text: 'Your information, including Personal Data, may be transferred to—and safely maintained on—computers located outside of your state, province, country, or other governmental jurisdiction where the data protection laws may differ from those in your jurisdiction.',
      },
      {
        type: 'p',
        text: 'If you are located outside Indonesia and choose to provide information to us, please note that we securely transfer all data, including Personal Data, to Indonesia and process it there under applicable local regulations. Your explicit consent to this Privacy Policy followed by your submission of such information represents your absolute agreement to that transfer and processing.',
      },
      {
        type: 'p',
        text: 'International Living One Touch will take all steps reasonably and legally necessary to ensure that your data is treated securely and in accordance with this Privacy Policy. No transfer of your Personal Data will ever take place to an external organization or foreign country unless there are adequate, vetted controls in place regarding the security of your data and personal information.',
      },
    ],
  },
  {
    id: 'disclosure',
    n: 4,
    title: 'Strict Disclosure of Data & Legal Requirements',
    blocks: [
      {
        type: 'p',
        text: 'International Living One Touch will never sell, lease, or unsecurely distribute your Personal Data to third parties. We may disclose your Personal Data in the good faith belief that such rigorous action is strictly necessary to:',
      },
      {
        type: 'ul',
        items: [
          'Comply with an active legal obligation, subpoena, or direct government mandate from Indonesian authorities (e.g., Immigration, BKPM, Tax Office).',
          'Protect, litigate, and defend the intellectual property, rights, or physical property of International Living One Touch.',
          'Prevent, trace, or thoroughly investigate possible wrongdoing, fraud, or compliance breaches in connection with our website and Services.',
          'Protect the personal safety of users of the Service, our staff, or the general public under emergency circumstances.',
          'Protect the platform against severe legal liability, claims, or lawsuits.',
        ],
      },
    ],
  },
  {
    id: 'security',
    n: 5,
    title: 'Cybersecurity and Security of Data',
    blocks: [
      {
        type: 'p',
        text: 'The total security of your private data is of paramount importance to us. However, remember that no method of transmission over the Internet, or method of electronic storage, is 100% secure. While we actively utilize commercially acceptable and legally recognized encryption standards to protect your Personal Data, we cannot guarantee its absolute, impenetrable security.',
      },
    ],
  },
  {
    id: 'providers',
    n: 6,
    title: 'Service Providers & Analytics',
    blocks: [
      {
        type: 'p',
        text: 'We may employ verified third-party companies and specialized individuals to facilitate our Service ("Service Providers"), to provide the Service on our behalf, to perform administrative or legal-related services, or to assist us in analyzing how our platform is utilized.',
      },
      {
        type: 'p',
        text: 'These third-party entities have strict access to your Personal Data only to perform these highly specialized tasks on our explicit behalf and are bound by rigorous non-disclosure agreements (NDAs) prohibiting them from disclosing or using it for any other purpose.',
      },
      { type: 'subheading', text: 'Web Analytics & Performance Tracking' },
      {
        type: 'p',
        text: 'We use third-party Service Providers to monitor, secure, and analyze the use of our Service.',
      },
      {
        type: 'dl',
        items: [
          {
            term: 'Google Analytics',
            text: 'A web analytics service offered by Google that tracks and reports website traffic. Google uses the data collected to track and monitor the use of our Service, sharing this data with other Google services. Google may also use the collected data to contextualize and personalize advertisements within its own advertising network. For more information on the privacy practices of Google, please visit the Google Privacy & Terms web page.',
          },
        ],
      },
    ],
  },
  {
    id: 'children',
    n: 7,
    title: 'Children’s Privacy',
    blocks: [
      {
        type: 'p',
        text: 'Our Service does not address and is not intended for anyone under the age of 18 ("Children").',
      },
      {
        type: 'p',
        text: 'We do not knowingly collect personally identifiable information from anyone under the age of 18. If you are a parent or legal guardian and you are fully aware that your child has provided us with Personal Data without your consent, please contact us immediately. If we discover that we have inadvertently collected Personal Data from children without verified parental consent, we will take immediate, irreversible steps to remove that information from our servers.',
      },
    ],
  },
  {
    id: 'changes',
    n: 8,
    title: 'Changes to This Privacy Policy',
    blocks: [
      {
        type: 'p',
        text: 'We reserve the right to update or modify our Privacy Policy from time to time to align with new legal structures. We will promptly notify you of any modifications by posting the newly revised Privacy Policy directly on this webpage.',
      },
      {
        type: 'p',
        text: 'We will let you know via email and/or a prominent notice across our digital Service platform prior to the change becoming effective, and we will update the "effective date" located at the top of this Privacy Policy accordingly. You are strongly advised to review this Privacy Policy periodically for any adjustments. Changes to this Privacy Policy become legally binding and effective the moment they are published on this page.',
      },
    ],
  },
  {
    id: 'contact',
    n: 9,
    title: 'Contact Us',
    blocks: [{ type: 'contact' }],
  },
]

function BlockContent({ block }: { block: Block }) {
  switch (block.type) {
    case 'p':
      return <p className="text-muted leading-relaxed">{block.text}</p>
    case 'subheading':
      return <h3 className="pt-2 text-lg font-semibold text-foreground">{block.text}</h3>
    case 'ul':
      return (
        <ul className="space-y-3">
          {block.items.map((item, i) => (
            <li key={i} className="flex gap-3 text-muted leading-relaxed">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" aria-hidden="true" />
              {typeof item === 'string' ? (
                <span>{item}</span>
              ) : (
                <span>
                  <span className="font-semibold text-foreground">{item.label}:</span> {item.text}
                </span>
              )}
            </li>
          ))}
        </ul>
      )
    case 'dl':
      return (
        <dl className="space-y-4">
          {block.items.map((item, i) => (
            <div key={i} className="rounded-2xl bg-surface p-5">
              <dt className="font-semibold text-foreground">{item.term}</dt>
              <dd className="mt-1.5 text-muted leading-relaxed">{item.text}</dd>
            </div>
          ))}
        </dl>
      )
    case 'contact':
      return (
        <p className="text-muted leading-relaxed">
          If you have any questions, compliance inquiries, or data removal requests regarding this
          Privacy Policy, please contact our legal administration desk directly via our{' '}
          <Link href="/contact" className="font-medium text-accent underline underline-offset-2">
            website contact portal
          </Link>
          .
        </p>
      )
  }
}

export default function PrivacyPage() {
  return (
    <div className="section-padding">
      <div className="mx-auto w-full max-w-[1400px] px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <header className="mb-12 md:mb-16">
          <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-accent">
            International Living One Touch
          </p>
          <h1 className="text-4xl font-bold tracking-tight md:text-5xl">Privacy Policy</h1>
          <p className="mt-4 text-muted">Effective date: June 2026</p>
        </header>

        <div className="grid gap-12 lg:grid-cols-[260px_1fr] lg:gap-16">
          {/* Table of contents */}
          <aside className="hidden lg:block">
            <nav aria-label="Table of contents" className="sticky top-28">
              <p className="mb-4 text-sm font-semibold text-foreground">On this page</p>
              <ol className="space-y-2.5">
                {SECTIONS.map((s) => (
                  <li key={s.id}>
                    <a
                      href={`#${s.id}`}
                      className="flex gap-2.5 text-sm leading-snug text-muted transition-colors duration-200 hover:text-accent"
                    >
                      <span className="tabular-nums text-muted/60">{s.n}.</span>
                      <span>{s.title}</span>
                    </a>
                  </li>
                ))}
              </ol>
            </nav>
          </aside>

          {/* Content */}
          <article className="max-w-3xl space-y-12">
            {/* Intro */}
            <div className="space-y-4">
              {INTRO.map((text, i) => (
                <p key={i} className="text-muted leading-relaxed">
                  {text}
                </p>
              ))}
            </div>

            {SECTIONS.map((section) => (
              <section key={section.id} id={section.id} className="scroll-mt-28">
                <h2 className="mb-5 text-2xl font-bold tracking-tight">
                  <span className="text-accent">{section.n}.</span> {section.title}
                </h2>
                <div className="space-y-4">
                  {section.blocks.map((block, i) => (
                    <BlockContent key={i} block={block} />
                  ))}
                </div>
              </section>
            ))}
          </article>
        </div>
      </div>
    </div>
  )
}
