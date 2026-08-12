/**
 * No-op stand-in for the `server-only` package.
 *
 * That package ships two entry points: importing it outside a React Server
 * Component throws by design. Vitest resolves the client entry, so any module
 * guarded with `import 'server-only'` would fail to load in a test even though
 * the guard is doing exactly its job in the app. Aliased in vitest.config.ts.
 */
export {}
