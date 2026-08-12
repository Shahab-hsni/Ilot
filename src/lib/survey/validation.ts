import { MAX_LENGTH } from './constants'
import type { ContactMethod, SurveyAnswers, SurveyFieldErrors } from './types'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * Telegram's own rule: 5–32 characters, letters/digits/underscores, must start
 * with a letter. Telegram additionally rejects trailing and doubled
 * underscores, so we do too — better to say so here than to hand someone a
 * handle that doesn't resolve.
 */
const TELEGRAM_RE = /^[a-zA-Z][a-zA-Z0-9_]{3,30}[a-zA-Z0-9]$/

export function isValidEmail(value: string): boolean {
  const trimmed = value.trim()
  return trimmed.length <= MAX_LENGTH.email && EMAIL_RE.test(trimmed)
}

/**
 * Accept every shape a person might paste and reduce it to the bare handle:
 *   @kadek · kadek · t.me/kadek · https://t.me/kadek · telegram.me/kadek
 */
export function normalizeTelegram(value: string): string {
  return value
    .trim()
    .replace(/^https?:\/\//i, '')
    .replace(/^(?:www\.)?(?:t|telegram)\.me\//i, '')
    .replace(/^@/, '')
    .replace(/\/+$/, '')
    .trim()
}

export function isValidTelegram(value: string): boolean {
  const handle = normalizeTelegram(value)
  if (!TELEGRAM_RE.test(handle)) return false
  // Telegram disallows consecutive underscores.
  return !handle.includes('__')
}

/** The contact value we would actually store, normalised. */
export function normalizeContact(method: ContactMethod, value: string): string {
  return method === 'email' ? value.trim().toLowerCase() : normalizeTelegram(value)
}

export function validateContact(
  method: ContactMethod,
  value: string
): string | undefined {
  const trimmed = value.trim()

  if (!trimmed) {
    return method === 'email'
      ? 'Please enter your email address.'
      : 'Please enter your Telegram username.'
  }

  if (method === 'email') {
    return isValidEmail(trimmed) ? undefined : 'That email address does not look right.'
  }

  const handle = normalizeTelegram(trimmed)
  if (handle.length < 5 || handle.length > MAX_LENGTH.telegram) {
    return 'Telegram usernames are between 5 and 32 characters.'
  }
  if (!isValidTelegram(trimmed)) {
    return 'Use letters, numbers and underscores, starting with a letter.'
  }
  return undefined
}

/** Full-answers check, used as the last gate before submit. */
export function validateSurvey(answers: SurveyAnswers): SurveyFieldErrors {
  const errors: SurveyFieldErrors = {}

  const value = answers.contactMethod === 'email' ? answers.email : answers.telegram
  const contactError = validateContact(answers.contactMethod, value)
  if (contactError) errors.contact = contactError

  return errors
}
