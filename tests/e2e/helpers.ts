// Shared set-up for the e2e specs.
import { expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import copy from '../../src/content/copy.json' with { type: 'json' };

export { copy };
export const RETROGRADE = '2026-11-01T12:00:00Z';
export const CODE = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];

export interface Open {
  /** Page date (UTC ISO). */
  at?: string;
  motion?: 'reduce' | 'no-preference';
  /** Skip the veil, as a returning visitor would. Default true; veil tests pass false. */
  peered?: boolean;
  /** 'fixed' freezes Date (steady screenshots); 'install' fakes every timer so tests step time themselves. */
  clock?: 'fixed' | 'install';
}

export async function open(page: Page, { at = RETROGRADE, motion = 'reduce', peered = true, clock = 'fixed' }: Open = {}) {
  await page.emulateMedia({ reducedMotion: motion });
  if (peered) await page.addInitScript(() => localStorage.setItem('mrx:peered', 'true'));
  if (clock === 'install') await page.clock.install({ time: new Date(at) });
  else await page.clock.setFixedTime(new Date(at));
  await page.goto('/');
}

export const button = (page: Page, name: string) => page.getByRole('button', { name, exact: true });

/** Opens Heed the stars (waits out the view transition). */
export async function heed(page: Page) {
  await button(page, copy.oracle.heed).click();
  await expect(page.locator('#checklist-heading')).toBeFocused();
}

export async function konami(page: Page) {
  for (const key of CODE) await page.keyboard.press(key);
  await expect(page.getByRole('dialog', { name: copy.eggs.konami.name })).toBeVisible();
}

export async function seriousViolations(page: Page, disableRules: string[] = []) {
  const { violations } = await new AxeBuilder({ page }).disableRules(disableRules).analyze();
  return violations.filter((v) => v.impact === 'serious' || v.impact === 'critical').map((v) => `${v.id}: ${v.help}`);
}

/** Steps a fake clock until `read` changes. */
export const changes = (page: Page, read: () => Promise<unknown>, before: unknown) =>
  expect
    .poll(async () => {
      await page.clock.runFor(500);
      return read();
    }, { timeout: 10_000 })
    .not.toEqual(before);
