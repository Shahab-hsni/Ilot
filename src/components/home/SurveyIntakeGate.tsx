'use client'

import dynamic from 'next/dynamic'
import { useCallback, useEffect, useState } from 'react'
import { SURVEY_PARAM } from '@/lib/survey/param'

/**
 * Opens the survey modal, and only for visitors arriving on
 * `/?survey_intake_form=true`. Without the param nothing renders and the modal
 * chunk is never requested.
 *
 * ── Two rules this component exists to obey ──────────────────────────────────
 *
 * 1. `dynamic(..., { ssr: false })` on a Client Component placed directly
 *    inside a Server Component never mounts — no error, no chunk request, the
 *    component is simply absent. The dynamic() call has to live inside a Client
 *    Component, which is what this file is. Do not merge it into the modal, and
 *    do not "simplify" it by importing the modal from the page.
 *
 * 2. The param is read from `window.location.search`, never `useSearchParams`.
 *    The latter opts the entire route into dynamic rendering — the home page
 *    would lose its static prerender and its CDN cache for every visitor, in
 *    order to serve one campaign link. This effect runs after hydration, which
 *    is soon enough for a modal.
 */
const SurveyIntakeModal = dynamic(() => import('./SurveyIntakeModal'), {
  ssr: false,
})

export default function SurveyIntakeGate() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get(SURVEY_PARAM) !== 'true') return

    setOpen(true)

    // Strip the param so a refresh — or the URL being copied out of the address
    // bar and shared — doesn't reopen the survey over and over.
    params.delete(SURVEY_PARAM)
    const query = params.toString()
    window.history.replaceState(
      null,
      '',
      `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`
    )
  }, [])

  const handleClose = useCallback(() => setOpen(false), [])

  if (!open) return null

  return <SurveyIntakeModal onClose={handleClose} />
}
