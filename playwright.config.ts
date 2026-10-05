import { defineConfig, devices } from '@playwright/test';

/**
 * Los e2e corren contra `npm run start:mock` (MSW, sin backend ni Keycloak).
 * Por defecto usan el Chrome instalado; en CI, `PW_CHANNEL=chromium` usa el de Playwright
 * (`npx playwright install chromium`).
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env['CI'],
  retries: process.env['CI'] ? 2 : 0,
  reporter: process.env['CI'] ? 'github' : 'list',
  use: {
    baseURL: 'http://localhost:4200',
    channel: process.env['PW_CHANNEL'] ?? 'chrome',
    locale: 'es-CO',
    timezoneId: 'America/Bogota',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
  webServer: {
    command: 'npm run start:mock',
    url: 'http://localhost:4200',
    reuseExistingServer: !process.env['CI'],
    timeout: 180_000,
  },
});
