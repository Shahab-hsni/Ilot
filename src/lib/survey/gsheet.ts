import 'server-only'

/**
 * Survey intake sink: a Google Apps Script web app that appends to a sheet.
 *
 * The script itself lives in `docs/survey-sheet-apps-script.gs` — paste it into
 * the receiving spreadsheet and deploy it as a web app. Setup notes are in that
 * file.
 *
 * ── Why a webhook rather than the Sheets API ─────────────────────────────────
 *
 * The Sheets REST API needs a GCP project, a service account, a downloaded key,
 * and a JWT-signing dependency to mint tokens. An Apps Script web app needs a
 * URL and a shared secret, and the script runs as the sheet's owner so it
 * already has permission to write. For appending rows to one sheet, the second
 * is the whole job with none of the setup.
 *
 * ── Why the response body is checked, not just the status ────────────────────
 *
 * Apps Script answers 200 for almost everything, including its own internal
 * errors — a rejected secret, a thrown exception, even an HTML error page all
 * arrive as 200. `res.ok` is therefore close to meaningless here. The script
 * returns `{ok: true}` on a real append and `{ok: false, error}` otherwise, and
 * that body is the only trustworthy signal.
 *
 * (Apps Script also 302s to a googleusercontent.com URL that serves the actual
 * response. `fetch` follows redirects by default, so this needs no handling —
 * but it is why the final response is not from the deployment URL.)
 */
const WEBHOOK_URL = process.env.GSHEET_WEBHOOK_URL
const SECRET = process.env.GSHEET_SECRET

/** Both halves are needed: the URL alone would post an unauthorised payload. */
export const GSHEET_ENABLED = Boolean(WEBHOOK_URL && SECRET)

export interface SurveyRow {
  contactMethod: 'email' | 'telegram'
  /** Already normalised: emails lowercased, Telegram handles stripped of '@'. */
  contact: string
  submittedAt: string
  ipAddress?: string
}

/**
 * Append one survey answer to the sheet.
 *
 * Throws on any failure so the caller can decide what to do — for the survey
 * that is fatal, since this is the only sink and a dropped write is a lost
 * lead.
 *
 * Note on spreadsheet formula injection: a cell whose value starts with `=`,
 * `+`, `-` or `@` can be evaluated as a formula. Nothing here can produce one —
 * `validateContact` restricts Telegram handles to `[A-Za-z0-9_]` starting with
 * a letter, and emails to a shape with no leading operator. If a free-text
 * field is ever added to this payload, prefix it with `'` in the Apps Script
 * before appending.
 */
export async function appendSurveyRow(row: SurveyRow): Promise<void> {
  if (!GSHEET_ENABLED) return

  const res = await fetch(WEBHOOK_URL!, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ secret: SECRET, ...row }),
  })

  const text = await res.text().catch(() => '')

  if (!res.ok) {
    throw new Error(`Sheet append failed (${res.status}): ${text}`)
  }

  // A non-JSON body means the deployment URL is wrong, the deployment was
  // deleted, or Google served an error page. Say which, rather than letting a
  // parse error surface with no context.
  let parsed: { ok?: boolean; error?: string }
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new Error(
      `Sheet append returned a non-JSON response — check GSHEET_WEBHOOK_URL points at a live deployment: ${text.slice(0, 200)}`
    )
  }

  if (!parsed.ok) {
    throw new Error(`Sheet append rejected: ${parsed.error ?? 'unknown error'}`)
  }
}
