import 'server-only'
import type { SurveyPayload } from '@/lib/survey/types'

/**
 * HubSpot CRM Objects API integration for survey intake leads.
 *
 * ── Why not the Forms API (`./hubspot.ts`)? ──────────────────────────────────
 *
 * The contact form uses the public Forms Submission endpoint, which needs no
 * secret. We cannot use it here: it requires an `email` field as the contact
 * identity, and half of all survey answers are a Telegram handle with no email
 * attached. The Forms API rejects those outright.
 *
 * The CRM Objects API does allow an email-less contact, so a Telegram-only lead
 * is stored as a real contact carrying a `telegram` property. The cost is that
 * this endpoint needs a private-app access token, which IS a secret and must
 * never reach the browser — hence `server-only` and the server action in
 * `src/lib/survey/actions.ts` that calls it.
 *
 * ── One-time HubSpot setup ───────────────────────────────────────────────────
 *
 * 1. Settings → Integrations → Private Apps → create an app with the
 *    `crm.objects.contacts.read` and `crm.objects.contacts.write` scopes.
 *    Put its token in `HUBSPOT_ACCESS_TOKEN`.
 * 2. Settings → Properties → Contact properties → create a single-line text
 *    property with the internal name `telegram`. Without it, HubSpot returns
 *    400 PROPERTY_DOESNT_EXIST on every Telegram submission.
 *
 * Gated on config: with no token this is a clean no-op, exactly like the Forms
 * helper, so the survey keeps working before HubSpot is set up.
 */
const ACCESS_TOKEN = process.env.HUBSPOT_ACCESS_TOKEN

export const HUBSPOT_SURVEY_ENABLED = Boolean(ACCESS_TOKEN)

const API = 'https://api.hubapi.com/crm/v3/objects/contacts'

/**
 * Internal name of the custom contact property holding the Telegram handle.
 * Stored without the leading '@' — `normalizeTelegram` has already stripped it.
 */
const TELEGRAM_PROPERTY = 'telegram'

interface HubSpotSearchResponse {
  total: number
  results: { id: string }[]
}

async function hubspotFetch(url: string, init: RequestInit): Promise<Response> {
  return fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
    // Never let a slow CRM hold the visitor's submit spinner open indefinitely.
    signal: AbortSignal.timeout(8000),
  })
}

async function failure(res: Response, label: string): Promise<Error> {
  const body = await res.text().catch(() => '')
  return new Error(`HubSpot ${label} failed (${res.status}): ${body}`)
}

/**
 * Find an existing contact by whichever identifier we have.
 *
 * Deduping matters more here than on the contact form: a campaign link gets
 * re-shared and the same person answers twice. Without this every resend
 * creates a duplicate contact.
 */
async function findContactId(
  property: string,
  value: string
): Promise<string | null> {
  const res = await hubspotFetch(`${API}/search`, {
    method: 'POST',
    body: JSON.stringify({
      filterGroups: [
        { filters: [{ propertyName: property, operator: 'EQ', value }] },
      ],
      properties: ['hs_object_id'],
      limit: 1,
    }),
  })

  if (!res.ok) throw await failure(res, 'search')

  const data = (await res.json()) as HubSpotSearchResponse
  return data.results[0]?.id ?? null
}

/**
 * Upsert a survey lead into HubSpot.
 *
 * Throws on a non-2xx response so the caller can log it. Callers should treat
 * failure as non-fatal only if they have another sink — for the survey, HubSpot
 * IS the sink, so `actions.ts` surfaces the error to the visitor rather than
 * telling them we'll be in touch when the answer was actually dropped.
 */
export async function submitSurveyToHubSpot(payload: SurveyPayload): Promise<void> {
  if (!HUBSPOT_SURVEY_ENABLED) return

  const isEmail = payload.contactMethod === 'email'
  const identityProperty = isEmail ? 'email' : TELEGRAM_PROPERTY

  const properties: Record<string, string> = {
    [identityProperty]: payload.contact,
    // Standard, writable, and safe to set on both create and update. Survey
    // answers are top-of-funnel by definition.
    lifecyclestage: 'lead',
  }

  const existingId = await findContactId(identityProperty, payload.contact)

  const res = existingId
    ? await hubspotFetch(`${API}/${existingId}`, {
        method: 'PATCH',
        body: JSON.stringify({ properties }),
      })
    : await hubspotFetch(API, {
        method: 'POST',
        body: JSON.stringify({ properties }),
      })

  if (!res.ok) throw await failure(res, existingId ? 'update' : 'create')
}
