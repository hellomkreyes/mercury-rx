// @smoke: what a visitor would notice broken. Runs in Chromium, WebKit and Firefox.
import { test, expect } from '@playwright/test';
import { button, changes, copy, heed, konami, open } from './helpers.ts';

test.describe('smoke', { tag: '@smoke' }, () => {
  test('the page renders today’s phase under the lockup', async ({ page }) => {
    await open(page);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(copy.site.title);
    await expect(page.locator('html')).toHaveAttribute('data-phase', 'retrograde');
    await expect(page.locator('[data-slot="chip"]')).toHaveText(copy.phases.retrograde.chip);
    await expect(page.locator('[data-slot="phase-label"]')).toHaveText(copy.phases.retrograde.label);
    await expect(page.locator('.candles .candle')).toHaveCount(3);
    await expect(page.getByRole('link', { name: copy.footer.name })).toHaveAttribute('href', 'https://chibimuere.com');
  });

  test('display toggles follow the OS until chosen, then persist', async ({ page }) => {
    await page.emulateMedia({ contrast: 'more' });
    await open(page, { motion: 'reduce' });
    const html = page.locator('html');
    const contrast = page.getByRole('button', { name: copy.toggles.contrast });
    const motion = button(page, copy.toggles.motion);
    await expect(html).toHaveAttribute('data-theme', 'hc');
    await expect(html).toHaveAttribute('data-motion', 'off');

    await contrast.click();
    await motion.click();
    await page.reload();
    await expect(html).not.toHaveAttribute('data-theme', 'hc');
    await expect(html).toHaveAttribute('data-motion', 'on');
    await expect(contrast).toHaveAttribute('aria-pressed', 'false');
    await expect(motion).toHaveAttribute('aria-pressed', 'false');
  });

  test('the oracle deals cards and Heed the stars remembers ticks', async ({ page }) => {
    await open(page);
    const ask = button(page, copy.oracle.askAgain);
    await ask.focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('[data-slot="oracle-card"] .visually-hidden')).toHaveText(copy.phases.retrograde.oracle.cards[1]!);
    await expect(ask).toBeFocused();

    await heed(page);
    await page.getByRole('checkbox').first().check();
    await page.reload();
    await heed(page);
    await expect(page.getByRole('checkbox').first()).toBeChecked();
  });

  test('peering into the crystal ball starts the orb; Pause motion freezes it in place', async ({ page }) => {
    await open(page, { motion: 'no-preference', peered: false, clock: 'install' });
    await button(page, copy.veil.cta).click();
    await page.clock.runFor(600); // the mist lifts
    await expect(page.locator('.orb-svg')).toBeFocused();
    await page.clock.runFor(2500); // the idle callback that fetches GSAP

    const x = () => page.locator('[data-sprite="mercury"]').getAttribute('x');
    await changes(page, x, await x());
    await button(page, copy.toggles.motion).click();
    const paused = await x();
    await page.clock.runFor(3000);
    expect(await x()).toBe(paused);
  });

  test('the Konami code summons The Magician; Esc sends him away', async ({ page }) => {
    await open(page);
    const toggle = page.getByRole('button', { name: copy.toggles.contrast });
    await toggle.focus();
    await konami(page);
    await expect(page.locator('.toast')).toHaveText(copy.eggs.konami.toast);
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(toggle).toBeFocused();
  });

  test('the 404 page points home', async ({ page }) => {
    await page.goto('/404.html');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(copy.notFound.title);
    await expect(page.getByRole('link', { name: copy.notFound.back })).toHaveAttribute('href', '/');
  });
});

test.describe('smoke without JavaScript', { tag: '@smoke' }, () => {
  test.use({ javaScriptEnabled: false });

  test('the build-time bake is complete and the science is readable', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('data-phase', /^(direct|preshadow|retrograde|postshadow)$/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(copy.site.title);
    await expect(page.locator('[data-slot="today"]')).toContainText('UTC');
    await expect(page.locator('[data-slot="veil-why"]')).toHaveText(copy.veil.why);
    await expect(page.locator('.orb-svg')).toBeVisible();
    // Controls that need JS stay out of the way, and nothing moves.
    await expect(page.locator('.toggles')).toBeHidden();
    await expect(page.getByRole('button', { name: copy.veil.cta })).toBeHidden();
    await expect(page.locator('.chip-dot')).toHaveCSS('animation-name', 'none');
    await expect(page.locator('.credit')).toContainText(`${copy.footer.year} ${copy.footer.name} · ${copy.footer.collab}`);
  });
});
