import type { Metadata } from 'next'
import { Inter, Caveat } from 'next/font/google'
import './globals.css'
import { WhatsAppFloat } from '@/components/ui/WhatsAppFloat'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const caveat = Caveat({ subsets: ['latin'], variable: '--font-caveat' })

// Defensive: `??` only falls back on null/undefined, not on empty strings.
// If NEXT_PUBLIC_SITE_URL is "" (set in the host env with no value, which is
// what Coolify does when you leave the Value field blank), `new URL("")`
// throws ERR_INVALID_URL and crashes the "Collecting page data" step of
// `next build`. `.trim() || fallback` covers both `undefined` and `""`.
const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL?.trim() || 'https://ilotlegal.com'

export const metadata: Metadata = {
  title: {
    default: 'Ilot | Clear Legal Support. Confident Decisions.',
    template: '%s | Ilot',
  },
  description:
    'Premium legal, visa, and corporate structuring solutions for global investors and expatriates in Indonesia.',
  metadataBase: new URL(siteUrl),
  openGraph: {
    siteName: 'Ilot',
    locale: 'en_US',
    type: 'website',
  },
  // Google Search Console. Next has a first-class field for this one, which emits
  // <meta name="google-site-verification" ...>.
  verification: {
    google: 'UOBl5YaACKudXXZLHUcwCenEbGPtJuEqwCizzITt5Q4',
  },
  // Meta Business Manager domain verification for ilotlegal.com. No first-class
  // field exists for it, hence `other`. Emitted into <head> at build time — both
  // crawlers ignore anything injected by JS.
  other: {
    'facebook-domain-verification': '495tue946uav6fkn72wbt5r2ug0axu',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${caveat.variable}`}>
      <body>
        {children}
        <WhatsAppFloat />
      </body>
    </html>
  )
}






