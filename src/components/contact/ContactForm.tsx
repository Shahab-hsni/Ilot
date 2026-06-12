'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { CheckCircle2, Loader2, AlertCircle, Send } from 'lucide-react'
import { submitContact, type ContactState } from '@/app/(marketing)/contact/actions'

const initialState: ContactState = { ok: false }

const fieldBase =
  'w-full rounded-xl border bg-white px-4 py-3 text-base text-foreground placeholder:text-muted/50 ' +
  'transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-accent/60 focus:border-accent'

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-foreground px-8 py-4 text-base font-bold text-white transition-colors duration-200 hover:bg-dark disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
    >
      {pending ? (
        <>
          <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
          Sending…
        </>
      ) : (
        <>
          <Send className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
          Send message
        </>
      )}
    </button>
  )
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return (
    <p className="mt-1.5 flex items-center gap-1.5 text-sm text-red-600">
      <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      {message}
    </p>
  )
}

export function ContactForm() {
  const [state, formAction] = useActionState(submitContact, initialState)

  if (state.ok) {
    return (
      <div className="flex min-h-[420px] flex-col items-center justify-center rounded-card bg-surface p-10 text-center">
        <span className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-accent/15">
          <CheckCircle2 className="h-8 w-8 text-accent" strokeWidth={1.75} aria-hidden="true" />
        </span>
        <h2 className="mb-2 text-2xl font-bold tracking-tight">Message sent</h2>
        <p className="max-w-sm text-muted leading-relaxed">
          Thanks for reaching out — we&apos;ll get back to you within one business day.
        </p>
      </div>
    )
  }

  const errors = state.fieldErrors ?? {}

  return (
    <form
      action={formAction}
      noValidate
      className="relative rounded-card bg-surface p-6 sm:p-8 md:p-10"
    >
      <h2 className="mb-1 text-2xl font-bold tracking-tight">Send us a message</h2>
      <p className="mb-7 text-sm text-muted">
        Fields marked <span className="text-red-500" aria-hidden="true">*</span> are required.
      </p>

      {state.error && (
        <div
          role="alert"
          className="mb-6 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          {state.error}
        </div>
      )}

      <div className="space-y-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="name" className="mb-1.5 block text-sm font-semibold">
              Name <span className="text-red-500" aria-hidden="true">*</span>
            </label>
            <input
              id="name"
              name="name"
              type="text"
              autoComplete="name"
              required
              aria-required="true"
              aria-invalid={!!errors.name}
              className={`${fieldBase} ${errors.name ? 'border-red-300' : 'border-black/10'}`}
              placeholder="Jane Doe"
            />
            <FieldError message={errors.name} />
          </div>

          <div>
            <label htmlFor="email" className="mb-1.5 block text-sm font-semibold">
              Email <span className="text-red-500" aria-hidden="true">*</span>
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              aria-required="true"
              aria-invalid={!!errors.email}
              className={`${fieldBase} ${errors.email ? 'border-red-300' : 'border-black/10'}`}
              placeholder="jane@example.com"
            />
            <FieldError message={errors.email} />
          </div>
        </div>

        <div>
          <label htmlFor="phone" className="mb-1.5 block text-sm font-semibold">
            Phone <span className="font-normal text-muted">(optional)</span>
          </label>
          <input
            id="phone"
            name="phone"
            type="tel"
            autoComplete="tel"
            aria-invalid={!!errors.phone}
            className={`${fieldBase} ${errors.phone ? 'border-red-300' : 'border-black/10'}`}
            placeholder="+62 812 3456 7890"
          />
          <FieldError message={errors.phone} />
        </div>

        <div>
          <label htmlFor="message" className="mb-1.5 block text-sm font-semibold">
            Message <span className="text-red-500" aria-hidden="true">*</span>
          </label>
          <textarea
            id="message"
            name="message"
            rows={5}
            required
            aria-required="true"
            aria-invalid={!!errors.message}
            className={`${fieldBase} resize-y ${errors.message ? 'border-red-300' : 'border-black/10'}`}
            placeholder="Tell us what you need help with…"
          />
          <FieldError message={errors.message} />
        </div>
      </div>

      {/* Honeypot — hidden from users, catches naive bots. */}
      <div aria-hidden="true" className="absolute left-[-9999px] h-0 w-0 overflow-hidden">
        <label htmlFor="company">Company</label>
        <input id="company" name="company" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <div className="mt-7">
        <SubmitButton />
      </div>
    </form>
  )
}
