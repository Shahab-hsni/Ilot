import { normalizeContact } from './validation'
import type { SurveyAnswers, SurveyPayload } from './types'

/** The starting answers. Email is the default contact method. */
export const EMPTY_ANSWERS: SurveyAnswers = {
  contactMethod: 'email',
  email: '',
  telegram: '',
}

/** Flatten UI state into the record we would store. */
export function toPayload(answers: SurveyAnswers, submittedAt: string): SurveyPayload {
  const raw = answers.contactMethod === 'email' ? answers.email : answers.telegram

  return {
    contactMethod: answers.contactMethod,
    contact: normalizeContact(answers.contactMethod, raw),
    submittedAt,
  }
}
