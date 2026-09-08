// Server Component — no 'use client', ships no client JS of its own. The head
// script is server-rendered into the HTML (and baked into the prerendered
// static pages at build time), so it starts running as soon as the browser
// parses it rather than after React hydrates, and it still works if the
// client bundle fails to hydrate. It's inline (no `src`), so React does not
// hoist it into <head> — it renders where this component is mounted (end of
// the marketing layout, after the footer). That only delays when GTM's tags
// fire relative to the rest of the page, it does not affect whether they
// fire.
//
// Plain <script> tag rather than `next/script`: with next/script's
// strategy="afterInteractive" the server-rendered HTML would get no inline
// script at all — it would be injected from a useEffect after hydration
// instead, which works, but is not server-side rendered.

// GTM container ID for the ilotlegal.com site. Hardcoded as the default for
// the same reason the facebook-domain-verification tag is: `.env*` is
// gitignored, so an env-only value would silently never load on Coolify unless
// someone remembers to add it there. `NEXT_PUBLIC_GTM_ID` stays available as
// an override (e.g. to point a staging deploy at a separate container).
// `.trim() ||` — not `??` — because Coolify writes an empty string for a var
// left blank in the UI, and `??` would not fall back on that.
const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID?.trim() || 'GTM-NWHNR8LP'

const GTM_HEAD_SCRIPT = `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${GTM_ID}');`

export function GoogleTagManager() {
  // Keep localhost/dev hits out of the container — there is no way to delete
  // them once collected. To verify the tag end to end, run a production build
  // (`npm run build && npm run start`) and check GTM's Preview mode / GA4
  // Realtime for whichever tags fire from this container.
  if (process.env.NODE_ENV !== 'production') return null

  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: GTM_HEAD_SCRIPT }} />
      <noscript>
        <iframe
          src={`https://www.googletagmanager.com/ns.html?id=${GTM_ID}`}
          height="0"
          width="0"
          style={{ display: 'none', visibility: 'hidden' }}
        />
      </noscript>
    </>
  )
}
