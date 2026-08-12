import 'server-only'

/**
 * HubSpot Forms Submission API integration for the survey intake modal.
 *
 * Same mechanism as the contact form (`./hubspot.ts`): the public Forms
 * endpoint, which needs no API token — a Portal ID and a Form GUID are not
 * secrets, they appear in any embedded HubSpot form. That is the whole reason
 * this is worth doing: no private app, no access token to provision or rotate,
 * no extra secret in Coolify.
 *
 * Deliberately shares the contact form's GUID — one HubSpot form receives both
 * contact enquiries and survey answers. Nothing new to provision: if the
 * contact form works, this works.
 *
 * Gated on config: without the env vars this is a clean no-op, so the modal
 * keeps working before HubSpot is set up.
 *
 * ── What the shared form must allow ──────────────────────────────────────────
 *
 * The survey sends far fewer fields than the contact form, and HubSpot
 * validates every submission against the form definition. So:
 *
 * 1. No OPTIONAL field may be marked required. The survey sends no firstname,
 *    no message, no phone; a required one rejects every survey submission with
 *    "Required field 'x' is missing". Marketing → Forms → edit → clear those
 *    toggles. (The contact form's own client-side validation is what actually
 *    enforces its fields, so nothing is lost.)
 *
 * 2. The form must CONTAIN a Telegram field, or Telegram submissions 400 with
 *    "telegram is not a valid field". Create the property first:
 *      Settings → Properties → Create property
 *      Object type: Contact · Label: "Telegram" · Type: Single-line text
 *    Confirm its INTERNAL NAME is exactly `telegram` — HubSpot derives it from
 *    the label, so check rather than assume. If it differs, update
 *    TELEGRAM_FIELD below.
 *
 * ── Why Telegram submissions carry a synthetic email ─────────────────────────
 *
 * `email` is required on every HubSpot form and CANNOT be made optional — it is
 * the identity property contacts are created and deduped by. A Telegram-only
 * visitor has no email, so a bare handle submission is rejected outright:
 *
 *    Error in 'fields.email'. Required field 'email' is missing  (REQUIRED_FIELD)
 *
 * Rather than lose those leads, we synthesise `<handle>@telegram.invalid` and
 * put the real handle in the `telegram` property. `.invalid` is reserved by
 * RFC 2606 precisely for this: it can never be registered, never resolves, and
 * reads as unmistakably fake, so nobody mistakes one for a real address.
 *
 * ⚠️ Exclude them from any email send. In HubSpot, filter with:
 *      Email · does not contain · @telegram.invalid
 *
 * (The alternative is the CRM objects API, which can create a contact with no
 * email — but that needs a private-app access token, which is exactly the
 * complexity this integration exists to avoid.)
 *
 * Both survey and contact submissions land in the same form's submission list.
 * To tell them apart, filter on the `pageName` context this sends
 * ("Ilot Survey Intake") versus the contact form's ("Ilot Contact Form").
 */
const PORTAL_ID = process.env.HUBSPOT_PORTAL_ID
const FORM_GUID = process.env.HUBSPOT_FORM_GUID

export const HUBSPOT_SURVEY_ENABLED = Boolean(PORTAL_ID && FORM_GUID)

/**
 * Internal name of the Telegram contact property. Not a HubSpot default — it
 * must exist in the portal and be present on the form, or HubSpot rejects the
 * submission with an "invalid fields" error naming it.
 */
const TELEGRAM_FIELD = 'telegram'

/**
 * Domain for the synthetic address on Telegram-only submissions. RFC 2606
 * reserves `.invalid` as permanently unregistrable, so these can never resolve,
 * never receive mail, and never collide with a real address.
 */
const TELEGRAM_EMAIL_DOMAIN = 'telegram.invalid'

/**
 * The address a Telegram handle is filed under.
 *
 * Lower-cased: Telegram handles are case-insensitive, so `Kadek_C` and
 * `kadek_c` are the same person — without this they would dedup as two separate
 * HubSpot contacts. The `telegram` property keeps the handle as typed.
 *
 * Handles are `[A-Za-z0-9_]` only, all valid in an email local-part, so no
 * further escaping is needed.
 */
export function telegramPlaceholderEmail(handle: string): string {
  return `${handle.toLowerCase()}@${TELEGRAM_EMAIL_DOMAIN}`
}

export interface SurveySubmission {
  contactMethod: 'email' | 'telegram'
  /** Already normalised: emails lowercased, Telegram handles stripped of '@'. */
  contact: string
}

export interface SurveyContext {
  ipAddress?: string
  pageUri?: string
  pageName?: string
}

/**
 * Submit one survey answer to HubSpot. Throws on a non-2xx so the caller can
 * decide what to do — for the survey that is fatal, since HubSpot is the only
 * sink and a dropped write is a lost lead.
 *
 * The error carries HubSpot's own response body, which names the offending
 * field on a misconfiguration. That is the difference between "it doesn't work"
 * and "the form has no `telegram` field".
 */
export async function submitSurveyToHubSpot(
  submission: SurveySubmission,
  context: SurveyContext = {}
): Promise<void> {
  if (!HUBSPOT_SURVEY_ENABLED) return

  const endpoint = `https://api.hsforms.com/submissions/v3/integration/submit/${PORTAL_ID}/${FORM_GUID}`

  // An email submission sends only `email` — sending a blank `telegram` would
  // wipe a real handle off an existing contact.
  //
  // A Telegram submission sends the handle AND a synthetic email, because
  // HubSpot rejects any submission without one. See the note above.
  //
  // No `submittedAt` field — HubSpot timestamps the submission itself.
  const fields =
    submission.contactMethod === 'email'
      ? [{ name: 'email', value: submission.contact }]
      : [
          { name: TELEGRAM_FIELD, value: submission.contact },
          { name: 'email', value: telegramPlaceholderEmail(submission.contact) },
        ]

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fields,
      context: {
        ...(context.ipAddress ? { ipAddress: context.ipAddress } : {}),
        ...(context.pageUri ? { pageUri: context.pageUri } : {}),
        ...(context.pageName ? { pageName: context.pageName } : {}),
      },
    }),
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`HubSpot survey submit failed (${res.status}): ${body}`)
  }
}
