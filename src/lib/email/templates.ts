import 'server-only'

export interface ContactSubmission {
  name: string
  email: string
  phone?: string
  message: string
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

const SHELL = (heading: string, body: string) => `
<!DOCTYPE html>
<html lang="en">
  <body style="margin:0;background-color:#F4F4F0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0B0B1A;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F4F4F0;padding:32px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background-color:#FFFFFF;border-radius:16px;overflow:hidden;">
            <tr>
              <td style="background-color:#0B0B1A;padding:24px 32px;">
                <span style="color:#F5B21A;font-size:20px;font-weight:700;letter-spacing:-0.02em;">Ilot</span>
              </td>
            </tr>
            <tr>
              <td style="padding:32px;">
                <h1 style="margin:0 0 16px;font-size:22px;font-weight:700;">${heading}</h1>
                ${body}
              </td>
            </tr>
            <tr>
              <td style="padding:20px 32px;border-top:1px solid #F4F4F0;color:#64748b;font-size:12px;">
                Ilot &middot; This is an automated message.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`

const row = (label: string, value: string) => `
  <tr>
    <td style="padding:8px 0;color:#64748b;font-size:13px;width:120px;vertical-align:top;">${label}</td>
    <td style="padding:8px 0;font-size:14px;color:#0B0B1A;">${value}</td>
  </tr>`

/** Notification to the site owner with the full submission. */
export function adminEmail(s: ContactSubmission) {
  const name = escapeHtml(s.name)
  const email = escapeHtml(s.email)
  const phone = s.phone ? escapeHtml(s.phone) : '—'
  const message = escapeHtml(s.message).replace(/\n/g, '<br />')

  const html = SHELL(
    'New contact form submission',
    `<table role="presentation" cellpadding="0" cellspacing="0" width="100%">
      ${row('Name', name)}
      ${row('Email', `<a href="mailto:${email}" style="color:#F5B21A;">${email}</a>`)}
      ${row('Phone', phone)}
      ${row('Message', message)}
    </table>`
  )

  const text = [
    'New contact form submission',
    '',
    `Name:    ${s.name}`,
    `Email:   ${s.email}`,
    `Phone:   ${s.phone || '—'}`,
    '',
    'Message:',
    s.message,
  ].join('\n')

  return { html, text, subject: `New enquiry from ${s.name}` }
}

/** Confirmation to the person who submitted the form. */
export function userEmail(s: ContactSubmission) {
  const name = escapeHtml(s.name)
  const message = escapeHtml(s.message).replace(/\n/g, '<br />')

  const html = SHELL(
    `Thanks, ${name} 👋`,
    `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#0B0B1A;">
      We've received your message and will get back to you within one business day.
    </p>
    <p style="margin:0 0 8px;font-size:13px;color:#64748b;">Here's a copy of what you sent:</p>
    <div style="background-color:#F4F4F0;border-radius:12px;padding:16px;font-size:14px;line-height:1.6;color:#0B0B1A;">
      ${message}
    </div>
    <p style="margin:24px 0 0;font-size:15px;color:#0B0B1A;">— The Ilot team</p>`
  )

  const text = [
    `Thanks, ${s.name}`,
    '',
    "We've received your message and will get back to you within one business day.",
    '',
    'Here is a copy of what you sent:',
    s.message,
    '',
    '— The Ilot team',
  ].join('\n')

  return { html, text, subject: "We've received your message — Ilot" }
}
