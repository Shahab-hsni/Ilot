import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

/**
 * The env vars are read at module load, so each test sets them and then imports
 * the module fresh via `vi.resetModules()` + dynamic import.
 */
async function loadModule(env: Record<string, string | undefined>) {
  vi.resetModules()
  for (const [key, value] of Object.entries(env)) {
    if (value === undefined) delete process.env[key]
    else process.env[key] = value
  }
  return import('@/lib/survey/gsheet')
}

/** Apps Script answers 200 for everything; the body is the real signal. */
const scriptSays = (body: unknown) =>
  ({ ok: true, status: 200, text: async () => JSON.stringify(body) }) as Response

let fetchMock: ReturnType<typeof vi.fn>

beforeEach(() => {
  fetchMock = vi.fn(async () => scriptSays({ ok: true }))
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
  delete process.env.GSHEET_WEBHOOK_URL
  delete process.env.GSHEET_SECRET
})

const CONFIGURED = {
  GSHEET_WEBHOOK_URL: 'https://script.google.com/macros/s/AKfy-test/exec',
  GSHEET_SECRET: 'a-long-random-string',
}

const ROW = {
  contactMethod: 'telegram' as const,
  contact: 'tel_monolit',
  submittedAt: '2026-08-12T09:40:21.831Z',
  ipAddress: '203.0.113.9',
}

function bodyOf(call: number) {
  return JSON.parse(fetchMock.mock.calls[call]![1]!.body as string)
}

describe('GSHEET_ENABLED', () => {
  it('needs both the URL and the secret', async () => {
    // The URL alone would post a payload the script rejects anyway.
    expect(
      (await loadModule({ ...CONFIGURED, GSHEET_SECRET: undefined })).GSHEET_ENABLED
    ).toBe(false)
    expect(
      (await loadModule({ ...CONFIGURED, GSHEET_WEBHOOK_URL: undefined }))
        .GSHEET_ENABLED
    ).toBe(false)
    expect((await loadModule(CONFIGURED)).GSHEET_ENABLED).toBe(true)
  })
})

describe('appendSurveyRow', () => {
  it('is a clean no-op when unconfigured', async () => {
    const { appendSurveyRow } = await loadModule({
      GSHEET_WEBHOOK_URL: undefined,
      GSHEET_SECRET: undefined,
    })
    await expect(appendSurveyRow(ROW)).resolves.toBeUndefined()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('posts the row and the secret to the deployment URL', async () => {
    const { appendSurveyRow } = await loadModule(CONFIGURED)
    await appendSurveyRow(ROW)

    const [url, init] = fetchMock.mock.calls[0]!
    expect(url).toBe(CONFIGURED.GSHEET_WEBHOOK_URL)
    expect(init.method).toBe('POST')
    expect(bodyOf(0)).toEqual({ secret: CONFIGURED.GSHEET_SECRET, ...ROW })
  })

  it('resolves when the script reports a real append', async () => {
    const { appendSurveyRow } = await loadModule(CONFIGURED)
    await expect(appendSurveyRow(ROW)).resolves.toBeUndefined()
  })

  it('throws on {ok:false} even though the status is 200', async () => {
    // The whole reason the body is checked: Apps Script returns 200 for its own
    // failures, so res.ok alone would report a lost lead as a success.
    fetchMock.mockResolvedValueOnce(
      scriptSays({ ok: false, error: 'unauthorized' })
    )
    const { appendSurveyRow } = await loadModule(CONFIGURED)
    await expect(appendSurveyRow(ROW)).rejects.toThrow(/rejected.*unauthorized/)
  })

  it('names the likely cause when Google serves an HTML error page', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: async () => '<!DOCTYPE html><title>Error 404</title>',
    } as Response)
    const { appendSurveyRow } = await loadModule(CONFIGURED)
    await expect(appendSurveyRow(ROW)).rejects.toThrow(/non-JSON[\s\S]*GSHEET_WEBHOOK_URL/)
  })

  it('throws on a non-2xx', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 500,
      text: async () => 'boom',
    } as Response)
    const { appendSurveyRow } = await loadModule(CONFIGURED)
    await expect(appendSurveyRow(ROW)).rejects.toThrow(/500.*boom/)
  })

  it('sends email submissions in the same shape', async () => {
    const { appendSurveyRow } = await loadModule(CONFIGURED)
    await appendSurveyRow({ ...ROW, contactMethod: 'email', contact: 'a@b.com' })
    expect(bodyOf(0).contactMethod).toBe('email')
    expect(bodyOf(0).contact).toBe('a@b.com')
  })
})
