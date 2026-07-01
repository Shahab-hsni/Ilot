# syntax=docker/dockerfile:1.7
# ─────────────────────────────────────────────────────────────────────────────
# Ilot Legal — production Dockerfile for Coolify
#
# Multi-stage build using Next.js 15 `output: 'standalone'` mode:
#   1) deps     → install node_modules with npm ci (package-lock.json is the
#                 tracked lockfile; .npmrc sets legacy-peer-deps=true)
#   2) builder  → run `next build` with NEXT_PUBLIC_* baked in from ARGs
#   3) runner   → minimal Node 20 Alpine image, runs the standalone server
#
# The `.next/cache` directory is a Coolify persistent Volume (configured in
# the dashboard → Persistent Storage tab) so ISR + on-demand revalidation
# survive container restarts.
# ─────────────────────────────────────────────────────────────────────────────

# ───── deps ─────
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Only the three files that determine npm's resolution — maximises layer cache
COPY package.json package-lock.json .npmrc ./

# `npm ci` is the reproducible install (fails if package-lock is out of sync)
RUN npm ci --no-audit --no-fund


# ───── builder ─────
FROM node:20-alpine AS builder
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Next.js bakes NEXT_PUBLIC_* values into the client bundle at build time.
# Coolify automatically injects every Environment Variable configured in the UI
# as a Docker build ARG, so we just need to declare them here.
ARG NEXT_PUBLIC_SITE_URL
ARG NEXT_PUBLIC_WA_NUMBER
ARG NEXT_PUBLIC_SANITY_PROJECT_ID
ARG NEXT_PUBLIC_SANITY_DATASET

# Re-expose as ENV so `next build` can read them
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL \
    NEXT_PUBLIC_WA_NUMBER=$NEXT_PUBLIC_WA_NUMBER \
    NEXT_PUBLIC_SANITY_PROJECT_ID=$NEXT_PUBLIC_SANITY_PROJECT_ID \
    NEXT_PUBLIC_SANITY_DATASET=$NEXT_PUBLIC_SANITY_DATASET \
    NEXT_TELEMETRY_DISABLED=1 \
    NODE_ENV=production \
    NODE_OPTIONS=--max-old-space-size=3072

RUN npm run build


# ───── runner ─────
FROM node:20-alpine AS runner
RUN apk add --no-cache libc6-compat

WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

# Non-root user for runtime
RUN addgroup -S nodejs && adduser -S nextjs -G nodejs

# Public assets
COPY --from=builder /app/public ./public

# Create the ISR cache dir owned by `nextjs` so the mounted Coolify volume
# doesn't end up with root-owned permissions that the app can't write to.
RUN mkdir -p .next/cache && chown -R nextjs:nodejs .next

# Standalone server output (includes a minimal node_modules tree)
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000

# `server.js` is emitted by `next build` when `output: 'standalone'` is set
CMD ["node", "server.js"]
