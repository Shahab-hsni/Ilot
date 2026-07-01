'use server'

import { headers } from 'next/headers'
import {
  getResend,
  FROM_ADDRESS,
  ADMIN_ADDRESS,
  HAS_VERIFIED_DOMAIN,
} from '@/lib/email/resend'
import { adminEmail, userEmail, type ContactSubmission } from '@/lib/email/templates'
import { rateLimit } from '@/lib/rate-limit'
import { submitToHubSpot } from '@/lib/crm/hubspot'

export interface ContactState {
  ok: boolean
  error?: string
  fieldErrors?: Partial<Record<'name' | 'email' | 'phone' | 'message', string>>
}

// Abuse guard: cap submissions per client IP within a rolling window.
const RATE_LIMIT = { limit: 3, windowMs: 10 * 60 * 1000 } // 3 per 10 minutes

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Best-effort client IP from proxy headers. Falls back to a shared bucket. */
async function clientIp(): Promise<string> {
  const h = await headers()
  const fwd = h.get('x-forwarded-for')
  if (fwd) return fwd.split(',')[0]!.trim()
  return h.get('x-real-ip')?.trim() || 'unknown'
}

/** Collapse all whitespace (incl. control chars) to single spaces for header-safe text. */
function singleLine(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

/** Split a single display name into first / last for CRM fields (last may be empty). */
function splitName(full: string): { firstName: string; lastName: string } {
  const parts = full.trim().split(/\s+/)
  return { firstName: parts[0] ?? '', lastName: parts.slice(1).join(' ') }
}

function validate(raw: {
  name: string
  email: string
  phone: string
  message: string
}): { data?: ContactSubmission; fieldErrors?: ContactState['fieldErrors'] } {
  const fieldErrors: NonNullable<ContactState['fieldErrors']> = {}

  const name = singleLine(raw.name)
  const email = raw.email.trim()
  const phone = singleLine(raw.phone)
  const message = raw.message.trim()

  if (name.length < 2) fieldErrors.name = 'Please enter your name.'
  if (name.length > 100) fieldErrors.name = 'Name is too long.'
  if (!EMAIL_RE.test(email) || email.length > 254)
    fieldErrors.email = 'Please enter a valid email address.'
  if (phone && phone.length > 30) fieldErrors.phone = 'Phone number is too long.'
  if (message.length < 10) fieldErrors.message = 'Please write at least a few words.'
  if (message.length > 5000) fieldErrors.message = 'Message is too long.'

  if (Object.keys(fieldErrors).length > 0) return { fieldErrors }

  return { data: { name, email, phone: phone || undefined, message } }
}

export async function submitContact(
  _prev: ContactState,
  formData: FormData
): Promise<ContactState> {
  // Honeypot: bots fill hidden fields, humans don't. Silently succeed.
  if ((formData.get('company') as string)?.trim()) {
    return { ok: true }
  }

  // Rate limit before doing any work, so floods can't burn the email quota.
  const { success: allowed } = rateLimit(`contact:${await clientIp()}`, RATE_LIMIT)
  if (!allowed) {
    return {
      ok: false,
      error: 'Too many messages from this connection. Please try again in a little while.',
    }
  }

  const { data, fieldErrors } = validate({
    name: String(formData.get('name') ?? ''),
    email: String(formData.get('email') ?? ''),
    phone: String(formData.get('phone') ?? ''),
    message: String(formData.get('message') ?? ''),
  })

  if (!data) {
    return { ok: false, error: 'Please fix the errors below.', fieldErrors }
  }

  // Push into HubSpot CRM (deduped by email). Non-fatal and independent of
  // email delivery — a CRM hiccup must never block the enquiry. No-op unless
  // HUBSPOT_PORTAL_ID + HUBSPOT_FORM_GUID are configured.
  const { firstName, lastName } = splitName(data.name)
  try {
    await submitToHubSpot(
      { email: data.email, firstName, lastName, phone: data.phone, message: data.message },
      { ipAddress: await clientIp(), pageName: 'Ilot Contact Form' }
    )
  } catch (err) {
    console.error('[contact] HubSpot submit failed:', err)
  }

  // No Resend key configured yet (e.g. local dev before account setup):
  // log the captured submission so it's verifiable, and report success so the
  // full form UX can be exercised. Becomes a real send once the key is set.
  if (!process.env.RESEND_API_KEY) {
    console.log('[contact] RESEND_API_KEY not set — captured submission:', {
      name: data.name,
      email: data.email,
      phone: data.phone ?? null,
      message: data.message,
    })
    return { ok: true }
  }

  try {
    const resend = getResend()

    const admin = adminEmail(data)

    // Admin notification — always sent. This is the important one.
    const adminRes = await resend.emails.send({
      from: FROM_ADDRESS,
      to: ADMIN_ADDRESS,
      replyTo: data.email,
      subject: admin.subject,
      html: admin.html,
      text: admin.text,
    })

    if (adminRes.error) {
      console.error('[contact] admin email failed:', adminRes.error)
      return {
        ok: false,
        error: 'Something went wrong sending your message. Please try again or email us directly.',
      }
    }

    // Visitor confirmation — only when a verified domain is configured.
    // On the free tier without a verified domain, Resend rejects sends to any
    // address other than the account owner's, so we skip it cleanly.
    if (HAS_VERIFIED_DOMAIN) {
      const confirm = userEmail(data)
      const userRes = await resend.emails.send({
        from: FROM_ADDRESS,
        to: data.email,
        subject: confirm.subject,
        html: confirm.html,
        text: confirm.text,
      })
      if (userRes.error) {
        // Non-fatal: the team still got the enquiry.
        console.error('[contact] confirmation email failed:', userRes.error)
      }
    }

    return { ok: true }
  } catch (err) {
    console.error('[contact] unexpected error:', err)
    return {
      ok: false,
      error: 'Something went wrong. Please try again or email us directly.',
    }
  }
}
