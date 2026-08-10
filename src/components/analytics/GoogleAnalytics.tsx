// Server Component — no 'use client', ships no client JS of its own. Both tags
// are server-rendered into the HTML (and baked into the prerendered static
// pages at build time), so tracking starts when the browser parses the document
// rather than after React hydrates, and it still works if the client bundle
// fails to hydrate.
//
// Plain <script> tags rather than `next/script`: React 19 hoists
// `<script async src>` into <head> and renders the inline block in place. With
// next/script's strategy="afterInteractive" the server-rendered HTML gets only
// a `<link rel="preload">` and both tags are injected from a useEffect after
// hydration instead — which works, but is not server-side rendered.

// Measurement ID for the ilotlegal.com GA4 property. Hardcoded as the default
// for the same reason the facebook-domain-verification tag is: `.env*` is
// gitignored, so an env-only value would silently never load on Coolify unless
// someone remembers to add it there. `NEXT_PUBLIC_GA_ID` stays available as an
// override (e.g. to point a staging deploy at a separate property).
// `.trim() ||` — not `??` — because Coolify writes an empty string for a var
// left blank in the UI, and `??` would not fall back on that.
const GA_ID = process.env.NEXT_PUBLIC_GA_ID?.trim() || 'G-GQH6EWMLDZ'

// gtag.js instruments `dataLayer.push`, so it picks up these commands whether
// the async loader finishes before or after this inline block runs — the two
// tags are order-independent.
const GA_INIT = `window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${GA_ID}');`

export function GoogleAnalytics() {
  // Keep localhost/dev hits out of the property — there is no way to delete
  // them once collected. To verify the tag end to end, run a production build
  // (`npm run build && npm run start`) and watch GA4 Realtime.
  if (process.env.NODE_ENV !== 'production') return null

  return (
    <>
      <script async src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} />
      {/*
        Client-side navigations do not re-run this snippet, so subsequent
        pageviews come from GA4's Enhanced Measurement → "Page changes based on
        browser history events", which is enabled on this property and picks up
        the App Router's History API pushes. Verified: one page_view per route,
        correct URL and title. Do not also fire a manual `page_view` here or
        every client-side route change is counted twice.
      */}
      <script dangerouslySetInnerHTML={{ __html: GA_INIT }} />
    </>
  )
}
