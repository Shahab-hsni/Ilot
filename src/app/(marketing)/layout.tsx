import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { GoogleAnalytics } from '@/components/analytics/GoogleAnalytics'

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navbar />
      <main>{children}</main>
      <Footer />
      {/*
        Mounted here rather than in the root layout so the tag is scoped to the
        public site. /studio inherits the root layout, and tracking it would log
        the client's own Sanity editing sessions as pageviews.
      */}
      <GoogleAnalytics />
    </>
  )
}
