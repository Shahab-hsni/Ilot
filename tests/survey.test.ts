import { describe, it, expect } from 'vitest'
import {
  isValidEmail,
  isValidTelegram,
  normalizeTelegram,
  normalizeContact,
  validateContact,
  validateSurvey,
} from '@/lib/survey/validation'
import { EMPTY_ANSWERS, toPayload } from '@/lib/survey/answers'
import type { SurveyAnswers } from '@/lib/survey/types'

const AT = '2026-08-12T00:00:00.000Z'

function answersWith(overrides: Partial<SurveyAnswers>): SurveyAnswers {
  return { ...EMPTY_ANSWERS, ...overrides }
}

describe('normalizeTelegram', () => {
  it('strips every shape a person might paste', () => {
    for (const input of [
      'kadek_c',
      '@kadek_c',
      't.me/kadek_c',
      'https://t.me/kadek_c',
      'https://www.t.me/kadek_c',
      'telegram.me/kadek_c',
      '  @kadek_c  ',
      'https://t.me/kadek_c/',
    ]) {
      expect(normalizeTelegram(input), input).toBe('kadek_c')
    }
  })
})

describe('isValidTelegram', () => {
  it('accepts handles Telegram itself would accept', () => {
    expect(isValidTelegram('kadek')).toBe(true)
    expect(isValidTelegram('@kadek_cahya')).toBe(true)
    expect(isValidTelegram('a1b2c')).toBe(true)
    expect(isValidTelegram('a'.repeat(32))).toBe(true)
  })

  it('rejects handles Telegram would not', () => {
    expect(isValidTelegram(''), 'empty').toBe(false)
    expect(isValidTelegram('abcd'), 'too short').toBe(false)
    expect(isValidTelegram('a'.repeat(33)), 'too long').toBe(false)
    expect(isValidTelegram('1kadek'), 'starts with a digit').toBe(false)
    expect(isValidTelegram('_kadek'), 'starts with underscore').toBe(false)
    expect(isValidTelegram('kadek_'), 'ends with underscore').toBe(false)
    expect(isValidTelegram('kad__ek'), 'double underscore').toBe(false)
    expect(isValidTelegram('kadek-c'), 'hyphen').toBe(false)
    expect(isValidTelegram('kadek c'), 'space').toBe(false)
  })
})

describe('isValidEmail', () => {
  it('accepts ordinary addresses', () => {
    expect(isValidEmail('kadek@monolitlabs.ai')).toBe(true)
    expect(isValidEmail('  a.b+tag@sub.example.co.uk ')).toBe(true)
  })

  it('rejects malformed ones', () => {
    expect(isValidEmail('kadek')).toBe(false)
    expect(isValidEmail('kadek@')).toBe(false)
    expect(isValidEmail('kadek@example')).toBe(false)
    expect(isValidEmail('a b@example.com')).toBe(false)
    expect(isValidEmail(`${'a'.repeat(250)}@example.com`), 'over 254 chars').toBe(false)
  })
})

describe('validateContact', () => {
  it('asks for the method the visitor actually picked', () => {
    expect(validateContact('email', '')).toMatch(/email/i)
    expect(validateContact('telegram', '')).toMatch(/telegram/i)
  })

  it('passes a valid value of either kind', () => {
    expect(validateContact('email', 'kadek@monolitlabs.ai')).toBeUndefined()
    expect(validateContact('telegram', '@kadek_c')).toBeUndefined()
  })

  it('explains a bad value rather than just refusing', () => {
    expect(validateContact('telegram', 'abc')).toMatch(/5 and 32/)
    expect(validateContact('telegram', 'kadek-c')).toMatch(/letters/i)
    expect(validateContact('email', 'nope')).toMatch(/does not look right/)
  })
})

describe('normalizeContact', () => {
  it('lowercases emails and bares telegram handles', () => {
    expect(normalizeContact('email', '  Kadek@Monolitlabs.AI ')).toBe(
      'kadek@monolitlabs.ai'
    )
    expect(normalizeContact('telegram', 'https://t.me/Kadek_C')).toBe('Kadek_C')
  })
})

describe('toPayload', () => {
  it('flattens an email submission', () => {
    expect(
      toPayload(
        answersWith({
          contactMethod: 'email',
          email: ' Kadek@Monolitlabs.AI ',
          telegram: 'ignored_handle',
        }),
        AT
      )
    ).toEqual({
      contactMethod: 'email',
      contact: 'kadek@monolitlabs.ai',
      submittedAt: AT,
    })
  })

  it('sends only the chosen method, never both', () => {
    const payload = toPayload(
      answersWith({
        contactMethod: 'telegram',
        email: 'unused@example.com',
        telegram: '@kadek_c',
      }),
      AT
    )

    expect(payload.contact).toBe('kadek_c')
    expect(payload.contactMethod).toBe('telegram')
    expect(JSON.stringify(payload)).not.toContain('unused@example.com')
  })
})

describe('validateSurvey', () => {
  it('passes a valid submission of either kind', () => {
    expect(
      validateSurvey(answersWith({ contactMethod: 'email', email: 'k@monolitlabs.ai' }))
    ).toEqual({})
    expect(
      validateSurvey(answersWith({ contactMethod: 'telegram', telegram: 'kadek_c' }))
    ).toEqual({})
  })

  it('ignores the unselected field being invalid', () => {
    expect(
      validateSurvey(
        answersWith({
          contactMethod: 'telegram',
          email: 'this is not an email',
          telegram: 'kadek_c',
        })
      )
    ).toEqual({})
  })

  it('reports an empty contact', () => {
    expect(validateSurvey(EMPTY_ANSWERS).contact).toBeDefined()
  })
})
