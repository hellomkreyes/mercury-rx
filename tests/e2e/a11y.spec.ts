// Accessibility: one axe sweep per theme across every surface, plus the checks axe can't make. Chromium only.
import { test, expect } from '@playwright/test';
import { button, copy, heed, konami, open, seriousViolations } from './helpers.ts';

for (const theme of ['default', 'hc'] as const) {
  test(`${theme} theme: axe finds nothing serious on any surface`, async ({ page }) => {
    if (theme === 'hc') await page.addInitScript(() => localStorage.setItem('mrx:prefs', JSON.stringify({ hc: true })));
    const sweep = async (surface: string) => expect(await seriousViolations(page), surface).toEqual([]);

    await open(page, { peered: false });
    await sweep('page with the veil');
    await button(page, copy.veil.cta).click();
    await sweep('page with the orb');

    await heed(page);
    await button(page, copy.oracle.whyNoResetLabel).click();
    await sweep('checklist + tooltip');
    for (const box of await page.getByRole('checkbox').all()) await box.check();
    await expect(page.locator('.quest')).toBeVisible();
    await sweep('quest banner');
    await page.keyboard.press('Escape');

    await konami(page);
    await sweep('The Magician');
    await page.keyboard.press('Escape');

    await page.goto('/404.html');
    await sweep('404');
  });
}

test('forced colours: nothing serious, and the current segment keeps its highlight', async ({ page }) => {
  await page.emulateMedia({ forcedColors: 'active' });
  await open(page);
  // The OS palette owns colour here; axe reads authored text colours on forced backgrounds, so skip contrast.
  expect(await seriousViolations(page, ['color-contrast'])).toEqual([]);
  await expect(page.locator('.seg[data-seg="retrograde"]')).toHaveCSS('forced-color-adjust', 'none');
});

test('reflows at 320px with no horizontal scroll, veil and all', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await open(page, { peered: false });
  const overflow = () => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(await overflow()).toBeLessThanOrEqual(0);
  await button(page, copy.veil.cta).click();
  expect(await overflow()).toBeLessThanOrEqual(0);
});

test('the skip link is the first tab stop and lands on the oracle', async ({ page }) => {
  await open(page);
  await page.keyboard.press('Tab');
  const skip = page.locator('.skip');
  await expect(skip).toBeFocused();
  await expect(skip).toBeInViewport();
  await page.keyboard.press('Enter');
  await expect(page.locator('#oracle')).toBeFocused();
});

