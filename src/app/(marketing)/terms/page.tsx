import type { Metadata } from 'next'
import { AlertTriangle } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Terms & Conditions',
  description:
    'The Terms of Use governing your use of International Living One Touch (ILOT) services.',
}

type Block =
  | { type: 'p'; text: string }
  | { type: 'callout'; text: string }
  | { type: 'ul'; items: string[] }
  | { type: 'dl'; items: { term: string; text: string }[] }

interface Section {
  id: string
  n: number
  title: string
  blocks: Block[]
}

const SECTIONS: Section[] = [
  {
    id: 'accepting',
    n: 1,
    title: 'Accepting These Terms and Conditions',
    blocks: [
      {
        type: 'p',
        text: 'This document and the other documents that we reference below make up our house rules, or what we officially call our Terms of Use (the "Terms" for short). The Terms are a legally binding contract between you and International Living One Touch.',
      },
      {
        type: 'callout',
        text: 'Please note that Section Disputes contains an arbitration clause and class action waiver. By agreeing to the Terms, you agree to resolve all disputes through binding individual arbitration, which means that you waive any right to have those disputes decided by a judge or jury, and that you waive your right to participate in class actions, class arbitrations, or representative actions.',
      },
      {
        type: 'p',
        text: 'This contract sets out your rights and responsibilities when you use International Living One Touch, so please read it carefully. By using any of our Services (including simply browsing our websites), you are agreeing to these Terms. If you do not agree with the Terms, you may not use our Services.',
      },
    ],
  },
  {
    id: 'services',
    n: 2,
    title: 'Services Provided',
    blocks: [
      {
        type: 'p',
        text: 'International Living One Touch processes immigration services, business setup services, and corporate administration, both online and offline. If you use any of our Services, you agree to these Terms and our Privacy Policy. All of these policies are an integral part of our Terms.',
      },
    ],
  },
  {
    id: 'privacy',
    n: 3,
    title: 'Your Privacy and Data Protection',
    blocks: [
      {
        type: 'p',
        text: 'We know your personal information is important to you, so it is important to us. Our Privacy Policy details how your information is handled when you use our Services. By using our Services, you agree that we can process your information in the ways set out in the Privacy Policy.',
      },
      {
        type: 'p',
        text: 'Both International Living One Touch and third-party sellers/partners process members’ personal information (for example, client names, email addresses, passport details, and corporate documentation) and are therefore considered separate and independent data controllers under applicable data protection laws.',
      },
      {
        type: 'ul',
        items: [
          'Each party is solely responsible for the personal information it processes in providing the Services.',
          'If a partner or third-party seller accidentally discloses a user’s personal data, that partner, and not International Living One Touch, will be held exclusively liable for that unauthorized disclosure.',
          'If, however, International Living One Touch and a partner are found to be joint data controllers, and International Living One Touch is sued, fined, or otherwise incurs expenses because of something that you did as a joint data controller, you agree to indemnify International Living One Touch for all expenses occurred.',
        ],
      },
    ],
  },
  {
    id: 'account',
    n: 4,
    title: 'Your Account Security and Responsibilities',
    blocks: [
      {
        type: 'p',
        text: 'You will need to create an account with International Living One Touch to use certain aspects of our Services. You must adhere to the following rules:',
      },
      {
        type: 'dl',
        items: [
          {
            term: 'Age Requirement',
            text: 'You must be 18 years or older to use our Services. Children under 13 years are strictly prohibited from using the platform. You are solely responsible for any account activity conducted by a minor on your account.',
          },
          {
            term: 'Accuracy of Information',
            text: 'Provide accurate, current, and complete information about yourself. It is strictly prohibited to use false information, use a fake identity, or impersonate another person or company through your account.',
          },
          {
            term: 'Account Names',
            text: 'If you use a username or business alias, you may not use language that is offensive, vulgar, infringes someone’s intellectual property rights, or otherwise violates the Terms.',
          },
          {
            term: 'Account Responsibility',
            text: 'You are solely responsible for any and all activity on your account. If you share an account with other people, the person whose financial/billing information is on the account will ultimately be held responsible. If you are registering as a business entity, you personally guarantee that you have the legal authority to bind the business to these Terms. Accounts are non-transferable.',
          },
          {
            term: 'Password Protection',
            text: 'You are responsible for keeping your account password secure. You must notify us immediately of any unauthorized use of your account.',
          },
        ],
      },
    ],
  },
  {
    id: 'security',
    n: 5,
    title: 'Website Security and Prohibited Uses (Safety Clause)',
    blocks: [
      {
        type: 'p',
        text: 'To ensure the safety, integrity, and availability of our website and services, you agree NOT to engage in any of the following prohibited activities:',
      },
      {
        type: 'ul',
        items: [
          'Using any automated system, including "robots," "spiders," "offline readers," or "scrapers," to access the Services or harvest data.',
          'Attempting to interfere with, compromise the system integrity or security, or decipher any transmissions to or from the servers running the website.',
          'Taking any action that imposes, or may impose an unreasonable or disproportionately large load on our infrastructure.',
          'Uploading invalid data, viruses, worms, or other software agents through the Services.',
        ],
      },
    ],
  },
  {
    id: 'ip',
    n: 6,
    title: 'Intellectual Property & Your Content',
    blocks: [
      {
        type: 'dl',
        items: [
          {
            term: 'Our Content',
            text: 'All content, designs, graphics, code, and intellectual property on this website are the exclusive property of International Living One Touch or its licensors.',
          },
          {
            term: 'Your Content',
            text: 'Content that you post or upload using our Services is yours ("Your Content"). We do not make any claim of ownership over it (such as profile pictures, document uploads, reviews, comments, or usernames). However, by uploading it, you grant us a worldwide, royalty-free license to use, host, and store it solely for the purpose of fulfilling your requested legal and business services.',
          },
        ],
      },
    ],
  },
  {
    id: 'license',
    n: 7,
    title: 'Limited License to Use Our Services',
    blocks: [
      {
        type: 'p',
        text: 'We grant you a limited, non-exclusive, non-transferable, and revocable license to use our Services, subject strictly to your compliance with these Terms. This contract does not create any agency, partnership, joint venture, employment, or franchisee relationship between you and International Living One Touch.',
      },
    ],
  },
  {
    id: 'termination',
    n: 8,
    title: 'Termination',
    blocks: [
      {
        type: 'dl',
        items: [
          {
            term: 'Termination By You',
            text: 'You may terminate your account with International Living One Touch at any time from your account settings. Terminating your account will not automatically delete all of Your Content posted prior to termination. You remain liable to pay any outstanding balances or bills for services rendered.',
          },
          {
            term: 'Termination By International Living One Touch',
            text: 'We may terminate, restrict, or suspend your account and your access to the Services at any time, for any reason, and without advance notice. If we do so, you do not have a contractual or legal right to continue to use our Services. International Living One Touch reserves the right to refuse service to anyone, at any time, for any reason.',
          },
          {
            term: 'Data Loss',
            text: 'If your account is terminated, you may permanently lose any information or data associated with your account, including Your Content.',
          },
          {
            term: 'Discontinuation of Services',
            text: 'International Living One Touch reserves the right to change, suspend, or discontinue any of the Services at any time, for any reason. We will not be liable to you for the effect that any changes to the Services may have on you, including your business income or revenue generation.',
          },
          {
            term: 'Survival',
            text: 'The Terms will remain in full effect even after your access to the Service is terminated, or your use of the Service ends.',
          },
        ],
      },
    ],
  },
  {
    id: 'warranties',
    n: 9,
    title: 'Warranties and Limitation of Liability',
    blocks: [
      {
        type: 'p',
        text: 'International Living One Touch provides its services on an "as is" and "as available" basis without any warranties of any kind, either express or implied. We do not guarantee that immigration approvals, corporate registrations, or legal processes will be successful if blocked by government policy changes or external regulatory factors.',
      },
      {
        type: 'p',
        text: 'In no event shall International Living One Touch be liable for any indirect, incidental, special, consequential, or punitive damages arising out of or relating to your use of the website or services.',
      },
    ],
  },
]

function BlockContent({ block }: { block: Block }) {
  switch (block.type) {
    case 'p':
      return <p className="text-muted leading-relaxed">{block.text}</p>
    case 'callout':
      return (
        <div className="rounded-2xl bg-foreground p-6 text-white">
          <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-accent">
            <AlertTriangle className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
            Important — please read
          </p>
          <p className="leading-relaxed text-gray-200">{block.text}</p>
        </div>
      )
    case 'ul':
      return (
        <ul className="space-y-3">
          {block.items.map((item, i) => (
            <li key={i} className="flex gap-3 text-muted leading-relaxed">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" aria-hidden="true" />
              <span>{item}</span>
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
  }
}

export default function TermsPage() {
  return (
    <div className="section-padding">
      <div className="mx-auto w-full max-w-[1400px] px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <header className="mb-12 md:mb-16">
          <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-accent">
            International Living One Touch
          </p>
          <h1 className="text-4xl font-bold tracking-tight md:text-5xl">Terms of Use</h1>
          <p className="mt-4 text-muted">Last updated: June 2026</p>
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
