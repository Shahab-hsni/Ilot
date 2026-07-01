import 'server-only'

/**
 * HubSpot Forms Submission API integration.
 *
 * Pushes contact-form submissions into HubSpot CRM as contacts (deduped by
 * email) plus a native form-submission timeline event. Uses the public Forms
 * endpoint — Portal ID + Form GUID are not secrets (they're exposed in any
 * embedded HubSpot form), so no API token is required.
 *
 * Gated on config: if the env vars are absent this is a clean no-op, so the
 * contact form keeps working before/without HubSpot being set up.
 */
const PORTAL_ID = process.env.HUBSPOT_PORTAL_ID
const FORM_GUID = process.env.HUBSPOT_FORM_GUID

export const HUBSPOT_ENABLED = Boolean(PORTAL_ID && FORM_GUID)

export interface HubSpotContact {
  email: string
  firstName: string
  lastName: string
  phone?: string
  message: string
}

interface HubSpotContext {
  ipAddress?: string
  pageUri?: string
  pageName?: string
}

/**
 * Submit a contact to HubSpot. Throws on a non-2xx response so the caller can
 * log it; callers should treat failures as non-fatal (the email is the
 * critical path, HubSpot is supplementary).
 */
export async function submitToHubSpot(
  contact: HubSpotContact,
  context: HubSpotContext = {}
): Promise<void> {
  if (!HUBSPOT_ENABLED) return

  const endpoint = `https://api.hsforms.com/submissions/v3/integration/submit/${PORTAL_ID}/${FORM_GUID}`

  // Field internal names must match the HubSpot form's fields. Optional fields
  // are omitted when empty rather than sent blank.
  const fields: { name: string; value: string }[] = [
    { name: 'email', value: contact.email },
    { name: 'firstname', value: contact.firstName },
  ]
  if (contact.lastName) fields.push({ name: 'lastname', value: contact.lastName })
  if (contact.phone) fields.push({ name: 'phone', value: contact.phone })
  fields.push({ name: 'message', value: contact.message })

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
    throw new Error(`HubSpot submit failed (${res.status}): ${body}`)
  }
}
