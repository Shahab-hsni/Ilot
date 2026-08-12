/**
 * Thin wrapper over the gtag.js queue set up by
 * `src/components/analytics/GoogleAnalytics.tsx`.
 *
 * That component renders nothing outside NODE_ENV=production, so in dev
 * `window.gtag` is simply absent and every call here is a no-op. Never throws,
 * so an ad blocker can't break the survey flow.
 */

type EventParams = Record<string, string | number | boolean>

type GtagWindow = Window & {
  gtag?: (command: 'event', name: string, params?: EventParams) => void
}

export function trackSurveyEvent(name: string, params?: EventParams): void {
  if (typeof window === 'undefined') return
  try {
    ;(window as GtagWindow).gtag?.('event', name, params)
  } catch {
    // Analytics must never take the form down with it.
  }
}
