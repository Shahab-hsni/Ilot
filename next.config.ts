import type { NextConfig } from 'next'
import path from 'path'
import { sep } from 'path'

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { NormalModuleReplacementPlugin } = require('webpack')

const nextConfig: NextConfig = {
  // Emit a self-contained server bundle at `.next/standalone` so the
  // production Docker image only needs Node + that folder (no full
  // node_modules). Required by the Dockerfile in the repo root (Coolify).
  output: 'standalone',
  eslint: { ignoreDuringBuilds: true },
  // The build host runs ~35 other containers alongside the build with no
  // swap configured, so `next build`'s default multi-worker static-generation
  // pass can push the process over the box's available RAM and get SIGKILLed
  // with no error output. Capping to a single worker trades build speed for a
  // much lower, steadier peak RSS.
  experimental: { cpus: 1 },
  webpack: (config) => {
    // Sanity's ESM chunks do `import { useEffectEvent } from 'react'`.
    // React 19's index.js is a CJS conditional-require shim that webpack
    // cannot statically enumerate named exports from (including useEffectEvent).
    //
    // Fix: when a Sanity file resolves 'react', redirect it to our .mjs shim.
    // The shim does explicit `export const useEffectEvent = _React.useEffectEvent`
    // so webpack can find the named export at build time.  The shim itself
    // imports from 'react' outside the sanity context, so it gets the real
    // React module — preserving module identity and React context.
    config.plugins.push(
      new NormalModuleReplacementPlugin(
        /^react$/,
        (resource: { context?: string; request: string }) => {
          const isSanityContext =
            resource.context &&
            (resource.context.includes(`node_modules${sep}sanity`) ||
              resource.context.includes(`node_modules${sep}@sanity`))
          if (isSanityContext) {
            resource.request = path.resolve('./src/lib/react-shim.mjs')
          }
        }
      )
    )

    // Sanity bundles are pre-compiled with React Compiler and do
    // `import { c } from 'react/compiler-runtime'`. That entry is a CJS
    // conditional require so webpack can't statically enumerate `c`,
    // and it resolves to undefined → "is not a function" at runtime
    // (e.g. structure tool crashing when opening a document form).
    // Redirect to a shim that explicitly re-exports `c`. Skip the shim
    // file itself to avoid infinite recursion.
    config.plugins.push(
      new NormalModuleReplacementPlugin(
        /^react\/compiler-runtime$/,
        (resource: { context?: string; request: string }) => {
          const isShimItself =
            resource.context && resource.context.includes(`src${sep}lib`)
          if (!isShimItself) {
            resource.request = path.resolve(
              './src/lib/react-compiler-runtime-shim.mjs'
            )
          }
        }
      )
    )
    return config
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cdn.sanity.io',
      },
    ],
  },
}

export default nextConfig
