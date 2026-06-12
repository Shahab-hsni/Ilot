import 'server-only'

/**
 * Minimal in-memory sliding-window rate limiter.
 *
 * Free, zero-dependency baseline. Caveats:
 * - State lives in a single server instance's memory, so on serverless/multi-
 *   instance hosting each instance has its own counter and limits are softer
 *   than the configured value. It still blocks the common single-origin flood.
 * - For a hard, shared limit, swap this for Upstash Redis (also has a free tier).
 *
 * It is deliberately simple: a Map of key -> recent hit timestamps, pruned on read.
 */

type Bucket = number[]

const store = new Map<string, Bucket>()

// Bound the map so a flood of unique keys can't grow memory without limit.
const MAX_KEYS = 10_000

export interface RateLimitResult {
  success: boolean
  remaining: number
  retryAfterMs: number
}

export function rateLimit(
  key: string,
  { limit, windowMs }: { limit: number; windowMs: number }
): RateLimitResult {
  const now = Date.now()
  const cutoff = now - windowMs

  if (store.size > MAX_KEYS) {
    // Hard reset rather than risk unbounded growth. Coarse but safe.
    store.clear()
  }

  const hits = (store.get(key) ?? []).filter((t) => t > cutoff)

  if (hits.length >= limit) {
    const oldest = hits[0]
    return {
      success: false,
      remaining: 0,
      retryAfterMs: Math.max(0, oldest + windowMs - now),
    }
  }

  hits.push(now)
  store.set(key, hits)

  return { success: true, remaining: limit - hits.length, retryAfterMs: 0 }
}
