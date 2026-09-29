import { defineConfig, devices } from '@playwright/test';

// Runs against the production build, mobile viewports first.
export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  reporter: process.env.CI ? 'github' : 'list',
  use: { baseURL: 'http://localhost:4173/mercury-rx/' },
  webServer: { command: 'npm run preview', url: 'http://localhost:4173/mercury-rx/', reuseExistingServer: !process.env.CI },
  projects: [
    { name: 'mobile-chrome', use: { ...devices['Pixel 7'] } },
    { name: 'mobile-safari', use: { ...devices['iPhone 14'] } },
    { name: 'desktop-chrome', use: { ...devices['Desktop Chrome'] } },
    { name: 'desktop-firefox', use: { ...devices['Desktop Firefox'] } },
  ],
});
