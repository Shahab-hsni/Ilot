'use server'

import { headers } from 'next/headers'
import { rateLimit } from '@/lib/rate-limit'
import { appendSurveyRow, GSHEET_ENABLED } from './gsheet'
import { validateContact, normalizeContact } from './validation'
import type { SurveyPayload } from './types'

export type SurveySubmitResult = { ok: true } | { ok: false; error: string }

/**
 * Abuse guard. Tighter than the contact form's 3-per-10-minutes: the survey is
 * one tap behind a public campaign URL with no message to write, so a human has
 * no reason to submit twice, while a script has every reason to.
 */
const RATE_LIMIT = { limit: 5, windowMs: 10 * 60 * 1000 }

const GENERIC_ERROR =
  "Something went wrong on our end. Please try again, or reach us at hello@ilotlegal.com."

/** Best-effort client IP from proxy headers. Mirrors the contact action. */
async function clientIp(): Promise<string> {
  const h = await headers()
  const fwd = h.get('x-forwarded-for')
  if (fwd) return fwd.split(',')[0]!.trim()
  return h.get('x-real-ip')?.trim() || 'unknown'
}

/**
 * Persist a survey answer to HubSpot.
 *
 * Everything is re-validated here. The browser already validated to give fast
 * feedback, but a server action is a public HTTP endpoint — anyone can POST to
 * it directly, so client-side validation is a UX affordance and never a
 * guarantee.
 */
export async function submitSurveyAction(
  payload: SurveyPayload
): Promise<SurveySubmitResult> {
  const { contactMethod } = payload

  if (contactMethod !== 'email' && contactMethod !== 'telegram') {
    return { ok: false, error: GENERIC_ERROR }
  }

  const contactError = validateContact(contactMethod, String(payload.contact ?? ''))
  if (contactError) return { ok: false, error: contactError }

  // Re-normalise rather than trusting the client's normalisation, so the value
  // that reaches HubSpot matches what dedup lookups will search for.
  const contact = normalizeContact(contactMethod, String(payload.contact))

  const { success: allowed } = rateLimit(`survey:${await clientIp()}`, RATE_LIMIT)
  if (!allowed) {
    return {
      ok: false,
      error: 'Too many submissions from this connection. Please try again shortly.',
    }
  }

  // No sink configured (local dev, or before the Apps Script web app is
  // deployed). Log so a test submission is verifiable rather than silently
  // vanishing, and report success so the full modal flow stays exercisable.
  if (!GSHEET_ENABLED) {
    console.info('[survey] Sheet not configured — captured (not stored):', {
      contactMethod,
      contact,
    })
    return { ok: true }
  }

  try {
    await appendSurveyRow({
      contactMethod,
      contact,
      // The client's timestamp, not the server's: it is what the visitor's
      // clock said when they submitted, and the sheet records when the answer
      // was given rather than when it happened to be written.
      submittedAt: String(payload.submittedAt ?? new Date().toISOString()),
      ipAddress: await clientIp(),
    })
    return { ok: true }
  } catch (err) {
    // The sheet is the only sink, so a failure means the answer is lost. Say so
    // instead of showing the success screen over a dropped lead, and log the
    // value alongside the error so it can be recovered by hand.
    console.error('[survey] Sheet append failed:', err, { contactMethod, contact })
    return { ok: false, error: GENERIC_ERROR }
  }
}
