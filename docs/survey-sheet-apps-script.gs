/**
 * Survey intake → Google Sheets.
 *
 * Paste this into the receiving spreadsheet: Extensions → Apps Script, replace
 * the default Code.gs contents, set SECRET below, then Deploy → New deployment
 * → Web app, with:
 *
 *   Execute as:       Me
 *   Who has access:   Anyone
 *
 * "Anyone" is required — the Next.js server calls this without a Google
 * identity. The URL is unguessable, and SECRET is what actually authorises the
 * write, so an unauthenticated deployment is not an open door.
 *
 * Copy the deployment URL into GSHEET_WEBHOOK_URL and this SECRET into
 * GSHEET_SECRET in the app's environment. The two must match or every write is
 * rejected.
 *
 * ⚠️ Re-deploying: use Deploy → Manage deployments → edit the EXISTING one and
 * bump its version. Creating a new deployment issues a NEW URL and silently
 * leaves the app posting to the old one.
 */

/** Must match GSHEET_SECRET in the app environment. Use a long random string. */
const SECRET = 'REPLACE_ME_WITH_A_LONG_RANDOM_STRING'

const SHEET_NAME = 'Responses'
const HEADERS = ['Submitted at', 'Contact method', 'Contact', 'IP address']

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return json({ ok: false, error: 'empty request body' })
    }

    const body = JSON.parse(e.postData.contents)

    // Compared before anything is written, so an unauthorised caller cannot
    // append a row or learn anything about the sheet.
    if (body.secret !== SECRET) {
      return json({ ok: false, error: 'unauthorized' })
    }

    // Two submissions arriving at once would otherwise compute the same target
    // row and one would overwrite the other. The lock serialises appends.
    const lock = LockService.getScriptLock()
    lock.waitLock(20000)
    try {
      const sheet = getSheet()
      sheet.appendRow([
        body.submittedAt || new Date().toISOString(),
        body.contactMethod || '',
        body.contact || '',
        body.ipAddress || '',
      ])
    } finally {
      lock.releaseLock()
    }

    return json({ ok: true })
  } catch (err) {
    // Returned rather than thrown: the caller checks this body, and a thrown
    // error would surface as an HTML error page it cannot parse.
    return json({ ok: false, error: String(err) })
  }
}

/** The Responses sheet, created with headers on first use. */
function getSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet()
  let sheet = ss.getSheetByName(SHEET_NAME)

  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME)
  }
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS)
    sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold')
    sheet.setFrozenRows(1)
  }

  return sheet
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON
  )
}
