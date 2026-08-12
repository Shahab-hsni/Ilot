/** The visitor picks exactly one way to be contacted. */
export type ContactMethod = 'email' | 'telegram'

export interface SurveyAnswers {
  /** Which of the two fields below is the real answer. */
  contactMethod: ContactMethod
  /** Kept separately so toggling the method doesn't discard typing. */
  email: string
  telegram: string
}

export type SurveyErrorKey = 'contact'

export type SurveyFieldErrors = Partial<Record<SurveyErrorKey, string>>

/**
 * What actually leaves the browser. Deliberately flat and free of UI state, so
 * whatever sink we settle on (Sheets, a CRM, an inbox) can consume it as-is.
 */
export interface SurveyPayload {
  contactMethod: ContactMethod
  /** The chosen contact value, normalised. Telegram handles carry no '@'. */
  contact: string
  /** ISO 8601, stamped in the browser at submit time. */
  submittedAt: string
}
