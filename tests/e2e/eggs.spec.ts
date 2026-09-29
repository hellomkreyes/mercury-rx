import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import copy from '../../src/content/copy.json' with { type: 'json' };

const RETROGRADE = new Date('2026-11-01T12:00:00Z');
const CODE = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
const EGG_CHUNK = /egg-show/;
const { quest, konami } = copy.eggs;

const announced = (page: Page) => page.locator('[data-egg-announce]');
const magician = (page: Page) => page.getByRole('dialog', { name: konami.name });

async function open(page: Page, motion: 'reduce' | 'no-preference') {
  await page.emulateMedia({ reducedMotion: motion });
  await page.clock.install({ time: RETROGRADE });
  await page.goto('/');
}

async function sealAll(page: Page) {
  await page.getByRole('button', { name: copy.oracle.heed, exact: true }).click();
  await expect(page.locator('#checklist-heading')).toBeFocused();
  for (const box of await page.getByRole('checkbox').all()) await box.check();
}

async function axe(page: Page) {
  const { violations } = await new AxeBuilder({ page }).analyze();
  return violations.filter((v) => v.impact === 'serious' || v.impact === 'critical').map((v) => v.id);
}

test.describe('Quest complete', () => {
  test('sealing the last ritual completes the quest; the eggs load only then', async ({ page }) => {
    const fetched: string[] = [];
    page.on('request', (r) => fetched.push(r.url()));
    await open(page, 'reduce');
    await page.getByRole('button', { name: copy.oracle.heed, exact: true }).click();
    const boxes = await page.getByRole('checkbox').all();
    for (const box of boxes.slice(0, 3)) await box.check();
    expect(fetched.filter((u) => EGG_CHUNK.test(u))).toEqual([]);

    await boxes[3]!.check();
    await expect(page.locator('.quest')).toBeVisible();
    await expect(announced(page)).toHaveText(`Quest complete! ${quest.xp}, ${quest.reward.retrograde}.`);
    await expect(boxes[3]!).toBeFocused(); // the banner never steals focus
    await expect(page.locator('.quest-badge')).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(page.locator('.quest')).toHaveCount(0);
    await expect(page.locator('#checklist-heading')).toBeVisible(); // Esc closed the banner, not the checklist

    await boxes[0]!.uncheck();
    await expect(page.locator('.quest-badge')).toBeHidden();
  });

  test('with motion on it animates, then clears itself', async ({ page }) => {
    await open(page, 'no-preference');
    await sealAll(page);
    await expect(page.locator('.quest')).toBeVisible();
    await page.clock.runFor(1500);
    await expect(page.locator('.quest-title div, .quest-title span').first()).toBeAttached(); // SplitText chars
    await page.clock.runFor(4000);
    await expect(page.locator('.quest')).toHaveCount(0);
  });

  for (const theme of ['default', 'hc'] as const) {
    test(`${theme} theme: the banner has no serious a11y issues`, async ({ page }, testInfo) => {
      await open(page, 'reduce');
      if (theme === 'hc') await page.getByRole('button', { name: copy.toggles.contrast }).click();
      await sealAll(page);
      await expect(page.locator('.quest')).toBeVisible();
      expect(await axe(page)).toEqual([]);
      await testInfo.attach(`quest-${theme}.png`, { body: await page.locator('#oracle').screenshot(), contentType: 'image/png' });
    });
  }
});

test.describe('Konami code', () => {
  test('summons the oracle and The Magician; Esc sends them away and returns focus', async ({ page }) => {
    await open(page, 'reduce');
    const toggle = page.getByRole('button', { name: copy.toggles.contrast });
    await toggle.focus();
    for (const key of CODE) await page.keyboard.press(key);

    await expect(magician(page)).toBeVisible();
    await expect(magician(page)).toBeFocused();
    await expect(magician(page)).toContainText(konami.text);
    await expect(page.locator('.toast')).toHaveText(konami.toast);
    await expect(announced(page)).toHaveText(konami.toast);

    await page.keyboard.press('Escape');
    await expect(magician(page)).toHaveCount(0);
    await expect(toggle).toBeFocused();
  });

  test('the Dismiss button works too', async ({ page }) => {
    await open(page, 'reduce');
    for (const key of CODE) await page.keyboard.press(key);
    await page.getByRole('button', { name: konami.dismiss }).click();
    await expect(magician(page)).toHaveCount(0);
  });

  test('with motion on, the track marker slides back and returns', async ({ page }) => {
    await open(page, 'no-preference');
    const progress = () => page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--progress')));
    const start = await progress();
    for (const key of CODE) await page.keyboard.press(key);
    await expect(magician(page)).toBeVisible();
    await expect.poll(async () => (await page.clock.runFor(250), progress())).toBeLessThan(start / 2);
    await page.clock.runFor(6000);
    expect(await progress()).toBeCloseTo(start, 2);
  });

  test('phones: swipe the code on the orb, then tap twice', async ({ page, isMobile, browserName }) => {
    test.skip(!isMobile || browserName !== 'chromium', 'Synthetic touch events need Chromium');
    await open(page, 'reduce');
    await page.locator('.orb-svg').scrollIntoViewIfNeeded();
    await page.evaluate(() => {
      const orb = document.querySelector('.orb-svg')!;
      const r = orb.getBoundingClientRect();
      const [cx, cy] = [r.left + r.width / 2, r.top + r.height / 2];
      const touch = (x: number, y: number) => new Touch({ identifier: 1, target: orb, clientX: x, clientY: y });
      const swipe = (dx: number, dy: number) => {
        orb.dispatchEvent(new TouchEvent('touchstart', { changedTouches: [touch(cx, cy)], bubbles: true }));
        orb.dispatchEvent(new TouchEvent('touchend', { changedTouches: [touch(cx + dx, cy + dy)], bubbles: true }));
      };
      for (const [dx, dy] of [[0, -80], [0, -80], [0, 80], [0, 80], [-80, 0], [80, 0], [-80, 0], [80, 0], [0, 0], [0, 0]] as const) swipe(dx, dy);
    });
    await expect(magician(page)).toBeVisible();
  });

  for (const theme of ['default', 'hc'] as const) {
    test(`${theme} theme: The Magician has no serious a11y issues`, async ({ page }, testInfo) => {
      await open(page, 'reduce');
      if (theme === 'hc') await page.getByRole('button', { name: copy.toggles.contrast }).click();
      for (const key of CODE) await page.keyboard.press(key);
      await expect(magician(page)).toBeVisible();
      expect(await axe(page)).toEqual([]);
      await testInfo.attach(`magician-${theme}.png`, { body: await page.screenshot(), contentType: 'image/png' });
    });
  }
});
