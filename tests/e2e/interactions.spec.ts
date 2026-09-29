import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import copy from '../../src/content/copy.json' with { type: 'json' };
import data from '../../src/content/cycles.json' with { type: 'json' };

const html = (page: Page) => page.locator('html');
const button = (page: Page, name: string) => page.getByRole('button', { name, exact: true });
const oracle = (page: Page) => page.locator('#oracle');

async function open(page: Page, iso: string) {
  await page.clock.setFixedTime(new Date(iso));
  await page.goto('/');
}

test.describe('display toggles', () => {
  test('high contrast and pause motion toggle, persist and follow the OS until chosen', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await open(page, '2026-11-01T12:00:00Z');
    const contrast = button(page, copy.toggles.contrast);
    const motion = button(page, copy.toggles.motion);

    // OS says reduce motion: paused out of the box.
    await expect(motion).toHaveAttribute('aria-pressed', 'true');
    await expect(html(page)).toHaveAttribute('data-motion', 'off');
    await expect(contrast).toHaveAttribute('aria-pressed', 'false');

    await contrast.click();
    await motion.click();
    await expect(html(page)).toHaveAttribute('data-theme', 'hc');
    await expect(html(page)).toHaveAttribute('data-motion', 'on');

    // The choice survives a reload and beats the OS.
    await page.reload();
    await expect(html(page)).toHaveAttribute('data-theme', 'hc');
    await expect(html(page)).toHaveAttribute('data-motion', 'on');
    await expect(contrast).toHaveAttribute('aria-pressed', 'true');
    await expect(motion).toHaveAttribute('aria-pressed', 'false');
  });

  test('prefers-contrast: more turns on high contrast before paint', async ({ page }) => {
    await page.emulateMedia({ contrast: 'more' });
    await open(page, '2026-11-01T12:00:00Z');
    await expect(html(page)).toHaveAttribute('data-theme', 'hc');
    await expect(button(page, copy.toggles.contrast)).toHaveAttribute('aria-pressed', 'true');
  });
});

test.describe('oracle', () => {
  test('Ask again deals every card, wraps, and keeps focus', async ({ page }) => {
    await open(page, '2026-11-01T12:00:00Z');
    const cards = copy.phases.retrograde.oracle.cards;
    const ask = button(page, copy.oracle.askAgain);
    const card = page.locator('[data-slot="oracle-card"]');
    await expect(card).toHaveAttribute('aria-live', 'polite');
    const heard = card.locator('.visually-hidden'); // what screen readers get; the visible copy types out

    // Keyboard, since Safari doesn't focus buttons on click.
    await ask.focus();
    for (let i = 1; i <= cards.length; i++) {
      await page.keyboard.press('Enter');
      const n = i % cards.length;
      await expect(heard).toHaveText(cards[n]!);
      await expect(page.locator('[data-slot="oracle-count"]')).toHaveText(`Card ${n + 1} of ${cards.length}`);
    }
    await expect(ask).toBeFocused();
  });

  test('arrow keys move between choices', async ({ page }) => {
    await open(page, '2026-11-01T12:00:00Z');
    await button(page, copy.oracle.heed).focus();
    await page.keyboard.press('ArrowRight');
    await expect(button(page, copy.oracle.askAgain)).toBeFocused();
    await page.keyboard.press('ArrowRight');
    await expect(button(page, copy.oracle.heed)).toBeFocused();
    await page.keyboard.press('End');
    await expect(button(page, copy.oracle.askAgain)).toBeFocused();
  });
});

test.describe('Heed the stars', () => {
  test('opens the checklist, returns with Esc or the button, and moves focus sensibly', async ({ page }) => {
    await open(page, '2026-10-12T12:00:00Z');
    await button(page, copy.oracle.heed).click();
    const heading = page.locator('#checklist-heading');
    await expect(heading).toBeFocused();
    await expect(heading).toHaveText('Seal these before the 24th');
    await expect(oracle(page)).toHaveAttribute('aria-labelledby', 'checklist-heading');
    await expect(page.getByRole('checkbox')).toHaveCount(4);

    await page.keyboard.press('Escape');
    await expect(button(page, copy.oracle.heed)).toBeFocused();
    await expect(oracle(page)).toHaveAttribute('aria-labelledby', 'oracle-heading');

    await button(page, copy.oracle.heed).click();
    await button(page, copy.oracle.back).click();
    await expect(button(page, copy.oracle.heed)).toBeFocused();
  });

  test('ticks persist through the season and clear at the next pre-shadow', async ({ page }) => {
    const oct = data.cycles.find((c) => c.stationRx.startsWith('2026-10'))!;
    const next = data.cycles[data.cycles.indexOf(oct) + 1]!;
    const items = copy.phases.preshadow.checklist.items;

    await open(page, '2026-10-12T12:00:00Z');
    await button(page, copy.oracle.heed).click();
    await page.getByRole('checkbox', { name: items[0] }).check();
    await expect(page.locator('[data-slot="checklist-count"]')).toHaveText('1 of 4 sealed');

    // Later in the same pre-shadow: still sealed.
    await open(page, '2026-10-20T12:00:00Z');
    await button(page, copy.oracle.heed).click();
    await expect(page.getByRole('checkbox', { name: items[0] })).toBeChecked();

    // The next pre-shadow starts a fresh season.
    await open(page, new Date(Date.parse(next.preShadow) + 86_400_000).toISOString());
    await button(page, copy.oracle.heed).click();
    await expect(page.getByRole('checkbox').first()).not.toBeChecked();
    await expect(page.locator('[data-slot="checklist-count"]')).toHaveText('0 of 4 sealed');
  });

  test('the toggletip opens by keyboard and closes with Esc', async ({ page }) => {
    await open(page, '2026-11-01T12:00:00Z');
    await button(page, copy.oracle.heed).click();
    const tip = button(page, copy.oracle.whyNoResetLabel);
    await tip.focus();
    await page.keyboard.press('Enter');
    await expect(tip).toHaveAttribute('aria-expanded', 'true');
    await expect(page.locator('#why-tip')).toHaveText(copy.oracle.whyNoReset);

    // First Esc closes the tip, the second closes the checklist.
    await page.keyboard.press('Escape');
    await expect(page.locator('#why-tip')).toBeHidden();
    await expect(tip).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(button(page, copy.oracle.heed)).toBeFocused();
  });

  for (const theme of ['default', 'hc'] as const) {
    test(`${theme} theme: checklist has no serious a11y issues`, async ({ page }, testInfo) => {
      await open(page, '2026-11-01T12:00:00Z');
      if (theme === 'hc') await button(page, copy.toggles.contrast).click();
      await button(page, copy.oracle.heed).click();
      await page.getByRole('checkbox').first().check();
      await button(page, copy.oracle.whyNoResetLabel).click();
      const { violations } = await new AxeBuilder({ page }).analyze();
      expect(violations.filter((v) => v.impact === 'serious' || v.impact === 'critical').map((v) => v.id)).toEqual([]);
      await testInfo.attach(`checklist-${theme}.png`, { body: await oracle(page).screenshot(), contentType: 'image/png' });
    });
  }
});
