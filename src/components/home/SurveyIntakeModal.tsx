'use client'

import { useEffect, useId, useRef, useState } from 'react'
import Image from 'next/image'
import { motion, useReducedMotion } from 'framer-motion'
import { AlertCircle, CheckCircle2, Loader2, Send, X } from 'lucide-react'
import { MAX_LENGTH, SURVEY_COPY } from '@/lib/survey/constants'
import { EMPTY_ANSWERS, toPayload } from '@/lib/survey/answers'
import { validateSurvey } from '@/lib/survey/validation'
import { submitSurvey } from '@/lib/survey/submit'
import { trackSurveyEvent } from '@/lib/survey/analytics'
import type {
  ContactMethod,
  SurveyAnswers,
  SurveyFieldErrors,
} from '@/lib/survey/types'

type Status = 'idle' | 'sending' | 'done'

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'

export default function SurveyIntakeModal({ onClose }: { onClose: () => void }) {
  const [answers, setAnswers] = useState<SurveyAnswers>(EMPTY_ANSWERS)
  const [errors, setErrors] = useState<SurveyFieldErrors>({})
  const [status, setStatus] = useState<Status>('idle')

  const panelRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const reduceMotion = useReducedMotion()

  const titleId = useId()
  const errorId = useId()

  const isEmail = answers.contactMethod === 'email'
  const value = isEmail ? answers.email : answers.telegram

  useEffect(() => {
    trackSurveyEvent('survey_opened')
  }, [])

  // Lock the page behind the sheet. Restores whatever was there before rather
  // than blindly clearing, so we don't stomp another lock.
  useEffect(() => {
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [])

  // There is one field, so put the caret in it.
  useEffect(() => {
    inputRef.current?.focus({ preventScroll: true })
  }, [])

  /**
   * Escape closes the sheet, and Tab is trapped inside it.
   *
   * A document-level listener rather than a React handler: the App Router
   * hydrates the whole document, so both would share a target and
   * stopPropagation() cannot stop a same-target listener. One owner only.
   */
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
        return
      }

      if (event.key === 'Tab' && panelRef.current) {
        const focusable = Array.from(
          panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)
        ).filter((el) => el.offsetParent !== null)
        if (focusable.length === 0) return

        const first = focusable[0]!
        const last = focusable[focusable.length - 1]!
        const active = document.activeElement

        if (event.shiftKey && (active === first || !panelRef.current.contains(active))) {
          event.preventDefault()
          last.focus()
        } else if (!event.shiftKey && active === last) {
          event.preventDefault()
          first.focus()
        }
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  function setContactMethod(method: ContactMethod) {
    setAnswers((current) => ({ ...current, contactMethod: method }))
    setErrors({})
    trackSurveyEvent('survey_contact_method', { method })
    // The field swaps under the caret; keep focus where the visitor is typing.
    requestAnimationFrame(() => inputRef.current?.focus({ preventScroll: true }))
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (status === 'sending') return

    // Honeypot: bots fill hidden fields, humans don't. Show the success state so
    // the bot gets no signal to retry.
    const honeypot = String(new FormData(event.currentTarget).get('company') ?? '')
    if (honeypot.trim()) {
      setStatus('done')
      return
    }

    const fieldErrors = validateSurvey(answers)
    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors)
      inputRef.current?.focus({ preventScroll: true })
      return
    }

    setErrors({})
    setStatus('sending')

    const result = await submitSurvey(toPayload(answers, new Date().toISOString()))

    if (!result.ok) {
      setStatus('idle')
      setErrors({ contact: result.error })
      return
    }

    trackSurveyEvent('survey_completed', { contact_method: answers.contactMethod })
    setStatus('done')
  }

  return (
    <div
      className="fixed inset-0 z-[2000] flex items-end justify-center sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      {/* Overlay */}
      <motion.button
        type="button"
        aria-label="Close"
        onClick={onClose}
        initial={reduceMotion ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2 }}
        className="absolute inset-0 h-full w-full cursor-default bg-foreground/60 backdrop-blur-sm"
      />

      {/* Sheet — bottom-anchored on mobile, hugging its content. Never give this
          a fixed height "to stabilise it": that leaves a band of dead air
          between the field and the footer. */}
      <motion.div
        ref={panelRef}
        tabIndex={-1}
        initial={reduceMotion ? false : { y: 24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        className="relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-card bg-surface shadow-2xl sm:max-w-xl sm:rounded-card"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 px-6 pt-6 sm:px-8 sm:pt-8">
          {/*
            The same asset and intrinsic size the Navbar uses. Not `priority`:
            the modal only mounts for campaign visitors, long after the page has
            painted, so preloading it would cost every other visitor a request.
          */}
          <Image
            src="/logos/Ilot-Logo.svg"
            alt={SURVEY_COPY.logoAlt}
            width={120}
            height={40}
            className="h-8 w-auto"
          />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="-mr-1 -mt-1 flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full text-muted transition-colors duration-200 motion-reduce:transition-none hover:bg-black/5 hover:text-foreground"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {status === 'done' ? (
          <div className="flex flex-col items-center px-6 py-14 text-center sm:px-8">
            <span className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-accent/15">
              <CheckCircle2
                className="h-8 w-8 text-accent"
                strokeWidth={1.75}
                aria-hidden="true"
              />
            </span>
            <h2 id={titleId} className="mb-2 text-2xl font-bold tracking-tight">
              {SURVEY_COPY.done.title}
            </h2>
            <p className="max-w-sm leading-relaxed text-muted">
              {SURVEY_COPY.done.body}
            </p>
            <button
              type="button"
              onClick={onClose}
              className="mt-8 cursor-pointer rounded-full border border-black/15 px-7 py-3 text-base font-semibold transition-colors duration-200 motion-reduce:transition-none hover:border-foreground"
            >
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate className="flex min-h-0 flex-1 flex-col">
            <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto px-6 pb-2 pt-4 sm:px-8">
              <h2 id={titleId} className="mb-2 text-2xl font-bold tracking-tight">
                {SURVEY_COPY.question}
              </h2>
              <p className="mb-6 leading-relaxed text-muted">{SURVEY_COPY.hint}</p>

              {/* Method toggle — one or the other, never both. */}
              <div
                role="radiogroup"
                aria-label="Contact method"
                className="mb-4 grid grid-cols-2 gap-2 rounded-2xl bg-black/5 p-1.5"
              >
                {(['email', 'telegram'] as const).map((method) => (
                  <button
                    key={method}
                    type="button"
                    role="radio"
                    aria-checked={answers.contactMethod === method}
                    onClick={() => setContactMethod(method)}
                    className={`cursor-pointer rounded-xl px-4 py-2.5 text-base font-semibold transition-colors duration-200 motion-reduce:transition-none ${
                      answers.contactMethod === method
                        ? 'bg-white shadow-sm'
                        : 'text-muted hover:text-foreground'
                    }`}
                  >
                    {method === 'email'
                      ? SURVEY_COPY.emailLabel
                      : SURVEY_COPY.telegramLabel}
                  </button>
                ))}
              </div>

              <label htmlFor="survey-contact" className="sr-only">
                {isEmail ? SURVEY_COPY.emailLabel : SURVEY_COPY.telegramLabel}
              </label>
              <div
                className={`flex items-center rounded-2xl border bg-white transition-colors duration-200 motion-reduce:transition-none focus-within:ring-2 focus-within:ring-accent/60 ${
                  errors.contact ? 'border-red-300' : 'border-black/10'
                }`}
              >
                {!isEmail && (
                  <span aria-hidden="true" className="pl-5 text-base font-semibold text-muted">
                    @
                  </span>
                )}
                <input
                  ref={inputRef}
                  id="survey-contact"
                  type={isEmail ? 'email' : 'text'}
                  inputMode={isEmail ? 'email' : 'text'}
                  autoComplete={isEmail ? 'email' : 'off'}
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  value={value}
                  // Same cap for both: a Telegram handle is at most 32
                  // characters, but people paste `https://t.me/name`, which
                  // normalizeTelegram() strips before validating.
                  maxLength={MAX_LENGTH.email}
                  onChange={(event) => {
                    const next = event.target.value
                    setAnswers((current) =>
                      current.contactMethod === 'email'
                        ? { ...current, email: next }
                        : { ...current, telegram: next }
                    )
                    setErrors({})
                  }}
                  placeholder={
                    isEmail
                      ? SURVEY_COPY.emailPlaceholder
                      : SURVEY_COPY.telegramPlaceholder
                  }
                  aria-invalid={!!errors.contact}
                  aria-describedby={errors.contact ? errorId : undefined}
                  className={`w-full bg-transparent py-4 pr-5 text-base placeholder:text-muted/50 focus:outline-none ${
                    isEmail ? 'pl-5' : 'pl-1'
                  }`}
                />
              </div>

              {/* Errors need somewhere to live — without a dedicated line the
                  sheet just shows a red border and a button that silently
                  refuses. */}
              {errors.contact && (
                <p
                  id={errorId}
                  role="alert"
                  className="mt-2.5 flex items-center gap-1.5 text-sm text-red-600"
                >
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  {errors.contact}
                </p>
              )}

              {/* Honeypot — off-screen, hidden from assistive tech. */}
              <div
                aria-hidden="true"
                className="absolute left-[-9999px] h-0 w-0 overflow-hidden"
              >
                <label htmlFor="survey-company">Company</label>
                <input
                  id="survey-company"
                  name="company"
                  type="text"
                  tabIndex={-1}
                  autoComplete="off"
                />
              </div>
            </div>

            {/* Footer — pinned to the bottom of the sheet with margin-top:auto. */}
            <div className="mt-auto flex justify-end px-6 pb-6 pt-5 sm:px-8 sm:pb-8">
              <button
                type="submit"
                disabled={status === 'sending'}
                className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-foreground px-7 py-3.5 text-base font-bold text-white transition-colors duration-200 motion-reduce:transition-none hover:bg-dark disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
              >
                {status === 'sending' ? (
                  <>
                    <Loader2
                      className="h-4 w-4 animate-spin motion-reduce:animate-none"
                      aria-hidden="true"
                    />
                    Sending…
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
                    {SURVEY_COPY.submit}
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </motion.div>
    </div>
  )
}
