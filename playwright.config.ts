import { defineConfig, devices } from '@playwright/test';

// Two tiers, so each browser only runs what it can uniquely break:
// - Chromium on a phone runs everything except @desktop (the full suite).
// - WebKit (iPhone) and Firefox run the @smoke paths a visitor would notice.
// - Chromium on a desktop runs the @desktop layouts.
export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  // CI keeps an HTML report (with the screenshot gallery) as a downloadable artifact.
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: { baseURL: 'http://localhost:4173/' },
  webServer: { command: 'npm run preview', url: 'http://localhost:4173/', reuseExistingServer: !process.env.CI },
  projects: [
    { name: 'chromium-phone', use: { ...devices['Pixel 7'] }, grepInvert: /@desktop/ },
    { name: 'webkit-phone', use: { ...devices['iPhone 14'] }, grep: /@smoke/ },
    { name: 'firefox-desktop', use: { ...devices['Desktop Firefox'] }, grep: /@smoke/ },
    { name: 'chromium-desktop', use: { ...devices['Desktop Chrome'] }, grep: /@desktop/ },
  ],
});
