// playwright.config.ts
// P045: audit_spec.ts excluded from CI push tests — runs post-deploy only
// See QA_STANDARDS_AGENT_RULES.md Section 3.1 and 3.6
//
// Test execution strategy:
//   CI push:        api.spec.ts + hadith-verifier.spec.ts (mocked, fast)
//   Post-deploy:    audit_spec.ts (real Claude, run manually)
//   Manual @real:   npx playwright test --grep @real-api

import { defineConfig, devices } from '@playwright/test'

const BASE_URL = process.env.BASE_URL || 'http://localhost:3001'
const IS_CI    = !!process.env.CI

export default defineConfig({
  testDir: './tests',
  timeout: 90000,

  // ── P045: exclude audit_spec from CI push runs ────────────────────────────
  // audit_spec.ts calls real Claude API many times — greeting × 5 langs,
  // injection × 5 payloads, language compliance × 3 langs = 13+ real API
  // calls per run. All non-deterministic. Excluded from CI, run post-deploy.
  testIgnore: IS_CI ? ['**/audit_spec.ts'] : [],

  // Also exclude @real-api tagged tests from normal CI runs
  grep: process.env.RUN_REAL_API ? undefined : /^(?!.*@real-api)/,

  fullyParallel: true,
  forbidOnly: IS_CI,
  retries: IS_CI ? 1 : 0,
  workers: IS_CI ? 2 : undefined,

  reporter: [
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['list']
  ],

  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  ...(IS_CI ? {} : {
    webServer: {
      command: 'npm run dev',
      url: BASE_URL,
      timeout: 120000,
      reuseExistingServer: true,
    },
  }),
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    // Firefox disabled in CI — doubles run time, same failure patterns
    // Enable locally: npx playwright test --project=firefox
    ...(IS_CI ? [] : [{
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    }]),
  ],
})
