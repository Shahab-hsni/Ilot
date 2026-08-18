'use client'

import { useEffect, useRef } from 'react'
import { RevealGroup, RevealItem } from '@/components/ui/Reveal'

const MEETINGS_SRC = 'https://meetings-na2.hubspot.com/ilot?embed=true'
const LOADER_SRC = 'https://static.hsappstatic.net/MeetingsEmbed/ex/MeetingsEmbedCode.js'

/**
 * HubSpot Meetings scheduler.
 *
 * The loader script scans the document for `.meetings-iframe-container` once,
 * when it executes, and builds the iframe from that element's `data-src`. That
 * makes it incompatible with a plain server-rendered <script> tag here: the tag
 * runs on the first document parse only, so arriving on `/` via a client-side
 * navigation (any in-app link) would leave an empty container. Injecting the
 * script from an effect on every mount re-runs the scan each time — appending a
 * script element always executes it, cache hit or not.
 *
 * The container is deliberately left childless in JSX so React never diffs the
 * iframe HubSpot injects into it; on unmount we drop both the script and the
 * injected markup so a remount starts from a clean slate instead of stacking a
 * second iframe.
 */
export function MeetingsEmbed() {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const script = document.createElement('script')
    script.type = 'text/javascript'
    script.src = LOADER_SRC
    script.async = true
    document.body.appendChild(script)

    const container = containerRef.current
    return () => {
      script.remove()
      if (container) container.innerHTML = ''
    }
  }, [])

  return (
    <section id="book-a-meeting" className="py-12 md:py-32 bg-white scroll-mt-24">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
        <RevealGroup className="text-center mb-8 md:mb-16 flex flex-col items-center">
          <RevealItem>
            <h2 className="text-2xl md:text-6xl font-bold text-[#0B0B1A] mb-3 md:mb-6 tracking-tight">
              Book a <span className="italic">consultation.</span>
            </h2>
          </RevealItem>
          <RevealItem>
            <p className="text-gray-500 text-sm md:text-lg max-w-2xl mx-auto italic">
              Pick a time that works for you and speak directly with one of our consultants.
            </p>
          </RevealItem>
        </RevealGroup>

        {/* `data-src` and the class name are the loader's contract — do not rename. */}
        <div
          ref={containerRef}
          className="meetings-iframe-container"
          data-src={MEETINGS_SRC}
        />
      </div>
    </section>
  )
}
