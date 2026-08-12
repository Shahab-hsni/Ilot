import type { SurveyPayload } from './types'
import { submitSurveyAction } from './actions'

/**
 * Client-side entry point for a survey submission.
 *
 * Thin on purpose. All the real work — validation, rate limiting, the HubSpot
 * write — happens in `./actions.ts`, which is `'use server'` and therefore runs
 * on the server where the HubSpot token lives. Nothing here touches a third
 * party directly, so no key ships to the browser.
 *
 * This module stays as the seam the modal imports, so swapping or adding a sink
 * later means editing `actions.ts` and nothing else.
 */
export type SurveySubmitResult = { ok: true } | { ok: false; error: string }

export async function submitSurvey(payload: SurveyPayload): Promise<SurveySubmitResult> {
  try {
    return await submitSurveyAction(payload)
  } catch {
    // A rejected server action means the request never landed — a dropped
    // connection, an offline visitor, a deploy mid-submit. Never let it throw
    // past the modal's submit handler and leave the spinner spinning forever.
    return {
      ok: false,
      error: 'We could not reach the server. Please check your connection and try again.',
    }
  }
}
