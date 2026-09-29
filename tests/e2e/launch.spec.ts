import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import copy from '../../src/content/copy.json' with { type: 'json' };

const RETROGRADE = new Date('2026-11-01T12:00:00Z');
const CODE = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
const seriousViolations = async (page: Page) =>
  (await new AxeBuilder({ page }).analyze()).violations.filter((v) => v.impact === 'serious' || v.impact === 'critical').map((v) => v.id);

async function open(page: Page, motion: 'reduce' | 'no-preference' = 'reduce') {
  await page.emulateMedia({ reducedMotion: motion });
  await page.clock.setFixedTime(RETROGRADE);
  await page.goto('/');
}

test('the h1 is the lockup and reads as one title', async ({ page }) => {
  await open(page);
  const h1 = page.getByRole('heading', { level: 1 });
  await expect(h1).toHaveText(copy.site.title);
  await expect(h1.locator('.title-main')).toHaveCSS('font-family', /Jersey 10/);
});

test.describe('realm gate', () => {
  test('the gate, pedestal and candles frame the orb, and step aside in high contrast', async ({ page }) => {
    await open(page);
    for (const part of ['.gate', '.pedestal', '.gate-candles-l', '.gate-candles-r']) await expect(page.locator(part)).toBeVisible();
    await expect(page.locator('.candle-sprite')).toHaveCount(4);
    await page.getByRole('button', { name: copy.toggles.contrast }).click();
    for (const part of ['.gate', '.pedestal', '.gate-candles-l', '.gate-candles-r']) await expect(page.locator(part)).toBeHidden();
  });

  test('the orb bobs and the flames flicker only while motion is on', async ({ page }) => {
    await open(page, 'no-preference');
    await expect(page.locator('.orb-float')).toHaveCSS('animation-name', 'bob');
    await expect(page.locator('.flame').first()).toHaveCSS('animation-name', 'flame');
    await page.getByRole('button', { name: copy.toggles.motion, exact: true }).click();
    await expect(page.locator('.orb-float')).toHaveCSS('animation-name', 'none');
    await expect(page.locator('.flame').first()).toHaveCSS('animation-name', 'none');
  });
});

test('the tooltip is a bubble with 24px text', async ({ page }) => {
  await open(page);
  await page.getByRole('button', { name: copy.oracle.heed, exact: true }).click();
  await page.getByRole('button', { name: copy.oracle.whyNoResetLabel }).click();
  const tip = page.locator('#why-tip');
  await expect(tip).toBeVisible();
  await expect(tip).toHaveCSS('font-size', '24px');
  await expect(tip).toHaveCSS('border-top-style', 'solid');
});

test('The Magician is bigger on desktop and fits a 1280×720 screen', async ({ page, isMobile }) => {
  test.skip(isMobile, 'Desktop size');
  await page.setViewportSize({ width: 1280, height: 720 });
  await open(page);
  for (const key of CODE) await page.keyboard.press(key);
  const dialog = page.getByRole('dialog', { name: copy.eggs.konami.name });
  await expect(dialog).toBeVisible();
  const card = (await page.locator('.summon .tarot').boundingBox())!;
  const box = (await dialog.boundingBox())!;
  expect(card.width).toBeGreaterThanOrEqual(230); // was 160px (10rem)
  expect(box.y).toBeGreaterThanOrEqual(0);
  expect(box.y + box.height).toBeLessThanOrEqual(720);
  // …and leaves room under it for the toast.
  const toast = (await page.locator('.toast').boundingBox())!;
  expect(toast.y).toBeGreaterThanOrEqual(box.y + box.height);
});

test('link previews: share card, meta tags, favicons', async ({ page, request }) => {
  await open(page);
  const meta = (property: string) => page.locator(`meta[property="${property}"]`);
  await expect(meta('og:title')).toHaveAttribute('content', copy.site.title);
  await expect(meta('og:image')).toHaveAttribute('content', /^https:\/\/rx\.chibimuere\.com\/og\.png(\?v=\d{4}-\d{2}-\d{2})?$/);
  await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute('content', 'summary_large_image');
  for (const [path, type] of [['/og.png', 'image/png'], ['/favicon.svg', 'image/svg+xml'], ['/favicon-32.png', 'image/png'], ['/apple-touch-icon.png', 'image/png']]) {
    const res = await request.get(path!);
    expect(res.status(), path).toBe(200);
    expect(res.headers()['content-type'], path).toContain(type!);
  }
});

test.describe('404: lost in retrograde', () => {
  for (const theme of ['default', 'hc'] as const) {
    test(`${theme} theme: the oracle points home, with no serious a11y issues`, async ({ page }) => {
      if (theme === 'hc') await page.addInitScript(() => localStorage.setItem('mrx:prefs', JSON.stringify({ hc: true })));
      await page.goto('/404.html');
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(copy.notFound.title);
      await expect(page.getByRole('link', { name: copy.notFound.back })).toHaveAttribute('href', '/');
      await expect(page.getByRole('link', { name: copy.footer.name })).toBeVisible();
      if (theme === 'hc') await expect(page.locator('html')).toHaveAttribute('data-theme', 'hc');
      expect(await seriousViolations(page)).toEqual([]);
    });
  }
});
