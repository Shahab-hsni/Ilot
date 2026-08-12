/**
 * Survey intake modal — acceptance checks.
 *
 * Not part of `npm test` (that suite is vitest/node and has no browser).
 * Playwright is intentionally NOT a project dependency; run this on demand:
 *
 *   npm i --no-save playwright@1.62.1        # not saved to package.json
 *   npx playwright install chromium          # first time only
 *   npm run build && npx next start -p 3010 &
 *   BASE=http://localhost:3010 node tests/e2e/survey-acceptance.mjs
 *
 * Exits non-zero if any check fails. Covers the behaviours that are easy to
 * regress: the home page staying free of the modal chunk, the param being
 * stripped, scroll lock, Escape, and the email/Telegram either-or.
 *
 * Remember `rm -rf .next` before going back to `npm run dev` — `next build`
 * and `next dev` share that directory and their chunk ids do not match.
 */
import { chromium } from 'playwright'

const BASE = process.env.BASE ?? 'http://localhost:3010'
const results = []
const check = (name, pass, detail = '') => {
  results.push({ name, pass, detail })
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`)
}

const browser = await chromium.launch()

/* ── 1. Home page without the param ─────────────────────────────────────── */
{
  const page = await browser.newPage()
  const scripts = []
  page.on('request', (r) => {
    if (r.resourceType() === 'script') scripts.push(r.url())
  })
  await page.goto(BASE, { waitUntil: 'load' })
  await page.waitForTimeout(2500)
  const dialogs = await page.locator('[role="dialog"]').count()
  const bodyText = await page.locator('body').innerText()
  check('home: no dialog rendered', dialogs === 0)
  check(
    'home: modal copy absent from the page bundle',
    !bodyText.includes('Where should we reach you'),
  )
  check('home: scripts loaded', scripts.length > 0, `${scripts.length} chunks`)
  await page.close()
}

/* ── 2. With the param ──────────────────────────────────────────────────── */
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
const xhr = []
page.on('request', (r) => {
  if (['xhr', 'fetch'].includes(r.resourceType())) xhr.push(`${r.method()} ${r.url()}`)
})

await page.goto(`${BASE}/?survey_intake_form=true`, { waitUntil: 'load' })
const dialog = page.locator('[role="dialog"]')
await dialog.waitFor({ state: 'visible', timeout: 15000 })
check('param: modal opens', true)
check('param: stripped from URL', !page.url().includes('survey_intake_form'), page.url())

check(
  'scroll lock: body overflow hidden',
  (await page.evaluate(() => getComputedStyle(document.body).overflow)) === 'hidden',
)

check(
  'the field is focused on open',
  await page.evaluate(() => document.activeElement?.id === 'survey-contact'),
)

check('exactly one contact input', (await page.locator('#survey-contact').count()) === 1)

/* ── 3. Validation ──────────────────────────────────────────────────────── */
let before = xhr.length
await page.getByRole('button', { name: /send it/i }).click()
await page.waitForTimeout(300)
check('empty submit shows a reason', (await page.getByRole('alert').count()) > 0)
check('empty submit sends nothing', xhr.length === before)

await page.locator('#survey-contact').fill('not-an-email')
await page.getByRole('button', { name: /send it/i }).click()
await page.waitForTimeout(300)
check(
  'bad email shows a visible reason',
  !!(await page.getByRole('alert').first().textContent())?.trim(),
  (await page.getByRole('alert').first().textContent())?.trim(),
)

/* ── 4. Either-or ───────────────────────────────────────────────────────── */
await page.getByRole('radio', { name: 'Telegram' }).click()
check(
  'toggling method swaps the field (draft kept per method)',
  (await page.locator('#survey-contact').inputValue()) === '',
)
// Focus is moved on the next animation frame, so let one pass before asserting.
await page.waitForTimeout(150)
check(
  'focus follows the toggle',
  await page.evaluate(() => document.activeElement?.id === 'survey-contact'),
)

await page.locator('#survey-contact').fill('ab')
await page.getByRole('button', { name: /send it/i }).click()
await page.waitForTimeout(300)
check(
  'bad telegram handle shows a visible reason',
  !!(await page.getByRole('alert').first().textContent())?.trim(),
  (await page.getByRole('alert').first().textContent())?.trim(),
)

await page.getByRole('radio', { name: 'Email' }).click()
check(
  'switching back restores the earlier draft',
  (await page.locator('#survey-contact').inputValue()) === 'not-an-email',
)
await page.getByRole('radio', { name: 'Telegram' }).click()

/* ── 5. Submit ──────────────────────────────────────────────────────────── */
await page.locator('#survey-contact').fill('https://t.me/kadek_c')
before = xhr.length
await page.getByRole('button', { name: /send it/i }).click()
await page.getByText('Got it.').waitFor({ timeout: 5000 })
check('valid submit reaches the success state', true)
check(
  'submit sends no network request (sink not wired yet)',
  xhr.length === before,
  xhr.slice(before).join(', ') || 'none',
)

/* ── 6. Escape and refresh ──────────────────────────────────────────────── */
await page.reload({ waitUntil: 'load' })
await page.waitForTimeout(600)
check(
  'refresh does not reopen the survey',
  (await page.locator('[role="dialog"]').count()) === 0,
)

await page.goto(`${BASE}/?survey_intake_form=true`, { waitUntil: 'load' })
await dialog.waitFor({ state: 'visible', timeout: 15000 })
await page.keyboard.press('Escape')
await page.waitForTimeout(300)
check('Escape closes the survey', (await dialog.count()) === 0)

/* ── 7. Reduced motion still renders every final state ──────────────────── */
{
  const rm = await browser.newPage()
  await rm.emulateMedia({ reducedMotion: 'reduce' })
  await rm.goto(`${BASE}/?survey_intake_form=true`, { waitUntil: 'load' })
  await rm.locator('[role="dialog"]').waitFor({ state: 'visible', timeout: 15000 })
  const opacity = await rm
    .locator('[role="dialog"] > div')
    .last()
    .evaluate((el) => getComputedStyle(el).opacity)
  check('reduced motion: sheet is fully visible', opacity === '1', `opacity ${opacity}`)
  await rm.locator('#survey-contact').fill('kadek@monolitlabs.ai')
  await rm.getByRole('button', { name: /send it/i }).click()
  await rm.getByText('Got it.').waitFor({ timeout: 5000 })
  check('reduced motion: flow still completes', true)
  await rm.close()
}

await browser.close()

const failed = results.filter((r) => !r.pass)
console.log(`\n${results.length - failed.length}/${results.length} checks passed`)
if (failed.length) {
  console.log('FAILED:', failed.map((f) => f.name).join(' | '))
  process.exit(1)
}
