/**
 * All modal copy in one place. Edit here, not in the component.
 */

// The query param that opens the modal lives in `./param` — see the note there.

export const SURVEY_COPY = {
  /** Alt text for the logo in the modal header. */
  logoAlt: 'Ilot',
  question: 'Where should we reach you?',
  hint: 'Pick one. No newsletter, no drip campaign, just a straight answer from our team.',
  emailLabel: 'Email',
  telegramLabel: 'Telegram',
  emailPlaceholder: 'you@example.com',
  telegramPlaceholder: 'username',
  submit: 'Send it.',
  done: {
    title: 'Got it.',
    body: "We'll come back to you within one business day.",
  },
} as const

/** Character caps, mirrored on the input and in validation. */
export const MAX_LENGTH = {
  email: 254,
  telegram: 32,
} as const
