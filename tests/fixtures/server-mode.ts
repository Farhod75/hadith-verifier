// tests/fixtures/server-mode.ts
// P383: which server the specs are talking to.
//
// BASE_URL: playwright.config.ts serves the MOCK_CLAUDE=1 run on :3011 and the
// plain run on :3001, but the specs build their own URLs from a BASE_URL
// constant. Each spec used to hard-code its own default (3001, or 3000 in
// severity.spec.ts), so a mock run without BASE_URL set hit the wrong port.
// One default here, matching the config.
//
// isLocalNextDev(): P364 lets the admin queue through without a session only
// under `next dev` on a localhost name. A production build served locally
// (`next start`) refuses it like the deployed site does, so "localhost" alone
// does not say which behaviour to expect. The signal is the page itself: only
// `next dev` ships the HMR client chunk. It is read from `/`, not from the
// queue, so a dev server that wrongly started refusing the queue still fails
// the 200 test instead of being treated as a production server.

import { request } from '@playwright/test'

export const BASE_URL =
  process.env.BASE_URL ||
  (process.env.MOCK_CLAUDE === '1' ? 'http://localhost:3011' : 'http://localhost:3001')

export const IS_LOCAL_BASE =
  /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?/.test(BASE_URL)

const DEV_CLIENT = /hmr-client|react-refresh|webpack-hmr/

let cached: Promise<boolean> | null = null

export function isLocalNextDev(): Promise<boolean> {
  if (!IS_LOCAL_BASE) return Promise.resolve(false)
  if (!cached) {
    cached = (async () => {
      const ctx = await request.newContext()
      try {
        const res = await ctx.get(`${BASE_URL}/`, { timeout: 60000 })
        return DEV_CLIENT.test(await res.text())
      } finally {
        await ctx.dispose()
      }
    })()
  }
  return cached
}
