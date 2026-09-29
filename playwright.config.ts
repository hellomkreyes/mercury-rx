import { defineConfig, devices } from '@playwright/test';

// Runs against the production build, mobile viewports first.
export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  // CI keeps an HTML report (with the per-state screenshots) as a downloadable artifact.
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: { baseURL: 'http://localhost:4173/' },
  webServer: { command: 'npm run preview', url: 'http://localhost:4173/', reuseExistingServer: !process.env.CI },
  projects: [
    { name: 'mobile-chrome', use: { ...devices['Pixel 7'] } },
    { name: 'mobile-safari', use: { ...devices['iPhone 14'] } },
    { name: 'desktop-chrome', use: { ...devices['Desktop Chrome'] } },
    { name: 'desktop-firefox', use: { ...devices['Desktop Firefox'] } },
  ],
});
