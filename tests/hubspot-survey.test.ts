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
  return import('@/lib/crm/hubspot-survey')
}

const OK = { ok: true, status: 200, text: async () => '' } as Response

let fetchMock: ReturnType<typeof vi.fn>

beforeEach(() => {
  fetchMock = vi.fn(async () => OK)
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
  delete process.env.HUBSPOT_PORTAL_ID
  delete process.env.HUBSPOT_FORM_GUID
})

const CONFIGURED = {
  HUBSPOT_PORTAL_ID: '12345678',
  HUBSPOT_FORM_GUID: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
}

/** The parsed request body of the Nth fetch call. */
function bodyOf(call: number) {
  return JSON.parse(fetchMock.mock.calls[call]![1]!.body as string)
}

describe('HUBSPOT_SURVEY_ENABLED', () => {
  it('is false until both env vars are present', async () => {
    expect((await loadModule({ ...CONFIGURED, HUBSPOT_FORM_GUID: undefined }))
      .HUBSPOT_SURVEY_ENABLED).toBe(false)
    expect((await loadModule({ ...CONFIGURED, HUBSPOT_PORTAL_ID: undefined }))
      .HUBSPOT_SURVEY_ENABLED).toBe(false)
  })

  it('is true once both are set', async () => {
    expect((await loadModule(CONFIGURED)).HUBSPOT_SURVEY_ENABLED).toBe(true)
  })
})

describe('submitSurveyToHubSpot', () => {
  it('is a clean no-op when unconfigured', async () => {
    const { submitSurveyToHubSpot } = await loadModule({
      HUBSPOT_PORTAL_ID: undefined,
      HUBSPOT_FORM_GUID: undefined,
    })
    await expect(
      submitSurveyToHubSpot({ contactMethod: 'email', contact: 'a@b.com' })
    ).resolves.toBeUndefined()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('posts to the tokenless Forms endpoint — no Authorization header', async () => {
    const { submitSurveyToHubSpot } = await loadModule(CONFIGURED)
    await submitSurveyToHubSpot({ contactMethod: 'email', contact: 'a@b.com' })

    const [url, init] = fetchMock.mock.calls[0]!
    expect(url).toBe(
      `https://api.hsforms.com/submissions/v3/integration/submit/${CONFIGURED.HUBSPOT_PORTAL_ID}/${CONFIGURED.HUBSPOT_FORM_GUID}`
    )
    expect(init.method).toBe('POST')
    // The whole point of using the Forms API: no credential is involved.
    expect(JSON.stringify(init.headers ?? {}).toLowerCase()).not.toContain('authorization')
  })

  it('sends the email in the `email` field', async () => {
    const { submitSurveyToHubSpot } = await loadModule(CONFIGURED)
    await submitSurveyToHubSpot({ contactMethod: 'email', contact: 'kadek@monolitlabs.ai' })
    expect(bodyOf(0).fields).toEqual([
      { name: 'email', value: 'kadek@monolitlabs.ai' },
    ])
  })

  it('sends the handle plus a synthetic email, because HubSpot requires one', async () => {
    const { submitSurveyToHubSpot } = await loadModule(CONFIGURED)
    await submitSurveyToHubSpot({ contactMethod: 'telegram', contact: 'kadek_c' })
    expect(bodyOf(0).fields).toEqual([
      { name: 'telegram', value: 'kadek_c' },
      { name: 'email', value: 'kadek_c@telegram.invalid' },
    ])
  })

  it('uses a reserved domain that can never receive mail', async () => {
    const { submitSurveyToHubSpot, telegramPlaceholderEmail } =
      await loadModule(CONFIGURED)
    // RFC 2606 reserves .invalid — it can never be registered.
    expect(telegramPlaceholderEmail('kadek_c')).toMatch(/@telegram\.invalid$/)

    await submitSurveyToHubSpot({ contactMethod: 'telegram', contact: 'kadek_c' })
    const email = bodyOf(0).fields.find((f: { name: string }) => f.name === 'email')
    expect(email.value.endsWith('@telegram.invalid')).toBe(true)
  })

  it('lower-cases the placeholder so one handle is never two contacts', async () => {
    // Telegram handles are case-insensitive: Kadek_C and kadek_c are one person.
    const { submitSurveyToHubSpot, telegramPlaceholderEmail } =
      await loadModule(CONFIGURED)
    expect(telegramPlaceholderEmail('Kadek_C')).toBe(
      telegramPlaceholderEmail('kadek_c')
    )

    await submitSurveyToHubSpot({ contactMethod: 'telegram', contact: 'Kadek_C' })
    const { fields } = bodyOf(0)
    // The handle itself keeps the casing the visitor typed.
    expect(fields.find((f: { name: string }) => f.name === 'telegram').value).toBe(
      'Kadek_C'
    )
    expect(fields.find((f: { name: string }) => f.name === 'email').value).toBe(
      'kadek_c@telegram.invalid'
    )
  })

  it('never sends a blank telegram field on an email submission', async () => {
    // A blank would wipe a real handle off an existing HubSpot contact.
    const { submitSurveyToHubSpot } = await loadModule(CONFIGURED)
    await submitSurveyToHubSpot({ contactMethod: 'email', contact: 'a@b.com' })

    const { fields } = bodyOf(0)
    expect(fields).toEqual([{ name: 'email', value: 'a@b.com' }])
    expect(fields.some((f: { value: string }) => f.value === '')).toBe(false)
  })

  it('forwards context when given and omits it when not', async () => {
    const { submitSurveyToHubSpot } = await loadModule(CONFIGURED)
    await submitSurveyToHubSpot(
      { contactMethod: 'email', contact: 'a@b.com' },
      { ipAddress: '203.0.113.9', pageName: 'Ilot Survey Intake' }
    )
    expect(bodyOf(0).context).toEqual({
      ipAddress: '203.0.113.9',
      pageName: 'Ilot Survey Intake',
    })

    await submitSurveyToHubSpot({ contactMethod: 'email', contact: 'a@b.com' })
    expect(bodyOf(1).context).toEqual({})
  })

  it("throws with HubSpot's own error body so a bad form is diagnosable", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 400,
      text: async () =>
        '{"message":"Error in \'fields\'. Invalid input JSON","errors":[{"message":"telegram is not a valid field"}]}',
    } as Response)

    const { submitSurveyToHubSpot } = await loadModule(CONFIGURED)
    await expect(
      submitSurveyToHubSpot({ contactMethod: 'telegram', contact: 'kadek_c' })
    ).rejects.toThrow(/400.*telegram is not a valid field/)
  })
})
