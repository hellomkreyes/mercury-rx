import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import copy from '../../src/content/copy.json' with { type: 'json' };

const RETROGRADE = new Date('2026-11-01T12:00:00Z');
const LAZY_ORB = /orb-anim/;
const mercuryX = (page: Page) => page.locator('[data-sprite="mercury"]').getAttribute('x');
const pause = (page: Page) => page.getByRole('button', { name: copy.toggles.motion, exact: true });

// Fake clock: GSAP's ticker, rAF and idle callbacks all advance only when we say so.
async function open(page: Page) {
  await page.clock.install({ time: RETROGRADE });
  await page.goto('/');
  await page.locator('.orb-svg').scrollIntoViewIfNeeded();
}

/** Steps the clock until `read` returns something other than `before`. */
const changes = (page: Page, read: () => Promise<unknown>, before: unknown) =>
  expect
    .poll(async () => {
      await page.clock.runFor(500);
      return read();
    }, { timeout: 10_000 })
    .not.toEqual(before);

test('the static orb shows today’s real sky and status', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await open(page);
  await expect(page.locator('.orb-svg [data-sprite]')).toHaveCount(7);
  await expect(page.locator('.visually-hidden[data-slot="orb-status"]')).toHaveText(copy.orb.backward);
  await expect(page.locator('[data-orb="date"]')).toHaveText('Nov 1');
});

test('reduced motion: GSAP is never fetched and nothing animates', async ({ page }) => {
  const fetched: string[] = [];
  page.on('request', (r) => fetched.push(r.url()));
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await open(page);
  const before = await mercuryX(page);
  await page.clock.runFor(5000);
  expect(fetched.filter((u) => LAZY_ORB.test(u))).toEqual([]);
  expect(await mercuryX(page)).toBe(before);
  await expect(page.locator('.chip-dot')).toHaveCSS('animation-name', 'none');
});

test('motion on: the orb plays, pauses in place and resumes', async ({ page }) => {
  const lazy = page.waitForRequest(LAZY_ORB);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await open(page);
  await page.clock.runFor(2500); // the idle callback that fetches GSAP
  await lazy;
  await expect(page.locator('.chip-dot')).toHaveCSS('animation-name', 'blink');

  const start = await mercuryX(page);
  await changes(page, () => mercuryX(page), start);
  await expect(page.locator('[data-orb="date"]')).not.toHaveText('Nov 1'); // the simulated calendar runs ahead

  await pause(page).click();
  await expect(page.locator('.chip-dot')).toHaveCSS('animation-name', 'none');
  const paused = await mercuryX(page);
  await page.clock.runFor(3000);
  expect(await mercuryX(page)).toBe(paused);

  await pause(page).click();
  await changes(page, () => mercuryX(page), paused);
});

test('motion on: axe finds nothing serious mid-animation', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await open(page);
  await page.clock.runFor(4000);
  const { violations } = await new AxeBuilder({ page }).analyze();
  expect(violations.filter((v) => v.impact === 'serious' || v.impact === 'critical').map((v) => v.id)).toEqual([]);
});

test('the typewriter gives screen readers the whole card at once and finishes on any key', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await open(page);
  const ask = page.getByRole('button', { name: copy.oracle.askAgain, exact: true });
  await ask.focus();
  await page.keyboard.press('Enter');

  const card = page.locator('[data-slot="oracle-card"]');
  const text = copy.phases.retrograde.oracle.cards[1]!;
  await expect(card.locator('.visually-hidden')).toHaveText(text);
  await expect(card.locator('.tw')).toHaveAttribute('aria-hidden', 'true');
  await expect(card.locator('.tw > span')).toHaveCount([...text].length);
  await expect(card.locator('.tw > span').last()).toHaveCSS('animation-name', 'type-in');

  await page.keyboard.press('Shift');
  await expect(card.locator('.tw')).toHaveClass(/tw-done/);
  await expect(card.locator('.tw > span').last()).toHaveCSS('animation-name', 'none');
});
