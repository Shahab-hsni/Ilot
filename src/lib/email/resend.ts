import 'server-only'
import { Resend } from 'resend'

/**
 * Lazily-constructed Resend client.
 *
 * Free-tier notes:
 * - Without a verified domain you can ONLY send from `onboarding@resend.dev`
 *   and only TO the email address that owns the Resend account. That's enough
 *   to receive the admin notification while testing.
 * - To email arbitrary users (the confirmation), verify a domain in Resend and
 *   set `RESEND_FROM` to an address on it (e.g. `Ilot <hello@ilotlegal.com>`).
 */
let client: Resend | null = null

export function getResend(): Resend {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    throw new Error('RESEND_API_KEY is not set')
  }
  if (!client) {
    client = new Resend(apiKey)
  }
  return client
}

/**
 * From address used for outgoing mail. Falls back to Resend's shared test sender.
 * Use `||` (not `??`) so an empty `RESEND_FROM=` in .env also falls back — an
 * empty string would otherwise produce an invalid "from" and a 422 from Resend.
 */
export const FROM_ADDRESS =
  process.env.RESEND_FROM || 'Ilot <onboarding@resend.dev>'

/** Where the admin notification is delivered. */
export const ADMIN_ADDRESS =
  process.env.CONTACT_ADMIN_EMAIL || 'hello@ilotlegal.com'

/**
 * Whether a verified sending domain is configured (via RESEND_FROM).
 *
 * Without one, Resend's free tier only allows sending FROM `onboarding@resend.dev`
 * and only TO the email that owns your Resend account — so we send the admin
 * notification only and skip the visitor confirmation. Set RESEND_FROM to an
 * address on a verified domain (free to verify) to enable the confirmation email.
 */
export const HAS_VERIFIED_DOMAIN = Boolean(process.env.RESEND_FROM)
