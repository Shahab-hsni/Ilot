import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    environment: 'node',
    globals: false,
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@scripts': path.resolve(__dirname, './scripts'),
      // `server-only` throws when imported outside an RSC. Vitest resolves
      // its client entry, so server modules guarded with it cannot be loaded
      // in a test without this stub.
      'server-only': path.resolve(__dirname, './tests/stubs/server-only.ts'),
    },
  },
})
